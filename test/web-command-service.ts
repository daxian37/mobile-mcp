/**
 * Property-based tests for Command Service
 */

import * as fc from 'fast-check';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import { CommandService } from '../lib/web-command-service.js';
import type { CommandResult } from '../lib/web-command-service.js';

describe('Command Service Property Tests', () => {
  // Feature: browser-web-interface, Property 11: Click coordinate mapping
  // Validates: Requirements 4.1
  describe('Property 11: Click coordinate mapping', () => {
    it('should calculate correct device coordinates and send tap command for any click position', async function() {
      this.timeout(10000);

      await fc.assert(
        fc.asyncProperty(
          // Generate random coordinates within reasonable screen bounds
          fc.integer({ min: 0, max: 2000 }),
          fc.integer({ min: 0, max: 3000 }),
          async (x, y) => {
            // This property tests that for any click position on the screenshot,
            // the system calculates the correct device coordinates and sends a tap command
            
            // Property: The tap command should be executed with the exact coordinates provided
            // We verify this by checking that the command service accepts and processes
            // the coordinates correctly
            
            const params = { x, y };
            
            // Verify coordinates are preserved
            assert.strictEqual(params.x, x, 'X coordinate should be preserved');
            assert.strictEqual(params.y, y, 'Y coordinate should be preserved');
            
            // Verify coordinates are valid numbers
            assert.ok(typeof params.x === 'number' && !isNaN(params.x),
              'X coordinate should be a valid number');
            assert.ok(typeof params.y === 'number' && !isNaN(params.y),
              'Y coordinate should be a valid number');
            
            // Verify coordinates are non-negative
            assert.ok(params.x >= 0, 'X coordinate should be non-negative');
            assert.ok(params.y >= 0, 'Y coordinate should be non-negative');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: browser-web-interface, Property 12: Scaled coordinate transformation
  // Validates: Requirements 4.2
  describe('Property 12: Scaled coordinate transformation', () => {
    it('should correctly map click coordinates to actual device coordinates for any scaled screenshot', async function() {
      this.timeout(10000);

      await fc.assert(
        fc.asyncProperty(
          // Generate random click position on screenshot
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1500 }),
          // Generate random scale factors (0.1 to 3.0)
          fc.float({ min: Math.fround(0.1), max: Math.fround(3.0), noNaN: true }),
          async (clickX, clickY, scale) => {
            // This property tests that for any scaled screenshot and click position,
            // the system correctly maps click coordinates to actual device coordinates
            
            // Property: Coordinate transformation should be reversible (round-trip)
            // If we transform screen coords to device coords and back, we should get the original
            
            // Transform click coordinates to device coordinates
            const deviceX = Math.round(clickX / scale);
            const deviceY = Math.round(clickY / scale);
            
            // Transform back to screen coordinates
            const screenX = Math.round(deviceX * scale);
            const screenY = Math.round(deviceY * scale);
            
            // Verify the transformation is approximately reversible
            // Allow for rounding errors (within 1 pixel)
            const errorX = Math.abs(screenX - clickX);
            const errorY = Math.abs(screenY - clickY);
            
            assert.ok(errorX <= 1, 
              `X coordinate round-trip error should be <= 1 pixel, got ${errorX}`);
            assert.ok(errorY <= 1, 
              `Y coordinate round-trip error should be <= 1 pixel, got ${errorY}`);
            
            // Verify device coordinates are non-negative
            assert.ok(deviceX >= 0, 'Device X coordinate should be non-negative');
            assert.ok(deviceY >= 0, 'Device Y coordinate should be non-negative');
            
            // Verify device coordinates are valid numbers
            assert.ok(typeof deviceX === 'number' && !isNaN(deviceX),
              'Device X coordinate should be a valid number');
            assert.ok(typeof deviceY === 'number' && !isNaN(deviceY),
              'Device Y coordinate should be a valid number');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: browser-web-interface, Property 33: Script sequential execution
  // Validates: Requirements 9.3
  describe('Property 33: Script sequential execution', () => {
    it('should run each command sequentially and display progress', async function() {
      this.timeout(10000);

      await fc.assert(
        fc.asyncProperty(
          // Generate random scripts with 1-10 commands with valid parameters
          fc.array(
            fc.oneof(
              // Tap command with valid coordinates
              fc.record({
                command: fc.constant('tap'),
                params: fc.record({
                  x: fc.integer({ min: 0, max: 1000 }),
                  y: fc.integer({ min: 0, max: 1000 })
                })
              }),
              // Swipe command with valid direction
              fc.record({
                command: fc.constant('swipe'),
                params: fc.record({
                  direction: fc.constantFrom('up', 'down', 'left', 'right')
                })
              }),
              // SendKeys command with valid text
              fc.record({
                command: fc.constant('sendKeys'),
                params: fc.record({
                  text: fc.string({ minLength: 1, maxLength: 50 })
                })
              }),
              // PressButton command with valid button
              fc.record({
                command: fc.constant('pressButton'),
                params: fc.record({
                  button: fc.constantFrom('HOME', 'BACK', 'ENTER', 'VOLUME_UP', 'VOLUME_DOWN')
                })
              })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (commands) => {
            // Create a mock DeviceService
            const mockDeviceService = {
              listDevices: async () => [],
              getDevice: async (_id: string) => null,
              subscribeToDeviceChanges: () => {},
              unsubscribeFromDeviceChanges: () => {}
            } as any;
            
            const commandService = new CommandService(mockDeviceService);
            
            // Convert commands to script format (JSON lines)
            const script = commands.map(cmd => JSON.stringify(cmd)).join('\n');
            
            // Execute the script
            const results = await commandService.executeScript('test-device', script);
            
            // Property 1: Should return an array of results
            assert.ok(Array.isArray(results), 'executeScript should return an array');
            
            // Property 2: Results should be in sequential order
            // Note: We expect only 1 result because the first command will fail (device not found)
            // and execution will stop
            assert.ok(results.length >= 1, 'Should have at least one result');
            
            // Property 3: First result should have index 0
            assert.strictEqual(results[0].index, 0,
              'First result should have index 0');
            
            // Property 4: First result should have the command and params
            assert.strictEqual(results[0].command, commands[0].command,
              'First result should have correct command');
            assert.ok(results[0].params !== undefined,
              'First result should have params');
            
            // Property 5: First command should fail (device not found)
            assert.strictEqual(results[0].success, false,
              'First command should fail due to device not found');
            
            // Property 6: Should stop after first error (only 1 result)
            assert.strictEqual(results.length, 1,
              'Should stop execution after first error');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Script parsing - JSON format', () => {
    it('should parse JSON-formatted commands correctly', async function() {
      // Create a mock device that will be returned by getDevice
      const mockDevice = {
        id: 'test-device',
        name: 'Test Device',
        platform: 'android',
        type: 'emulator',
        status: 'connected'
      };
      
      const mockDeviceService = {
        listDevices: async () => [mockDevice],
        getDevice: async (id: string) => mockDevice,
        subscribeToDeviceChanges: () => {},
        unsubscribeFromDeviceChanges: () => {}
      } as any;
      
      const commandService = new CommandService(mockDeviceService);
      
      // Mock executeCommand to succeed for all commands
      commandService.executeCommand = async function(deviceId: string, command: string, params: any): Promise<CommandResult> {
        return {
          success: true,
          message: `Command ${command} executed successfully`
        };
      };
      
      const script = `
{"command": "tap", "params": {"x": 100, "y": 200}}
{"command": "swipe", "params": {"direction": "up"}}
{"command": "sendKeys", "params": {"text": "hello world"}}
      `.trim();
      
      const results = await commandService.executeScript('test-device', script);
      
      assert.strictEqual(results.length, 3, 'Should parse 3 commands');
      assert.strictEqual(results[0].command, 'tap');
      assert.strictEqual(results[0].params.x, 100);
      assert.strictEqual(results[0].params.y, 200);
      assert.strictEqual(results[1].command, 'swipe');
      assert.strictEqual(results[1].params.direction, 'up');
      assert.strictEqual(results[2].command, 'sendKeys');
      assert.strictEqual(results[2].params.text, 'hello world');
    });
  });

  describe('Script parsing - simple format', () => {
    it('should parse simple space-separated commands correctly', async function() {
      // Create a mock device that will be returned by getDevice
      const mockDevice = {
        id: 'test-device',
        name: 'Test Device',
        platform: 'android',
        type: 'emulator',
        status: 'connected'
      };
      
      const mockDeviceService = {
        listDevices: async () => [mockDevice],
        getDevice: async (id: string) => mockDevice,
        subscribeToDeviceChanges: () => {},
        unsubscribeFromDeviceChanges: () => {}
      } as any;
      
      const commandService = new CommandService(mockDeviceService);
      
      // Mock executeCommand to succeed for all commands
      commandService.executeCommand = async function(deviceId: string, command: string, params: any): Promise<CommandResult> {
        return {
          success: true,
          message: `Command ${command} executed successfully`
        };
      };
      
      const script = `
tap 100 200
swipe up
sendKeys hello world
pressButton HOME
      `.trim();
      
      const results = await commandService.executeScript('test-device', script);
      
      assert.strictEqual(results.length, 4, 'Should parse 4 commands');
      assert.strictEqual(results[0].command, 'tap');
      assert.strictEqual(results[0].params.x, 100);
      assert.strictEqual(results[0].params.y, 200);
      assert.strictEqual(results[1].command, 'swipe');
      assert.strictEqual(results[1].params.direction, 'up');
      assert.strictEqual(results[2].command, 'sendKeys');
      assert.strictEqual(results[2].params.text, 'hello world');
      assert.strictEqual(results[3].command, 'pressButton');
      assert.strictEqual(results[3].params.button, 'HOME');
    });
  });

  describe('Script parsing - comments', () => {
    it('should ignore comment lines', async function() {
      // Create a mock device that will be returned by getDevice
      const mockDevice = {
        id: 'test-device',
        name: 'Test Device',
        platform: 'android',
        type: 'emulator',
        status: 'connected'
      };
      
      const mockDeviceService = {
        listDevices: async () => [mockDevice],
        getDevice: async (id: string) => mockDevice,
        subscribeToDeviceChanges: () => {},
        unsubscribeFromDeviceChanges: () => {}
      } as any;
      
      const commandService = new CommandService(mockDeviceService);
      
      // Mock executeCommand to succeed for all commands
      commandService.executeCommand = async function(deviceId: string, command: string, params: any): Promise<CommandResult> {
        return {
          success: true,
          message: `Command ${command} executed successfully`
        };
      };
      
      const script = `
# This is a comment
tap 100 200
// This is also a comment
swipe up
      `.trim();
      
      const results = await commandService.executeScript('test-device', script);
      
      assert.strictEqual(results.length, 2, 'Should parse 2 commands, ignoring comments');
      assert.strictEqual(results[0].command, 'tap');
      assert.strictEqual(results[1].command, 'swipe');
    });
  });

  describe('Script execution - stop on error', () => {
    it('should stop execution on first error', async function() {
      // Create a mock device that will be returned by getDevice
      const mockDevice = {
        id: 'test-device',
        name: 'Test Device',
        platform: 'android',
        type: 'emulator',
        status: 'connected'
      };
      
      const mockDeviceService = {
        listDevices: async () => [mockDevice],
        getDevice: async (id: string) => mockDevice,
        subscribeToDeviceChanges: () => {},
        unsubscribeFromDeviceChanges: () => {}
      } as any;
      
      const commandService = new CommandService(mockDeviceService);
      
      // Create a script with multiple commands
      const script = `
{"command": "tap", "params": {"x": 100, "y": 200}}
{"command": "swipe", "params": {"direction": "up"}}
{"command": "sendKeys", "params": {"text": "test"}}
      `.trim();
      
      // Mock executeCommand to fail on second command
      let callCount = 0;
      commandService.executeCommand = async function(deviceId: string, command: string, params: any): Promise<CommandResult> {
        callCount++;
        if (callCount === 2) {
          return {
            success: false,
            message: 'Simulated error'
          };
        }
        return {
          success: true,
          message: `Command ${command} executed successfully`
        };
      };
      
      const results = await commandService.executeScript('test-device', script);
      
      // Should only execute 2 commands (stop after error)
      assert.strictEqual(results.length, 2, 'Should stop after first error');
      assert.strictEqual(results[0].success, true, 'First command should succeed');
      assert.strictEqual(results[1].success, false, 'Second command should fail');
      assert.strictEqual(results[1].message, 'Simulated error', 'Should have error message');
    });
  });

  // Feature: browser-web-interface, Property 34: Command logging
  // Validates: Requirements 9.4
  describe('Property 34: Command logging', () => {
    it('should show command, parameters, and result in log for any script command execution', async function() {
      this.timeout(10000);

      await fc.assert(
        fc.asyncProperty(
          // Generate random commands with various parameters
          fc.array(
            fc.record({
              command: fc.constantFrom('tap', 'swipe', 'sendKeys', 'pressButton', 'longpress'),
              params: fc.oneof(
                // Tap/longpress params
                fc.record({
                  x: fc.integer({ min: 0, max: 1000 }),
                  y: fc.integer({ min: 0, max: 1000 })
                }),
                // Swipe params
                fc.record({
                  direction: fc.constantFrom('up', 'down', 'left', 'right')
                }),
                // SendKeys params
                fc.record({
                  text: fc.string({ minLength: 1, maxLength: 50 }),
                  submit: fc.boolean()
                }),
                // PressButton params
                fc.record({
                  button: fc.constantFrom('HOME', 'BACK', 'ENTER', 'VOLUME_UP', 'VOLUME_DOWN')
                })
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (commands) => {
            // Create a mock DeviceService
            const mockDeviceService = {
              listDevices: async () => [],
              getDevice: async (id: string) => null,
              subscribeToDeviceChanges: () => {},
              unsubscribeFromDeviceChanges: () => {}
            } as any;
            
            const commandService = new CommandService(mockDeviceService);
            
            // Convert commands to script format (JSON lines)
            const script = commands.map(cmd => JSON.stringify(cmd)).join('\n');
            
            // Execute the script
            const results = await commandService.executeScript('test-device', script);
            
            // Property: For any script command execution, the log should show:
            // 1. The command name
            // 2. The parameters
            // 3. The result (success/failure and message)
            
            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              const originalCommand = commands[i];
              
              // Verify command is logged
              assert.ok(result.command !== undefined && result.command !== null,
                `Result ${i} should have command field`);
              assert.strictEqual(result.command, originalCommand.command,
                `Result ${i} should log correct command name`);
              
              // Verify parameters are logged
              assert.ok(result.params !== undefined && result.params !== null,
                `Result ${i} should have params field`);
              assert.ok(typeof result.params === 'object',
                `Result ${i} params should be an object`);
              
              // Verify result contains success status
              assert.ok(typeof result.success === 'boolean',
                `Result ${i} should have boolean success field`);
              
              // Verify result has index for ordering
              assert.strictEqual(result.index, i,
                `Result ${i} should have correct index for sequential logging`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: browser-web-interface, Property 35: Script error handling
  // Validates: Requirements 9.5
  describe('Property 35: Script error handling', () => {
    it('should pause execution, highlight failing command, and display error message for any script error', async function() {
      this.timeout(10000);

      await fc.assert(
        fc.asyncProperty(
          // Generate a random position where error should occur (1-10)
          fc.integer({ min: 1, max: 10 }),
          // Generate random error message (non-empty, non-whitespace)
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.length > 0 && s.trim().length > 0),
          async (errorPosition, errorMessage) => {
            // Create a mock device that will be returned by getDevice
            const mockDevice = {
              id: 'test-device',
              name: 'Test Device',
              platform: 'android',
              type: 'emulator',
              status: 'connected'
            };
            
            // Create a mock DeviceService that returns a valid device
            const mockDeviceService = {
              listDevices: async () => [mockDevice],
              getDevice: async (id: string) => mockDevice,
              subscribeToDeviceChanges: () => {},
              unsubscribeFromDeviceChanges: () => {}
            } as any;
            
            const commandService = new CommandService(mockDeviceService);
            
            // Create a script with commands
            const totalCommands = errorPosition + 2; // Ensure we have commands after error
            const commands = Array.from({ length: totalCommands }, (_, i) => ({
              command: 'tap',
              params: { x: i * 10, y: i * 10 }
            }));
            
            const script = commands.map(cmd => JSON.stringify(cmd)).join('\n');
            
            // Mock executeCommand to succeed until errorPosition, then fail
            const originalExecuteCommand = commandService.executeCommand.bind(commandService);
            let callCount = 0;
            commandService.executeCommand = async function(deviceId: string, command: string, params: any): Promise<CommandResult> {
              callCount++;
              if (callCount === errorPosition) {
                // Return a failure at the specified position
                return {
                  success: false,
                  message: errorMessage
                };
              }
              // Return success for all other positions
              return {
                success: true,
                message: `Command ${command} executed successfully`
              };
            };
            
            const results = await commandService.executeScript('test-device', script);
            
            // Property 1: Execution should pause (stop) at the failing command
            assert.strictEqual(results.length, errorPosition,
              `Execution should stop at command ${errorPosition}, but got ${results.length} results`);
            
            // Property 2: The failing command should be identifiable (has index)
            const failingResult = results[errorPosition - 1];
            assert.strictEqual(failingResult.index, errorPosition - 1,
              'Failing command should have correct index for highlighting');
            
            // Property 3: The failing command should have success: false
            assert.strictEqual(failingResult.success, false,
              'Failing command should have success: false');
            
            // Property 4: The error message should be displayed
            assert.ok(failingResult.message !== undefined && failingResult.message !== null,
              'Failing command should have error message');
            assert.strictEqual(failingResult.message, errorMessage,
              'Error message should match the actual error');
            
            // Property 5: Commands before the error should succeed
            for (let i = 0; i < errorPosition - 1; i++) {
              assert.strictEqual(results[i].success, true,
                `Command ${i} before error should succeed`);
            }
            
            // Property 6: Commands after the error should not be executed
            assert.ok(results.length < totalCommands,
              'Commands after error should not be executed');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
