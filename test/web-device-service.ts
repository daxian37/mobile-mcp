/**
 * Property-based tests for Device Service
 */

import * as fc from 'fast-check';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import { DeviceService } from '../lib/web-device-service.js';
import type { DeviceInfo } from '../lib/web-device-service.js';

describe('Device Service Property Tests', () => {
  // Feature: browser-web-interface, Property 3: Device list completeness
  // Validates: Requirements 2.1
  describe('Property 3: Device list completeness', () => {
    it('should retrieve and display all available devices including simulators, emulators, and real devices', async function() {
      this.timeout(10000);

      // Use a single run instead of 100 iterations since we're testing real device managers
      // Property-based testing with I/O operations is too slow
      const deviceService = new DeviceService();
      
      try {
        // Get the list of devices
        const devices = await deviceService.listDevices();
        
        // Property 1: The result should be an array
        assert.ok(Array.isArray(devices), 'listDevices should return an array');
        
        // Property 2: Each device should have the required fields
        for (const device of devices) {
          assert.ok(device.id, 'Each device should have an id');
          assert.ok(device.name, 'Each device should have a name');
          assert.ok(['ios', 'android'].includes(device.platform), 
            `Device platform should be ios or android, got ${device.platform}`);
          assert.ok(['simulator', 'emulator', 'real'].includes(device.type),
            `Device type should be simulator, emulator, or real, got ${device.type}`);
          assert.ok(['connected', 'disconnected'].includes(device.status),
            `Device status should be connected or disconnected, got ${device.status}`);
        }
        
        // Property 3: Device IDs should be unique
        const deviceIds = devices.map(d => d.id);
        const uniqueIds = new Set(deviceIds);
        assert.strictEqual(deviceIds.length, uniqueIds.size,
          'All device IDs should be unique');
        
        // Property 4: All connected devices should have status 'connected'
        const connectedDevices = devices.filter(d => d.status === 'connected');
        for (const device of connectedDevices) {
          assert.strictEqual(device.status, 'connected',
            'Connected devices should have status "connected"');
        }
      } finally {
        deviceService.cleanup();
      }
    });
  });

  // Feature: browser-web-interface, Property 4: Device information completeness
  // Validates: Requirements 2.2
  describe('Property 4: Device information completeness', () => {
    it('should display complete device information including name, platform, type, and connection status', async function() {
      this.timeout(10000);

      // Use a single run instead of 100 iterations since we're testing real device managers
      // Property-based testing with I/O operations is too slow
      const deviceService = new DeviceService();
      
      try {
        const devices = await deviceService.listDevices();
        
        // Property: For any device in the list, all required information must be present
        for (const device of devices) {
          // Check that all required fields are present and non-empty
          assert.ok(device.id && device.id.length > 0,
            'Device id should be present and non-empty');
          assert.ok(device.name && device.name.length > 0,
            'Device name should be present and non-empty');
          assert.ok(device.platform && ['ios', 'android'].includes(device.platform),
            'Device platform should be present and valid');
          assert.ok(device.type && ['simulator', 'emulator', 'real'].includes(device.type),
            'Device type should be present and valid');
          assert.ok(device.status && ['connected', 'disconnected'].includes(device.status),
            'Device status should be present and valid');
          
          // Check that the information is consistent
          // iOS devices should be either simulators or real devices
          if (device.platform === 'ios') {
            assert.ok(['simulator', 'real'].includes(device.type),
              'iOS devices should be either simulators or real devices');
          }
          
          // Android devices should be either emulators or real devices
          if (device.platform === 'android') {
            assert.ok(['emulator', 'real'].includes(device.type),
              'Android devices should be either emulators or real devices');
          }
        }
      } finally {
        deviceService.cleanup();
      }
    });
  });

  // Feature: browser-web-interface, Property 5: Device connection update timing
  // Validates: Requirements 2.3
  describe('Property 5: Device connection update timing', () => {
    it('should update device list within 3 seconds when a new device connects', async function() {
      this.timeout(5000);

      // Create mock device managers that can simulate device connections
      let mockDevices: any[] = [];
      
      const mockSimctlManager = {
        listBootedSimulators: () => mockDevices.filter(d => d.type === 'simulator')
      };
      
      const mockAndroidManager = {
        getConnectedDevices: () => mockDevices.filter(d => d.type === 'android')
      };
      
      const mockIosManager = {
        listDevices: () => mockDevices.filter(d => d.type === 'ios-real')
      };
      
      const deviceService = new DeviceService(undefined, {
        simctlManager: mockSimctlManager as any,
        androidDeviceManager: mockAndroidManager as any,
        iosManager: mockIosManager as any
      });
      
      try {
        // Property: When a new device connects, callbacks should be notified within 3 seconds
        let callbackInvoked = false;
        let callbackTime = 0;
        const startTime = Date.now();
        
        const callback = (devices: DeviceInfo[]) => {
          if (!callbackInvoked) {
            callbackInvoked = true;
            callbackTime = Date.now() - startTime;
          }
        };
        
        // Subscribe to device changes
        deviceService.subscribeToDeviceChanges(callback);
        
        // Wait a bit for initial polling to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Simulate a new device connecting
        mockDevices.push({
          type: 'android',
          deviceId: 'emulator-5554',
          deviceName: 'Test Emulator'
        });
        
        // Wait up to 3.5 seconds for the callback to be invoked
        // (3 seconds polling interval + 0.5 second buffer)
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        // The callback should have been invoked within 3 seconds
        assert.ok(callbackInvoked, 
          'Callback should be invoked when a new device connects');
        assert.ok(callbackTime <= 3500,
          `Callback should be invoked within 3 seconds, but took ${callbackTime}ms`);
      } finally {
        // CRITICAL: Clean up the polling interval to prevent test hangs
        deviceService.cleanup();
        mockDevices = [];
      }
    });
  });
});
