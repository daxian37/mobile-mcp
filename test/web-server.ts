/**
 * Property-based tests for Web Server
 */

import * as fc from 'fast-check';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import { WebServer } from '../lib/web-server.js';
import type { WebServerConfig } from '../lib/web-server.js';
import * as http from 'http';

describe('Web Server Property Tests', () => {
  // Feature: browser-web-interface, Property 41: Authentication enforcement
  // Validates: Requirements 12.3
  describe('Property 41: Authentication enforcement', () => {
    it('should enforce authentication when enabled for all requests except health check', async function() {
      this.timeout(20000);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            httpPort: fc.integer({ min: 10000, max: 60000 }),
            wsPort: fc.integer({ min: 10000, max: 60000 }),
            authToken: fc.string({ minLength: 10, maxLength: 50 }),
            path: fc.oneof(
              fc.constant('/api/devices'),
              fc.constant('/api/devices/test-device'),
              fc.constant('/api/devices/test-device/screenshot'),
              fc.constant('/api/devices/test-device/apps')
            )
          }).filter(config => config.httpPort !== config.wsPort && config.authToken.trim().length > 0),
          async (testConfig) => {
            const config: WebServerConfig = {
              httpPort: testConfig.httpPort,
              wsPort: testConfig.wsPort,
              enableAuth: true,
              authToken: testConfig.authToken,
              enableCors: false,
              enableHttps: false,
            };

            const server = new WebServer(config);
            let serverStarted = false;
            
            try {
              try {
                await server.start();
                serverStarted = true;
              } catch (startError: any) {
                // If port is in use, skip this test iteration (common during shrinking)
                if (startError.code === 'EADDRINUSE') {
                  return; // Skip this iteration
                }
                throw startError;
              }

              // Test 1: Request without token should be rejected (401)
              const noTokenResponse = await makeRequest(testConfig.httpPort, testConfig.path, null);
              assert.strictEqual(noTokenResponse.statusCode, 401, 
                `Request without token should return 401, got ${noTokenResponse.statusCode}`);

              // Test 2: Request with invalid token should be rejected (401)
              const invalidTokenResponse = await makeRequest(testConfig.httpPort, testConfig.path, 'invalid-token');
              assert.strictEqual(invalidTokenResponse.statusCode, 401,
                `Request with invalid token should return 401, got ${invalidTokenResponse.statusCode}`);

              // Test 3: Request with valid token should be accepted (not 401)
              const validTokenResponse = await makeRequest(testConfig.httpPort, testConfig.path, testConfig.authToken);
              assert.notStrictEqual(validTokenResponse.statusCode, 401,
                `Request with valid token should not return 401, got ${validTokenResponse.statusCode}`);

              // Test 4: Health check should always work without auth
              const healthResponse = await makeRequest(testConfig.httpPort, '/api/health', null);
              assert.strictEqual(healthResponse.statusCode, 200,
                `Health check should return 200 without auth, got ${healthResponse.statusCode}`);

            } finally {
              if (serverStarted) {
                await server.stop();
                // Add a delay to allow ports to be fully released
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        ),
        { numRuns: 10, timeout: 15000 }
      );
    });
  });

  // Feature: browser-web-interface, Property 42: CORS enforcement
  // Validates: Requirements 12.4
  describe('Property 42: CORS enforcement', () => {
    it('should enforce CORS configuration and allow requests with no origin', async function() {
      this.timeout(20000);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            httpPort: fc.integer({ min: 10000, max: 60000 }),
            wsPort: fc.integer({ min: 10000, max: 60000 }),
            corsOrigins: fc.oneof(
              fc.constant(['*'] as string[]),
              fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 })
            ),
          }).filter(config => config.httpPort !== config.wsPort),
          async (testConfig) => {
            const config: WebServerConfig = {
              httpPort: testConfig.httpPort,
              wsPort: testConfig.wsPort,
              enableAuth: false,
              enableCors: true,
              corsOrigins: testConfig.corsOrigins,
              enableHttps: false,
            };

            const server = new WebServer(config);
            let serverStarted = false;
            
            try {
              try {
                await server.start();
                serverStarted = true;
              } catch (startError: any) {
                // If port is in use, skip this test iteration (common during shrinking)
                if (startError.code === 'EADDRINUSE') {
                  return; // Skip this iteration
                }
                throw startError;
              }

              // Test: Request with no origin should always be allowed (like curl/mobile apps)
              // This is the key CORS property - requests without origin headers should work
              const noOriginResponse = await makeRequest(testConfig.httpPort, '/api/health', null);
              assert.strictEqual(noOriginResponse.statusCode, 200,
                `Request with no origin should return 200, got ${noOriginResponse.statusCode}`);

              // Test: When wildcard is configured, any origin should work
              if (testConfig.corsOrigins.includes('*')) {
                const anyOriginResponse = await makeRequestWithOrigin(
                  testConfig.httpPort,
                  '/api/health',
                  'http://example.com'
                );
                assert.strictEqual(anyOriginResponse.statusCode, 200,
                  `Request with wildcard CORS should return 200, got ${anyOriginResponse.statusCode}`);
              }

              // Test: When specific origins are configured, those origins should work
              if (!testConfig.corsOrigins.includes('*') && testConfig.corsOrigins.length > 0) {
                const allowedOriginResponse = await makeRequestWithOrigin(
                  testConfig.httpPort,
                  '/api/health',
                  testConfig.corsOrigins[0]
                );
                assert.strictEqual(allowedOriginResponse.statusCode, 200,
                  `Request from allowed origin should return 200, got ${allowedOriginResponse.statusCode}`);
              }

            } finally {
              if (serverStarted) {
                await server.stop();
                // Add a delay to allow ports to be fully released
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: browser-web-interface, Property 39: JSON response format
  // Validates: Requirements 11.3
  describe('Property 39: JSON response format', () => {
    it('should return valid JSON responses with appropriate HTTP status codes for all API endpoints', async function() {
      this.timeout(20000);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            httpPort: fc.integer({ min: 10000, max: 60000 }),
            wsPort: fc.integer({ min: 10000, max: 60000 }),
            endpoint: fc.oneof(
              fc.constant('/api/devices'),
              fc.constant('/api/health'),
              fc.constant('/api/devices/nonexistent-device'),
              fc.constant('/api/devices/nonexistent-device/screenshot'),
              fc.constant('/api/devices/nonexistent-device/apps')
            )
          }).filter(config => config.httpPort !== config.wsPort),
          async (testConfig) => {
            const config: WebServerConfig = {
              httpPort: testConfig.httpPort,
              wsPort: testConfig.wsPort,
              enableAuth: false,
              enableCors: false,
              enableHttps: false,
            };

            const server = new WebServer(config);
            let serverStarted = false;
            
            try {
              try {
                await server.start();
                serverStarted = true;
              } catch (startError: any) {
                // If port is in use, skip this test iteration (common during shrinking)
                if (startError.code === 'EADDRINUSE') {
                  return; // Skip this iteration
                }
                throw startError;
              }

              // Make request to the endpoint
              const response = await makeRequest(testConfig.httpPort, testConfig.endpoint, null);

              // Property 1: Response should have a valid HTTP status code
              assert.ok(
                response.statusCode >= 200 && response.statusCode < 600,
                `Response should have valid HTTP status code, got ${response.statusCode}`
              );

              // Property 2: Response body should be valid JSON
              let parsedBody: any;
              try {
                parsedBody = JSON.parse(response.body);
              } catch (error) {
                assert.fail(`Response body should be valid JSON, got: ${response.body}`);
              }

              // Property 3: Successful responses (2xx) should have expected structure
              if (response.statusCode >= 200 && response.statusCode < 300) {
                assert.ok(
                  typeof parsedBody === 'object' && parsedBody !== null,
                  'Successful response should be a JSON object'
                );
              }

              // Property 4: Error responses (4xx, 5xx) should have error field
              if (response.statusCode >= 400) {
                assert.ok(
                  parsedBody.error !== undefined,
                  `Error response should have 'error' field, got: ${JSON.stringify(parsedBody)}`
                );
                assert.strictEqual(
                  typeof parsedBody.error,
                  'string',
                  'Error field should be a string'
                );
              }

              // Property 5: 404 responses should include helpful information
              if (response.statusCode === 404) {
                assert.ok(
                  parsedBody.message !== undefined,
                  '404 response should have message field'
                );
              }

            } finally {
              if (serverStarted) {
                await server.stop();
                // Add a delay to allow ports to be fully released
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
        ),
        { numRuns: 10, timeout: 15000 }
      );
    });
  });
});

// Helper function to make HTTP requests
function makeRequest(port: number, path: string, token: string | null): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, body }));
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Helper function to make HTTP requests with Origin header
function makeRequestWithOrigin(port: number, path: string, origin: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: { 'Origin': origin }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, body }));
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}
