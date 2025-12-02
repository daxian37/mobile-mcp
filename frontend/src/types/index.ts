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

export interface AppInfo {
  packageName: string;
  appName: string;
  isRunning?: boolean;
}

export interface ElementInfo {
  type: string;
  text?: string;
  label?: string;
  name?: string;
  value?: string;
  identifier?: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  focused?: boolean;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'command' | 'event';
  payload: any;
}

export interface WebSocketEvent {
  type: 'screenshot' | 'device_connected' | 'device_disconnected' | 'command_result' | 'connection_status';
  data: any;
}

export interface Script {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface LogEntry {
  timestamp: number;
  command: string;
  params: any;
  result: CommandResult;
  status: 'success' | 'error';
}

export interface SessionData {
  selectedDevice: string | null;
  refreshInterval: number;
  openPanels: string[];
  timestamp: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  details?: string;
  duration?: number;
}
