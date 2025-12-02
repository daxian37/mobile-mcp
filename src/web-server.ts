/**
 * Web Server for Mobile MCP Browser Interface
 * Provides HTTP and WebSocket servers for browser-based device control
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as WebSocketServer } from 'ws';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as logger from './logger.js';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { createApiRouter } from './web-api.js';
import { WebSocketHandler } from './web-websocket.js';
import { DeviceService } from './web-device-service.js';
import { IncomingMessage } from 'http';

export interface WebServerConfig {
  httpPort: number;
  wsPort: number;
  enableAuth: boolean;
  authToken?: string;
  enableCors: boolean;
  corsOrigins?: string[];
  enableHttps: boolean;
  sslCert?: string;
  sslKey?: string;
}

/**
 * Load configuration from environment variables and config file
 * Priority: environment variables > config file > defaults
 */
export function loadConfig(configPath?: string): WebServerConfig {
  // Load environment variables
  dotenv.config();

  // Load config file if provided
  let fileConfig: Partial<WebServerConfig> = {};
  if (configPath && fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(fileContent);
      logger.trace(`Loaded configuration from ${configPath}`);
    } catch (error) {
      logger.error(`Failed to load config file ${configPath}: ${error}`);
    }
  }

  // Build configuration with priority: env > file > defaults
  const config: WebServerConfig = {
    httpPort: parseInt(process.env.WEB_HTTP_PORT || '') || fileConfig.httpPort || 3000,
    wsPort: parseInt(process.env.WEB_WS_PORT || '') || fileConfig.wsPort || 3001,
    enableAuth: process.env.WEB_ENABLE_AUTH === 'true' || fileConfig.enableAuth || false,
    authToken: process.env.WEB_AUTH_TOKEN || fileConfig.authToken,
    enableCors: process.env.WEB_ENABLE_CORS === 'true' || fileConfig.enableCors !== false,
    corsOrigins: process.env.WEB_CORS_ORIGINS?.split(',') || fileConfig.corsOrigins || ['*'],
    enableHttps: process.env.WEB_ENABLE_HTTPS === 'true' || fileConfig.enableHttps || false,
    sslCert: process.env.WEB_SSL_CERT || fileConfig.sslCert,
    sslKey: process.env.WEB_SSL_KEY || fileConfig.sslKey,
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validate configuration fields
 */
function validateConfig(config: WebServerConfig): void {
  // Validate ports
  if (config.httpPort < 1 || config.httpPort > 65535) {
    throw new Error(`Invalid HTTP port: ${config.httpPort}. Must be between 1 and 65535.`);
  }
  if (config.wsPort < 1 || config.wsPort > 65535) {
    throw new Error(`Invalid WebSocket port: ${config.wsPort}. Must be between 1 and 65535.`);
  }
  if (config.httpPort === config.wsPort) {
    throw new Error(`HTTP and WebSocket ports must be different. Both are set to ${config.httpPort}.`);
  }

  // Validate authentication
  if (config.enableAuth) {
    if (!config.authToken || config.authToken.trim().length === 0) {
      throw new Error('Authentication is enabled but no valid auth token is provided. Set WEB_AUTH_TOKEN environment variable or authToken in config file.');
    }
  }

  // Validate HTTPS
  if (config.enableHttps) {
    if (!config.sslCert || !config.sslKey) {
      throw new Error('HTTPS is enabled but SSL certificate or key is missing. Set WEB_SSL_CERT and WEB_SSL_KEY environment variables or sslCert/sslKey in config file.');
    }
    if (!fs.existsSync(config.sslCert)) {
      throw new Error(`SSL certificate file not found: ${config.sslCert}`);
    }
    if (!fs.existsSync(config.sslKey)) {
      throw new Error(`SSL key file not found: ${config.sslKey}`);
    }
  }

  // Validate CORS origins
  if (config.enableCors && (!config.corsOrigins || config.corsOrigins.length === 0)) {
    throw new Error('CORS is enabled but no origins are specified.');
  }
}

export class WebServer {
  private config: WebServerConfig;
  private app: Express;
  private httpServer: http.Server | https.Server | null = null;
  private wsServer: WebSocketServer | null = null;
  private wsHandler: WebSocketHandler | null = null;
  private deviceService: DeviceService | null = null;

  constructor(config: WebServerConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS middleware
    if (this.config.enableCors) {
      const corsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) {
            return callback(null, true);
          }
          
          // Check if origin is in allowed list
          if (this.config.corsOrigins?.includes('*') || this.config.corsOrigins?.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      };
      this.app.use(cors(corsOptions));
      logger.trace(`CORS enabled with origins: ${this.config.corsOrigins?.join(', ')}`);
    }

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Authentication middleware
    if (this.config.enableAuth) {
      this.app.use(this.authMiddleware.bind(this));
      logger.trace('Authentication middleware enabled');
    }

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.trace(`${req.method} ${req.path}`);
      next();
    });
  }

  private authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip auth for health check
    if (req.path === '/api/health') {
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const expectedToken = this.config.authToken?.trim();

    if (!token || token.length === 0 || !expectedToken || token !== expectedToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing authentication token' });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    // Create device service (will be shared with WebSocket handler)
    this.deviceService = new DeviceService();
    
    // Mount API router with device service
    // Note: WebSocket handler will be passed later via updateApiRouter()
    const apiRouter = createApiRouter(this.deviceService);
    this.app.use('/api', apiRouter);

    // Serve static files from frontend/dist in production
    const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist');
    if (fs.existsSync(frontendDistPath)) {
      logger.trace(`Serving static files from ${frontendDistPath}`);
      this.app.use(express.static(frontendDistPath));
      
      // SPA fallback - serve index.html for all non-API routes
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          return next();
        }
        
        const indexPath = path.join(frontendDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).json({ 
            error: 'Not Found', 
            message: 'Frontend not built. Run "npm run build:web" first.' 
          });
        }
      });
    } else {
      logger.trace('Frontend dist directory not found, static file serving disabled');
    }

    // Error handling middleware (must be last)
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error(`Error handling request ${req.method} ${req.path}: ${err.message}`);
      
      // CORS errors
      if (err.message === 'Not allowed by CORS') {
        res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Origin not allowed by CORS policy' 
        });
        return;
      }

      // Generic error response
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message 
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Create HTTP/HTTPS server
      if (this.config.enableHttps && this.config.sslCert && this.config.sslKey) {
        const httpsOptions = {
          cert: fs.readFileSync(this.config.sslCert),
          key: fs.readFileSync(this.config.sslKey)
        };
        this.httpServer = https.createServer(httpsOptions, this.app);
        logger.trace(`HTTPS server enabled`);
      } else {
        this.httpServer = http.createServer(this.app);
        logger.trace(`HTTP server enabled`);
      }

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.config.httpPort, () => {
          logger.trace(`Web server listening on port ${this.config.httpPort}`);
          resolve();
        });
        this.httpServer!.on('error', reject);
      });

      // Start WebSocket server with authentication
      await new Promise<void>((resolve, reject) => {
        this.wsServer = new WebSocketServer({ 
          port: this.config.wsPort,
          verifyClient: this.config.enableAuth ? this.verifyWebSocketClient.bind(this) : undefined
        });
        
        this.wsServer.on('error', (error: any) => {
          reject(error);
        });
        
        this.wsServer.on('listening', () => {
          resolve();
        });
      });
      
      // Initialize WebSocket handler
      if (!this.wsServer) {
        throw new Error('WebSocket server failed to initialize');
      }
      const wsServer = this.wsServer; // TypeScript narrowing
      this.wsHandler = new WebSocketHandler(wsServer);
      
      // Update device service with WebSocket handler for event broadcasting
      if (this.deviceService) {
        this.deviceService = new DeviceService(this.wsHandler);
        // Set device service on WebSocket handler for screenshot streaming
        this.wsHandler.setDeviceService(this.deviceService);
        
        // Recreate API router with WebSocket handler for command result broadcasting
        createApiRouter(this.deviceService, this.wsHandler);
      }
      
      logger.trace(`WebSocket server listening on port ${this.config.wsPort}`);
      logger.trace('Mobile MCP Web Interface started successfully');
    } catch (error) {
      logger.error(`Failed to start web server: ${error}`);
      throw error;
    }
  }

  private verifyWebSocketClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    // Extract token from query string or headers
    const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token') || info.req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== this.config.authToken) {
      logger.trace(`WebSocket connection rejected: invalid token`);
      return false;
    }

    return true;
  }

  async stop(): Promise<void> {
    try {
      if (this.wsServer) {
        await new Promise<void>((resolve) => {
          this.wsServer!.close(() => {
            resolve();
          });
        });
        this.wsServer = null;
        logger.trace('WebSocket server stopped');
      }

      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((err) => {
            if (err) {
              // If server is not running, that's okay - just resolve
              if ((err as any).code === 'ERR_SERVER_NOT_RUNNING') {
                resolve();
              } else {
                reject(err);
              }
            } else {
              resolve();
            }
          });
        });
        this.httpServer = null;
        logger.trace('HTTP server stopped');
      }
    } catch (error) {
      logger.error(`Error stopping web server: ${error}`);
      throw error;
    }
  }

  getApp(): Express {
    return this.app;
  }

  getWsServer(): WebSocketServer | null {
    return this.wsServer;
  }

  getWsHandler(): WebSocketHandler | null {
    return this.wsHandler;
  }

  getConfig(): WebServerConfig {
    return this.config;
  }
}
