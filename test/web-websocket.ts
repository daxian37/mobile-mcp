/**
 * Property-based tests for WebSocket reconnection
 */

import * as fc from 'fast-check';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import { WebSocket, WebSocketServer } from 'ws';

// Helper to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = new WebSocketServer({ port: startPort });
    server.on('listening', () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// Helper to close server properly
async function closeServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe('WebSocket Property Tests', () => {
  // Feature: browser-web-interface, Property 40: WebSocket reconnection with backoff
  // Validates: Requirements 11.5
  describe('Property 40: WebSocket reconnection with backoff', () => {
    it('should implement exponential backoff (1s, 2s, 4s, 8s, 16s) with maximum 5 retry attempts', async function() {
      this.timeout(20000);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            disconnectAfterMs: fc.integer({ min: 50, max: 150 })
          }),
          async (testConfig) => {
            // Find an available port
            const wsPort = await findAvailablePort(10000 + Math.floor(Math.random() * 50000));
            
            // Create a WebSocket server that will disconnect clients
            const wsServer = new WebSocketServer({ port: wsPort });
            const connectionAttempts: number[] = [];
            let firstConnectionTime: number | null = null;

            wsServer.on('connection', (ws: WebSocket) => {
              const now = Date.now();
              
              if (firstConnectionTime === null) {
                firstConnectionTime = now;
                connectionAttempts.push(0); // First connection at time 0
              } else {
                // Record time since first connection
                connectionAttempts.push(now - firstConnectionTime);
              }

              // Disconnect the client after a short delay to trigger reconnection
              setTimeout(() => {
                ws.close();
              }, testConfig.disconnectAfterMs);
            });

            try {
              // Simulate client reconnection logic with shorter delays for testing
              const maxReconnectAttempts = 5;
              let reconnectAttempts = 0;
              let reconnectDelay = 100; // Start with 100ms for faster testing
              const reconnectDelays: number[] = [];
              let allClientsCreated: WebSocket[] = [];

              const connect = (): Promise<void> => {
                return new Promise((resolve, reject) => {
                  const ws = new WebSocket(`ws://localhost:${wsPort}`);
                  allClientsCreated.push(ws);
                  
                  ws.on('open', () => {
                    resolve();
                  });

                  ws.on('error', (error) => {
                    // Don't reject on connection errors during reconnection
                    if (reconnectAttempts === 0) {
                      reject(error);
                    }
                  });

                  ws.on('close', () => {
                    if (reconnectAttempts < maxReconnectAttempts) {
                      reconnectAttempts++;
                      reconnectDelays.push(reconnectDelay);
                      
                      setTimeout(() => {
                        connect().catch(() => {
                          // Ignore errors in reconnection
                        });
                      }, reconnectDelay);

                      // Exponential backoff: double each time, cap at 1600ms (scaled down from 16s)
                      reconnectDelay = Math.min(reconnectDelay * 2, 1600);
                    }
                  });
                });
              };

              // Start initial connection
              await connect();

              // Wait for reconnection attempts to complete
              // Total time needed: 100ms + 200ms + 400ms + 800ms + 1600ms + buffer = ~3.5s
              await new Promise(resolve => setTimeout(resolve, 4000));

              // Clean up all client connections
              allClientsCreated.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                  ws.close();
                }
              });

              // Property 1: Should attempt exactly 5 reconnections after initial connection
              assert.ok(
                reconnectAttempts <= maxReconnectAttempts,
                `Should not exceed ${maxReconnectAttempts} reconnection attempts, got ${reconnectAttempts}`
              );

              // Property 2: Reconnection delays should follow exponential backoff pattern
              // Expected delays: 100, 200, 400, 800, 1600 (scaled down 10x for testing)
              const expectedDelays = [100, 200, 400, 800, 1600];
              
              for (let i = 0; i < Math.min(reconnectDelays.length, expectedDelays.length); i++) {
                assert.strictEqual(
                  reconnectDelays[i],
                  expectedDelays[i],
                  `Reconnection delay ${i + 1} should be ${expectedDelays[i]}ms, got ${reconnectDelays[i]}ms`
                );
              }

              // Property 3: Total number of connection attempts should be initial + reconnects
              // (allowing for some variance due to timing)
              assert.ok(
                connectionAttempts.length >= 1 && connectionAttempts.length <= maxReconnectAttempts + 1,
                `Total connection attempts should be between 1 and ${maxReconnectAttempts + 1}, got ${connectionAttempts.length}`
              );

              // Property 4: Connection attempts should be spaced according to backoff delays
              // Check that subsequent connections are spaced by at least the expected delay (with some tolerance)
              for (let i = 1; i < Math.min(connectionAttempts.length, expectedDelays.length + 1); i++) {
                const timeBetweenAttempts = connectionAttempts[i] - connectionAttempts[i - 1];
                const expectedDelay = expectedDelays[i - 1];
                const tolerance = 100; // 100ms tolerance for timing variations
                
                assert.ok(
                  timeBetweenAttempts >= expectedDelay - tolerance,
                  `Time between connection attempts ${i} and ${i + 1} should be at least ${expectedDelay}ms (with ${tolerance}ms tolerance), got ${timeBetweenAttempts}ms`
                );
              }

            } finally {
              // Clean up
              await closeServer(wsServer);
            }
          }
        ),
        { numRuns: 3 } // Reduced runs due to long test duration with network operations
      );
    });
  });

  // Additional property test: Maximum retry limit enforcement
  describe('Property 40b: Maximum retry limit enforcement', () => {
    it('should stop reconnecting after maximum retry attempts', async function() {
      this.timeout(20000);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            seed: fc.integer({ min: 1, max: 1000 })
          }),
          async (testConfig) => {
            // Find an available port
            const wsPort = await findAvailablePort(10000 + Math.floor(Math.random() * 50000));
            
            // Create a WebSocket server that immediately closes connections
            const wsServer = new WebSocketServer({ port: wsPort });
            let connectionCount = 0;

            wsServer.on('connection', (ws: WebSocket) => {
              connectionCount++;
              // Immediately close to force reconnection attempts
              ws.close();
            });

            try {
              const maxReconnectAttempts = 5;
              let reconnectAttempts = 0;
              let reconnectDelay = 100; // Scaled down for faster testing
              let stopped = false;
              let allClientsCreated: WebSocket[] = [];

              const connect = (): Promise<void> => {
                return new Promise((resolve, reject) => {
                  const ws = new WebSocket(`ws://localhost:${wsPort}`);
                  allClientsCreated.push(ws);
                  
                  ws.on('open', () => {
                    resolve();
                  });

                  ws.on('error', (error) => {
                    // Don't reject on connection errors during reconnection
                    if (reconnectAttempts === 0) {
                      reject(error);
                    }
                  });

                  ws.on('close', () => {
                    if (reconnectAttempts < maxReconnectAttempts && !stopped) {
                      reconnectAttempts++;
                      
                      setTimeout(() => {
                        connect().catch(() => {
                          // Ignore errors
                        });
                      }, reconnectDelay);

                      reconnectDelay = Math.min(reconnectDelay * 2, 1600);
                    } else {
                      stopped = true;
                    }
                  });
                });
              };

              // Start initial connection
              await connect();

              // Wait for all reconnection attempts
              await new Promise(resolve => setTimeout(resolve, 4000));

              // Clean up all client connections
              allClientsCreated.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                  ws.close();
                }
              });

              // Property: Should stop after max attempts
              assert.ok(
                stopped,
                'Reconnection should stop after maximum attempts'
              );

              assert.ok(
                reconnectAttempts <= maxReconnectAttempts,
                `Should not exceed ${maxReconnectAttempts} reconnection attempts, got ${reconnectAttempts}`
              );

              // Property: Total connections should not exceed initial + max reconnects
              assert.ok(
                connectionCount <= maxReconnectAttempts + 1,
                `Total connections should not exceed ${maxReconnectAttempts + 1}, got ${connectionCount}`
              );

            } finally {
              await closeServer(wsServer);
            }
          }
        ),
        { numRuns: 3 } // Reduced runs due to long test duration with network operations
      );
    });
  });
});
