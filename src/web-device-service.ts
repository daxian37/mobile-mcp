/**
 * Device Service for Mobile MCP Web Interface
 * Manages device listing and status tracking
 */

import * as logger from './logger.js';
import { SimctlManager } from './iphone-simulator.js';
import { AndroidDeviceManager } from './android.js';
import { IosManager } from './ios.js';
import { WebSocketHandler } from './web-websocket.js';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  type: 'simulator' | 'emulator' | 'real';
  status: 'connected' | 'disconnected';
  screenSize?: {
    width: number;
    height: number;
    scale: number;
  };
  orientation?: 'portrait' | 'landscape';
}

export type DeviceChangeCallback = (devices: DeviceInfo[]) => void;

export interface DeviceManagers {
  simctlManager?: SimctlManager;
  androidDeviceManager?: AndroidDeviceManager;
  iosManager?: IosManager;
}

export class DeviceService {
  private devices: Map<string, DeviceInfo> = new Map();
  private changeCallbacks: Set<DeviceChangeCallback> = new Set();
  private pollingInterval: NodeJS.Timeout | null = null;
  private simctlManager: SimctlManager;
  private androidDeviceManager: AndroidDeviceManager;
  private iosManager: IosManager;
  private wsHandler?: WebSocketHandler;

  constructor(wsHandler?: WebSocketHandler, deviceManagers?: DeviceManagers) {
    // Initialize device managers (allow injection for testing)
    this.simctlManager = deviceManagers?.simctlManager || new SimctlManager();
    this.androidDeviceManager = deviceManagers?.androidDeviceManager || new AndroidDeviceManager();
    this.iosManager = deviceManagers?.iosManager || new IosManager();
    this.wsHandler = wsHandler;
  }

  async listDevices(): Promise<DeviceInfo[]> {
    try {
      const allDevices: DeviceInfo[] = [];

      // Get iOS simulators
      const simulators = this.simctlManager.listBootedSimulators();
      for (const sim of simulators) {
        allDevices.push({
          id: sim.uuid,
          name: sim.name,
          platform: 'ios',
          type: 'simulator',
          status: sim.state === 'Booted' ? 'connected' : 'disconnected',
        });
      }

      // Get physical iOS devices
      const iosDevices = this.iosManager.listDevices();
      for (const device of iosDevices) {
        allDevices.push({
          id: device.deviceId,
          name: device.deviceName,
          platform: 'ios',
          type: 'real',
          status: 'connected',
        });
      }

      // Get Android devices (both emulators and real devices)
      const androidDevices = this.androidDeviceManager.getConnectedDevices();
      for (const device of androidDevices) {
        // Determine if it's an emulator or real device based on device ID
        const isEmulator = device.deviceId.startsWith('emulator-');
        
        allDevices.push({
          id: device.deviceId,
          name: device.deviceId, // Android doesn't provide friendly names easily
          platform: 'android',
          type: isEmulator ? 'emulator' : 'real',
          status: 'connected',
        });
      }

      // Update internal device map with status tracking
      const currentDeviceIds = new Set(allDevices.map(d => d.id));
      
      // Mark previously known devices as disconnected if they're no longer present
      for (const [id, device] of this.devices.entries()) {
        if (!currentDeviceIds.has(id)) {
          device.status = 'disconnected';
          allDevices.push(device);
        }
      }

      // Update the devices map
      for (const device of allDevices) {
        if (device.status === 'connected') {
          this.devices.set(device.id, device);
        }
      }

      return allDevices;
    } catch (error) {
      logger.error(`Error listing devices: ${error}`);
      throw error;
    }
  }

  async getDevice(deviceId: string): Promise<DeviceInfo | null> {
    try {
      const device = this.devices.get(deviceId);
      return device || null;
    } catch (error) {
      logger.error(`Error getting device: ${error}`);
      throw error;
    }
  }

  subscribeToDeviceChanges(callback: DeviceChangeCallback): void {
    this.changeCallbacks.add(callback);
    
    // Start polling if not already started
    if (!this.pollingInterval) {
      this.startPolling();
    }
  }

  unsubscribeFromDeviceChanges(callback: DeviceChangeCallback): void {
    this.changeCallbacks.delete(callback);
    
    // Stop polling if no more callbacks
    if (this.changeCallbacks.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private startPolling(): void {
    // Poll for device changes every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkDeviceChanges();
      } catch (error) {
        logger.error(`Error checking device changes: ${error}`);
      }
    }, 3000);
    
    // Also check immediately when polling starts
    this.checkDeviceChanges().catch(error => {
      logger.error(`Error in initial device check: ${error}`);
    });
  }

  private async checkDeviceChanges(): Promise<void> {
    const previousDeviceIds = new Set(this.devices.keys());
    const currentDevices = await this.listDevices();
    const currentDeviceIds = new Set(
      currentDevices.filter(d => d.status === 'connected').map(d => d.id)
    );

    // Check for newly connected devices
    const newDevices = currentDevices.filter(
      d => d.status === 'connected' && !previousDeviceIds.has(d.id)
    );

    // Check for disconnected devices
    const disconnectedDeviceIds = Array.from(previousDeviceIds).filter(
      id => !currentDeviceIds.has(id)
    );

    // If there are changes, notify callbacks and emit WebSocket events
    if (newDevices.length > 0 || disconnectedDeviceIds.length > 0) {
      logger.trace(
        `Device changes detected: ${newDevices.length} connected, ${disconnectedDeviceIds.length} disconnected`
      );
      
      // Emit WebSocket events for each newly connected device
      if (this.wsHandler) {
        for (const device of newDevices) {
          this.wsHandler.broadcast({
            type: 'device_connected',
            data: device
          });
        }
        
        // Emit WebSocket events for each disconnected device
        for (const deviceId of disconnectedDeviceIds) {
          this.wsHandler.broadcast({
            type: 'device_disconnected',
            data: { id: deviceId }
          });
        }
      }
      
      this.notifyCallbacks(currentDevices);
    }
  }

  private notifyCallbacks(devices: DeviceInfo[]): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(devices);
      } catch (error) {
        logger.error(`Error in device change callback: ${error}`);
      }
    });
  }

  async updateDeviceStatus(deviceId: string, status: 'connected' | 'disconnected'): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      const devices = await this.listDevices();
      this.notifyCallbacks(devices);
    }
  }

  /**
   * Stop all polling and clean up resources
   * This should be called when the service is no longer needed
   */
  cleanup(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.changeCallbacks.clear();
  }
}
