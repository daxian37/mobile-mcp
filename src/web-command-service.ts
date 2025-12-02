/**
 * Command Service for Mobile MCP Web Interface
 * Handles command execution and script processing
 */

import * as logger from './logger.js';
import { Robot, ActionableError, SwipeDirection, Button } from './robot.js';
import { getRobotForDevice } from './web-robot-factory.js';
import { DeviceService } from './web-device-service.js';

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  command?: string;
  params?: any;
  index?: number;
}

export interface ScriptCommand {
  command: string;
  params: any;
}

export class CommandService {
  private deviceService: DeviceService;
  private wsHandler?: any; // WebSocketHandler

  constructor(deviceService: DeviceService, wsHandler?: any) {
    this.deviceService = deviceService;
    this.wsHandler = wsHandler;
  }

  /**
   * Execute a single command on a device
   */
  async executeCommand(
    deviceId: string,
    command: string,
    params: any
  ): Promise<CommandResult> {
    let result: CommandResult;
    
    try {
      // Get the device
      const device = await this.deviceService.getDevice(deviceId);
      if (!device) {
        result = {
          success: false,
          message: `Device not found: ${deviceId}`,
        };
        this.broadcastCommandResult(deviceId, command, params, result);
        return result;
      }

      // Get the robot for this device
      const robot = await getRobotForDevice(device);

      // Execute the command based on type
      switch (command) {
        case 'tap':
          await this.executeTap(robot, params);
          break;
        
        case 'longpress':
          await this.executeLongPress(robot, params);
          break;
        
        case 'doubleTap':
          await this.executeDoubleTap(robot, params);
          break;
        
        case 'swipe':
          await this.executeSwipe(robot, params);
          break;
        
        case 'swipeFromCoordinate':
          await this.executeSwipeFromCoordinate(robot, params);
          break;
        
        case 'sendKeys':
          await this.executeSendKeys(robot, params);
          break;
        
        case 'pressButton':
          await this.executePressButton(robot, params);
          break;
        
        default:
          result = {
            success: false,
            message: `Unknown command: ${command}`,
          };
          this.broadcastCommandResult(deviceId, command, params, result);
          return result;
      }

      result = {
        success: true,
        message: `Command ${command} executed successfully`,
      };
      
      // Broadcast success result
      this.broadcastCommandResult(deviceId, command, params, result);
      
      return result;
    } catch (error) {
      // Handle ActionableError specially
      if (error instanceof ActionableError) {
        logger.error(`ActionableError executing command ${command}: ${error.message}`);
        result = {
          success: false,
          message: error.message,
        };
      } else {
        // Handle other errors
        logger.error(`Error executing command ${command}: ${error}`);
        result = {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
      
      // Broadcast error result
      this.broadcastCommandResult(deviceId, command, params, result);
      
      return result;
    }
  }

  /**
   * Broadcast command execution result via WebSocket
   */
  private broadcastCommandResult(
    deviceId: string,
    command: string,
    params: any,
    result: CommandResult
  ): void {
    if (this.wsHandler) {
      this.wsHandler.broadcast({
        type: 'command_result',
        data: {
          deviceId,
          command,
          params,
          result,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Execute a tap command
   */
  private async executeTap(robot: Robot, params: any): Promise<void> {
    const { x, y } = params;
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Tap command requires x and y coordinates');
    }
    await robot.tap(x, y);
  }

  /**
   * Execute a long press command
   */
  private async executeLongPress(robot: Robot, params: any): Promise<void> {
    const { x, y } = params;
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Long press command requires x and y coordinates');
    }
    await robot.longPress(x, y);
  }

  /**
   * Execute a double tap command
   */
  private async executeDoubleTap(robot: Robot, params: any): Promise<void> {
    const { x, y } = params;
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Double tap command requires x and y coordinates');
    }
    await robot.doubleTap(x, y);
  }

  /**
   * Execute a swipe command
   */
  private async executeSwipe(robot: Robot, params: any): Promise<void> {
    const { direction } = params;
    if (!direction || !['up', 'down', 'left', 'right'].includes(direction)) {
      throw new Error('Swipe command requires a valid direction (up, down, left, right)');
    }
    await robot.swipe(direction as SwipeDirection);
  }

  /**
   * Execute a swipe from coordinate command
   */
  private async executeSwipeFromCoordinate(robot: Robot, params: any): Promise<void> {
    const { x, y, direction, distance } = params;
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Swipe from coordinate requires x and y coordinates');
    }
    if (!direction || !['up', 'down', 'left', 'right'].includes(direction)) {
      throw new Error('Swipe from coordinate requires a valid direction (up, down, left, right)');
    }
    await robot.swipeFromCoordinate(x, y, direction as SwipeDirection, distance);
  }

  /**
   * Execute a send keys command
   */
  private async executeSendKeys(robot: Robot, params: any): Promise<void> {
    const { text, submit } = params;
    if (typeof text !== 'string') {
      throw new Error('Send keys command requires text parameter');
    }
    
    // Send the text
    await robot.sendKeys(text);
    
    // Optionally send ENTER after text
    if (submit === true) {
      await robot.pressButton('ENTER');
    }
  }

  /**
   * Execute a press button command
   */
  private async executePressButton(robot: Robot, params: any): Promise<void> {
    const { button } = params;
    if (!button) {
      throw new Error('Press button command requires button parameter');
    }
    
    // Validate button is a valid Button type
    const validButtons: Button[] = [
      'HOME', 'BACK', 'VOLUME_UP', 'VOLUME_DOWN', 'ENTER',
      'DPAD_CENTER', 'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT'
    ];
    
    if (!validButtons.includes(button as Button)) {
      throw new Error(`Invalid button: ${button}`);
    }
    
    await robot.pressButton(button as Button);
  }

  /**
   * Execute a script containing multiple commands
   */
  async executeScript(
    deviceId: string,
    script: string
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    try {
      // Parse the script into individual commands
      const commands = this.parseScript(script);
      
      // Execute commands sequentially
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        logger.trace(`Executing command: ${cmd.command} with params: ${JSON.stringify(cmd.params)}`);
        
        const result = await this.executeCommand(deviceId, cmd.command, cmd.params);
        
        // Add command metadata to result
        results.push({
          ...result,
          command: cmd.command,
          params: cmd.params,
          index: i
        });
        
        // Stop on first error
        if (!result.success) {
          logger.error(`Script execution stopped due to error: ${result.message}`);
          break;
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`Error executing script: ${error}`);
      
      // Return error result
      results.push({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
      
      return results;
    }
  }

  /**
   * Parse a script string into individual commands
   */
  private parseScript(script: string): ScriptCommand[] {
    const commands: ScriptCommand[] = [];
    
    // Split script into lines
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Skip comments
      if (line.startsWith('#') || line.startsWith('//')) {
        continue;
      }
      
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(line);
        
        if (parsed.command && typeof parsed.command === 'string') {
          commands.push({
            command: parsed.command,
            params: parsed.params || {},
          });
        } else {
          throw new Error('Invalid command format: missing command field');
        }
      } catch (error) {
        // If JSON parsing fails, try simple command format: "command arg1 arg2"
        const parts = line.split(/\s+/);
        const command = parts[0];
        const params: any = {};
        
        // Parse simple arguments based on command type
        if (command === 'tap' || command === 'longpress' || command === 'doubleTap') {
          if (parts.length >= 3) {
            params.x = parseFloat(parts[1]);
            params.y = parseFloat(parts[2]);
          }
        } else if (command === 'swipe') {
          if (parts.length >= 2) {
            params.direction = parts[1];
          }
        } else if (command === 'swipeFromCoordinate') {
          if (parts.length >= 4) {
            params.x = parseFloat(parts[1]);
            params.y = parseFloat(parts[2]);
            params.direction = parts[3];
            if (parts.length >= 5) {
              params.distance = parseFloat(parts[4]);
            }
          }
        } else if (command === 'sendKeys') {
          if (parts.length >= 2) {
            params.text = parts.slice(1).join(' ');
          }
        } else if (command === 'pressButton') {
          if (parts.length >= 2) {
            params.button = parts[1];
          }
        }
        
        commands.push({ command, params });
      }
    }
    
    return commands;
  }
}
