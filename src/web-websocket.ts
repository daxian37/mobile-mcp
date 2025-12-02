/**
 * WebSocket Server for Mobile MCP Web Interface
 * Handles real-time communication for screenshot streaming and events
 */

import { WebSocket, Server as WebSocketServer } from 'ws';
import * as logger from './logger.js';
import { getRobotForDevice } from './web-robot-factory.js';
import { DeviceInfo } from './web-device-service.js';
import sharp from 'sharp';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'command' | 'event';
  payload: any;
}

export interface WebSocketEvent {
  type: 'screenshot' | 'device_connected' | 'device_disconnected' | 'command_result' | 'connection_status';
  data: any;
}

interface ClientSubscription {
  deviceId?: string;
  interval?: number; // in milliseconds
  intervalHandle?: NodeJS.Timeout;
  subscriptions: Set<string>; // Set of subscription types: 'screenshot', 'device_events', 'command_results'
}

export class WebSocketHandler {
  private wsServer: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, ClientSubscription> = new Map();
  private deviceService?: any; // Will be set by WebServer

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
    this.setupWebSocketServer();
  }

  setDeviceService(deviceService: any): void {
    this.deviceService = deviceService;
  }

  private setupWebSocketServer(): void {
    this.wsServer.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      logger.trace(`WebSocket client connected: ${clientId}`);

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'connection_status',
        data: { clientId, status: 'connected', message: 'Connected to Mobile MCP Web Interface' }
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error(`Error parsing WebSocket message: ${error}`);
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}: ${error}`);
      });
    });
  }

  private handleClientDisconnect(clientId: string): void {
    // Stop any active screenshot streaming
    this.stopScreenshotStreaming(clientId);
    
    // Remove client
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
    
    logger.trace(`WebSocket client disconnected: ${clientId}`);
  }

  private async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    logger.trace(`Received message from ${clientId}: ${message.type}`);
    
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(clientId, message.payload);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.payload);
        break;
      case 'command':
        await this.handleCommand(clientId, message.payload);
        break;
      default:
        logger.error(`Unknown message type: ${message.type}`);
    }
  }

  private async handleSubscribe(clientId: string, payload: any): Promise<void> {
    const { type, deviceId, interval } = payload;
    
    // Get or create subscription for this client
    let subscription = this.subscriptions.get(clientId);
    if (!subscription) {
      subscription = {
        subscriptions: new Set()
      };
      this.subscriptions.set(clientId, subscription);
    }
    
    if (type === 'screenshot') {
      // Start screenshot streaming for this client
      const streamInterval = interval || 1000; // Default 1 second
      await this.startScreenshotStreaming(clientId, deviceId, streamInterval);
      subscription.subscriptions.add('screenshot');
    } else if (type === 'device_events') {
      // Subscribe to device connect/disconnect events
      subscription.subscriptions.add('device_events');
      logger.trace(`Client ${clientId} subscribed to device events`);
    } else if (type === 'command_results') {
      // Subscribe to command execution results
      subscription.subscriptions.add('command_results');
      logger.trace(`Client ${clientId} subscribed to command results`);
    }
  }

  private handleUnsubscribe(clientId: string, payload: any): void {
    const { type } = payload;
    
    const subscription = this.subscriptions.get(clientId);
    if (!subscription) {
      return;
    }
    
    if (type === 'screenshot') {
      // Stop screenshot streaming for this client
      this.stopScreenshotStreaming(clientId);
      subscription.subscriptions.delete('screenshot');
    } else if (type === 'device_events') {
      subscription.subscriptions.delete('device_events');
      logger.trace(`Client ${clientId} unsubscribed from device events`);
    } else if (type === 'command_results') {
      subscription.subscriptions.delete('command_results');
      logger.trace(`Client ${clientId} unsubscribed from command results`);
    }
  }

  private async handleCommand(clientId: string, payload: any): Promise<void> {
    // Command handling can be implemented here if needed
    // For now, commands are handled via REST API
    logger.trace(`Command received from ${clientId}: ${JSON.stringify(payload)}`);
  }

  /**
   * Start streaming screenshots for a device to a specific client
   */
  private async startScreenshotStreaming(
    clientId: string,
    deviceId: string,
    interval: number
  ): Promise<void> {
    try {
      // Stop any existing streaming for this client
      this.stopScreenshotStreaming(clientId);

      // Get device info
      if (!this.deviceService) {
        throw new Error('Device service not initialized');
      }

      const device: DeviceInfo = await this.deviceService.getDevice(deviceId);
      if (!device) {
        this.sendToClient(clientId, {
          type: 'screenshot',
          data: { error: `Device not found: ${deviceId}` }
        });
        return;
      }

      // Update subscription
      let subscription = this.subscriptions.get(clientId);
      if (!subscription) {
        subscription = {
          subscriptions: new Set(['screenshot'])
        };
        this.subscriptions.set(clientId, subscription);
      }
      
      subscription.deviceId = deviceId;
      subscription.interval = interval;

      // Start periodic screenshot capture
      const captureAndSend = async () => {
        try {
          await this.captureAndSendScreenshot(clientId, device);
        } catch (error) {
          logger.error(`Error capturing screenshot for ${deviceId}: ${error}`);
          
          // Send error to client
          this.sendToClient(clientId, {
            type: 'screenshot',
            data: { 
              deviceId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            }
          });
        }
      };

      // Capture immediately
      await captureAndSend();

      // Then set up interval
      subscription.intervalHandle = setInterval(captureAndSend, interval);

      logger.trace(`Started screenshot streaming for client ${clientId}, device ${deviceId}, interval ${interval}ms`);
    } catch (error) {
      logger.error(`Error starting screenshot streaming: ${error}`);
      this.sendToClient(clientId, {
        type: 'screenshot',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Stop screenshot streaming for a client
   */
  private stopScreenshotStreaming(clientId: string): void {
    const subscription = this.subscriptions.get(clientId);
    if (subscription?.intervalHandle) {
      clearInterval(subscription.intervalHandle);
      logger.trace(`Stopped screenshot streaming for client ${clientId}`);
    }
    this.subscriptions.delete(clientId);
  }

  /**
   * Capture a screenshot and send it to the client with compression
   */
  private async captureAndSendScreenshot(clientId: string, device: DeviceInfo): Promise<void> {
    try {
      // Get robot for device
      const robot = await getRobotForDevice(device);
      
      // Capture screenshot (returns PNG buffer)
      const screenshotBuffer = await robot.getScreenshot();
      
      // Compress screenshot to JPEG with quality 75
      const compressedBuffer = await sharp(screenshotBuffer)
        .jpeg({ quality: 75 })
        .toBuffer();
      
      // Convert to base64 for transmission
      const base64Image = compressedBuffer.toString('base64');
      
      // Get screen size
      const screenSize = await robot.getScreenSize();
      
      // Send to client
      this.sendToClient(clientId, {
        type: 'screenshot',
        data: {
          deviceId: device.id,
          image: base64Image,
          format: 'jpeg',
          width: screenSize.width,
          height: screenSize.height,
          scale: screenSize.scale,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  broadcast(event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this event type
        const subscription = this.subscriptions.get(clientId);
        
        // Always send connection_status events
        if (event.type === 'connection_status') {
          ws.send(message);
          return;
        }
        
        // Check subscription for other event types
        if (subscription) {
          if (event.type === 'device_connected' || event.type === 'device_disconnected') {
            if (subscription.subscriptions.has('device_events')) {
              ws.send(message);
            }
          } else if (event.type === 'command_result') {
            if (subscription.subscriptions.has('command_results')) {
              ws.send(message);
            }
          } else {
            // For other events, send to all clients
            ws.send(message);
          }
        }
      }
    });
  }

  sendToClient(clientId: string, event: WebSocketEvent): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}
