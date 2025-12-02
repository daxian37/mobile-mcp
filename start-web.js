const { WebServer } = require('./lib/web-server.js');

const config = {
  httpPort: 3000,
  wsPort: 3001,
  enableAuth: false,
  enableCors: true,
  corsOrigins: ['*'],
  enableHttps: false,
};

const server = new WebServer(config);

server.start().then(() => {
  console.log('Web server started successfully!');
  console.log(`HTTP server: http://localhost:${config.httpPort}`);
  console.log(`WebSocket server: ws://localhost:${config.wsPort}`);
}).catch((error) => {
  console.error('Failed to start web server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
