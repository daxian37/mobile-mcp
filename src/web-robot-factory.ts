/**
 * Robot Factory for Mobile MCP Web Interface
 * Creates Robot instances based on device information
 */

import { Robot } from './robot.js';
import { AndroidRobot } from './android.js';
import { IosRobot } from './ios.js';
import { Simctl } from './iphone-simulator.js';
import { DeviceInfo } from './web-device-service.js';

/**
 * Create a Robot instance for the given device
 */
export async function getRobotForDevice(device: DeviceInfo): Promise<Robot> {
  if (device.platform === 'ios') {
    if (device.type === 'simulator') {
      return new Simctl(device.id);
    } else {
      // Real iOS device
      return new IosRobot(device.id);
    }
  } else if (device.platform === 'android') {
    // Both emulators and real devices use AndroidRobot
    return new AndroidRobot(device.id);
  }
  
  throw new Error(`Unsupported device platform: ${device.platform}`);
}
