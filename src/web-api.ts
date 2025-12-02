/**
 * REST API Router for Mobile MCP Web Interface
 * Defines all HTTP endpoints for device management and control
 */

import { Router, Request, Response } from 'express';
import * as logger from './logger.js';
import { DeviceService } from './web-device-service.js';
import { CommandService } from './web-command-service.js';
import { getRobotForDevice } from './web-robot-factory.js';
import { ActionableError } from './robot.js';

let deviceService: DeviceService;
let commandService: CommandService;

export function createApiRouter(deviceServiceInstance?: DeviceService, wsHandler?: any): Router {
  const router = Router();
  
  // Use provided device service or create a new one
  if (deviceServiceInstance) {
    deviceService = deviceServiceInstance;
  } else if (!deviceService) {
    deviceService = new DeviceService();
  }
  
  // Always recreate command service with latest wsHandler
  commandService = new CommandService(deviceService, wsHandler);

  // Device endpoints
  router.get('/devices', async (req: Request, res: Response) => {
    try {
      const devices = await deviceService.listDevices();
      res.json({ devices });
    } catch (error) {
      logger.error(`Error listing devices: ${error}`);
      res.status(500).json({ error: 'Failed to list devices' });
    }
  });

  router.get('/devices/:deviceId', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      res.json({ device });
    } catch (error) {
      logger.error(`Error getting device info: ${error}`);
      res.status(500).json({ error: 'Failed to get device info' });
    }
  });

  router.get('/devices/:deviceId/screenshot', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      const screenshotBuffer = await robot.getScreenshot();
      const screenSize = await robot.getScreenSize();
      
      // Return screenshot as base64 with metadata
      res.json({
        screenshot: screenshotBuffer.toString('base64'),
        width: screenSize.width,
        height: screenSize.height,
        scale: screenSize.scale,
        format: 'png'
      });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error capturing screenshot: ${error.message}`);
        res.status(400).json({ error: 'Failed to capture screenshot', message: error.message });
      } else {
        logger.error(`Error capturing screenshot: ${error}`);
        res.status(500).json({ error: 'Failed to capture screenshot' });
      }
    }
  });

  router.get('/devices/:deviceId/orientation', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      const orientation = await robot.getOrientation();
      
      res.json({ orientation });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error getting orientation: ${error.message}`);
        res.status(400).json({ error: 'Failed to get orientation', message: error.message });
      } else {
        logger.error(`Error getting orientation: ${error}`);
        res.status(500).json({ error: 'Failed to get orientation' });
      }
    }
  });

  router.post('/devices/:deviceId/orientation', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { orientation } = req.body;
      
      if (!orientation || (orientation !== 'portrait' && orientation !== 'landscape')) {
        res.status(400).json({ 
          error: 'Invalid orientation',
          message: 'Orientation must be either "portrait" or "landscape"'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.setOrientation(orientation);
      
      res.json({ success: true, orientation });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error setting orientation: ${error.message}`);
        res.status(400).json({ error: 'Failed to set orientation', message: error.message });
      } else {
        logger.error(`Error setting orientation: ${error}`);
        res.status(500).json({ error: 'Failed to set orientation' });
      }
    }
  });

  // App management endpoints
  router.get('/devices/:deviceId/apps', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      const apps = await robot.listApps();
      
      res.json({ apps });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error listing apps: ${error.message}`);
        res.status(400).json({ error: 'Failed to list apps', message: error.message });
      } else {
        logger.error(`Error listing apps: ${error}`);
        res.status(500).json({ error: 'Failed to list apps' });
      }
    }
  });

  router.post('/devices/:deviceId/apps/:packageName/launch', async (req: Request, res: Response) => {
    try {
      const { deviceId, packageName } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.launchApp(packageName);
      
      res.json({ success: true, message: `App ${packageName} launched successfully` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error launching app: ${error.message}`);
        res.status(400).json({ error: 'Failed to launch app', message: error.message });
      } else {
        logger.error(`Error launching app: ${error}`);
        res.status(500).json({ error: 'Failed to launch app' });
      }
    }
  });

  router.post('/devices/:deviceId/apps/:packageName/terminate', async (req: Request, res: Response) => {
    try {
      const { deviceId, packageName } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.terminateApp(packageName);
      
      res.json({ success: true, message: `App ${packageName} terminated successfully` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error terminating app: ${error.message}`);
        res.status(400).json({ error: 'Failed to terminate app', message: error.message });
      } else {
        logger.error(`Error terminating app: ${error}`);
        res.status(500).json({ error: 'Failed to terminate app' });
      }
    }
  });

  router.post('/devices/:deviceId/apps/install', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { filePath } = req.body;
      
      if (!filePath || typeof filePath !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'filePath is required in request body'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.installApp(filePath);
      
      res.json({ success: true, message: 'App installed successfully' });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error installing app: ${error.message}`);
        res.status(400).json({ error: 'Failed to install app', message: error.message });
      } else {
        logger.error(`Error installing app: ${error}`);
        res.status(500).json({ error: 'Failed to install app' });
      }
    }
  });

  router.delete('/devices/:deviceId/apps/:packageName', async (req: Request, res: Response) => {
    try {
      const { deviceId, packageName } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.uninstallApp(packageName);
      
      res.json({ success: true, message: `App ${packageName} uninstalled successfully` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error uninstalling app: ${error.message}`);
        res.status(400).json({ error: 'Failed to uninstall app', message: error.message });
      } else {
        logger.error(`Error uninstalling app: ${error}`);
        res.status(500).json({ error: 'Failed to uninstall app' });
      }
    }
  });

  // Interaction endpoints
  router.post('/devices/:deviceId/tap', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { x, y } = req.body;
      
      if (typeof x !== 'number' || typeof y !== 'number') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'x and y coordinates are required as numbers'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.tap(x, y);
      
      res.json({ success: true, message: `Tapped at (${x}, ${y})` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error executing tap: ${error.message}`);
        res.status(400).json({ error: 'Failed to execute tap', message: error.message });
      } else {
        logger.error(`Error executing tap: ${error}`);
        res.status(500).json({ error: 'Failed to execute tap' });
      }
    }
  });

  router.post('/devices/:deviceId/longpress', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { x, y } = req.body;
      
      if (typeof x !== 'number' || typeof y !== 'number') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'x and y coordinates are required as numbers'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.longPress(x, y);
      
      res.json({ success: true, message: `Long pressed at (${x}, ${y})` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error executing long press: ${error.message}`);
        res.status(400).json({ error: 'Failed to execute long press', message: error.message });
      } else {
        logger.error(`Error executing long press: ${error}`);
        res.status(500).json({ error: 'Failed to execute long press' });
      }
    }
  });

  router.post('/devices/:deviceId/swipe', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { direction, x, y, distance } = req.body;
      
      if (!direction || !['up', 'down', 'left', 'right'].includes(direction)) {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'direction is required and must be one of: up, down, left, right'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      
      // If x and y are provided, use swipeFromCoordinate
      if (typeof x === 'number' && typeof y === 'number') {
        await robot.swipeFromCoordinate(x, y, direction, distance);
        res.json({ success: true, message: `Swiped ${direction} from (${x}, ${y})` });
      } else {
        await robot.swipe(direction);
        res.json({ success: true, message: `Swiped ${direction}` });
      }
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error executing swipe: ${error.message}`);
        res.status(400).json({ error: 'Failed to execute swipe', message: error.message });
      } else {
        logger.error(`Error executing swipe: ${error}`);
        res.status(500).json({ error: 'Failed to execute swipe' });
      }
    }
  });

  router.post('/devices/:deviceId/keys', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { text, submit } = req.body;
      
      if (typeof text !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'text is required as a string'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.sendKeys(text);
      
      // Optionally send ENTER after text
      if (submit === true) {
        await robot.pressButton('ENTER');
      }
      
      res.json({ success: true, message: `Sent text: ${text}${submit ? ' (with ENTER)' : ''}` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error sending keys: ${error.message}`);
        res.status(400).json({ error: 'Failed to send keys', message: error.message });
      } else {
        logger.error(`Error sending keys: ${error}`);
        res.status(500).json({ error: 'Failed to send keys' });
      }
    }
  });

  router.post('/devices/:deviceId/button', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { button } = req.body;
      
      const validButtons = ['HOME', 'BACK', 'VOLUME_UP', 'VOLUME_DOWN', 'ENTER', 
                           'DPAD_CENTER', 'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT'];
      
      if (!button || !validButtons.includes(button)) {
        res.status(400).json({ 
          error: 'Invalid request',
          message: `button is required and must be one of: ${validButtons.join(', ')}`
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      await robot.pressButton(button);
      
      res.json({ success: true, message: `Pressed button: ${button}` });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error pressing button: ${error.message}`);
        res.status(400).json({ error: 'Failed to press button', message: error.message });
      } else {
        logger.error(`Error pressing button: ${error}`);
        res.status(500).json({ error: 'Failed to press button' });
      }
    }
  });

  router.get('/devices/:deviceId/elements', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      const robot = await getRobotForDevice(device);
      const elements = await robot.getElementsOnScreen();
      
      res.json({ elements });
    } catch (error) {
      if (error instanceof ActionableError) {
        logger.error(`Actionable error listing elements: ${error.message}`);
        res.status(400).json({ error: 'Failed to list elements', message: error.message });
      } else {
        logger.error(`Error listing elements: ${error}`);
        res.status(500).json({ error: 'Failed to list elements' });
      }
    }
  });

  // Script execution endpoint
  router.post('/devices/:deviceId/script', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { script } = req.body;
      
      if (typeof script !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'script is required as a string'
        });
        return;
      }
      
      const device = await deviceService.getDevice(deviceId);
      
      if (!device) {
        const allDevices = await deviceService.listDevices();
        res.status(404).json({ 
          error: 'Device not found',
          message: `Device with ID '${deviceId}' not found`,
          availableDevices: allDevices.map(d => ({ id: d.id, name: d.name }))
        });
        return;
      }
      
      // Execute the script using CommandService
      const results = await commandService.executeScript(deviceId, script);
      
      res.json({ results });
    } catch (error) {
      logger.error(`Error executing script: ${error}`);
      res.status(500).json({ error: 'Failed to execute script' });
    }
  });

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return router;
}
