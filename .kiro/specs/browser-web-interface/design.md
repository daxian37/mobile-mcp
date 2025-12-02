# Design Document

## Overview

本设计文档描述了 Mobile MCP 浏览器 Web 界面的架构和实现方案。该 Web 界面将为现有的 Mobile MCP 服务器提供一个基于浏览器的用户界面，使用户能够通过 Web 浏览器管理移动设备、查看实时屏幕、执行交互操作和运行测试脚本。

系统采用前后端分离架构，后端基于 Express.js 提供 REST API 和 WebSocket 服务，前端使用现代 Web 技术栈构建响应式单页应用。

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Web Browser    │◄───────►│  Web Server      │◄───────►│  Mobile MCP     │
│  (Frontend)     │         │  (Backend)       │         │  Core           │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
      │                            │                            │
      │ HTTP/WS                    │ Function Calls             │ ADB/WDA
      │                            │                            │
      ▼                            ▼                            ▼
  React SPA                   Express + WS              Android/iOS Devices
```

### Component Layers

1. **Frontend Layer (React SPA)**
   - Device Panel: 显示设备列表和状态
   - Screen Viewer: 显示设备屏幕截图和交互
   - Control Panel: 虚拟按钮控制
   - App Manager: 应用管理界面
   - Script Editor: 测试脚本编辑和执行
   - Session Manager: 会话保存和恢复

2. **Backend Layer (Express Server)**
   - REST API Router: 处理 HTTP 请求
   - WebSocket Server: 实时通信
   - Device Service: 设备管理逻辑
   - Command Service: 命令执行逻辑
   - Session Service: 会话管理逻辑

3. **Integration Layer**
   - MCP Core Adapter: 调用现有 MCP 功能
   - Robot Factory: 创建设备控制实例

## Components and Interfaces

### Backend Components

#### 1. Web Server (src/web-server.ts)

主服务器类，负责启动 HTTP 和 WebSocket 服务器。

```typescript
interface WebServerConfig {
  httpPort: number;
  wsPort: number;
  enableAuth: boolean;
  authToken?: string;
  enableCors: boolean;
  corsOrigins?: string[];
  enableHttps: boolean;
  sslCert?: string;
  sslKey?: string;
}

class WebServer {
  constructor(config: WebServerConfig);
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

#### 2. REST API Router (src/web-api.ts)

定义所有 REST API 端点。

```typescript
// GET /api/devices - 获取设备列表
// GET /api/devices/:deviceId/apps - 获取应用列表
// POST /api/devices/:deviceId/apps/:packageName/launch - 启动应用
// POST /api/devices/:deviceId/apps/:packageName/terminate - 终止应用
// POST /api/devices/:deviceId/apps/install - 安装应用
// DELETE /api/devices/:deviceId/apps/:packageName - 卸载应用
// POST /api/devices/:deviceId/tap - 点击屏幕
// POST /api/devices/:deviceId/swipe - 滑动屏幕
// POST /api/devices/:deviceId/keys - 输入文本
// POST /api/devices/:deviceId/button - 按按钮
// GET /api/devices/:deviceId/elements - 获取元素列表
// GET /api/devices/:deviceId/screenshot - 获取截图
// GET /api/devices/:deviceId/orientation - 获取方向
// POST /api/devices/:deviceId/orientation - 设置方向
```

#### 3. WebSocket Server (src/web-websocket.ts)

处理实时通信。

```typescript
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'command' | 'event';
  payload: any;
}

interface WebSocketEvent {
  type: 'screenshot' | 'device_connected' | 'device_disconnected' | 'command_result';
  data: any;
}

class WebSocketServer {
  constructor(port: number);
  broadcast(event: WebSocketEvent): void;
  sendToClient(clientId: string, event: WebSocketEvent): void;
}
```

#### 4. Device Service (src/web-device-service.ts)

设备管理业务逻辑。

```typescript
interface DeviceInfo {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  type: 'simulator' | 'emulator' | 'real';
  status: 'connected' | 'disconnected';
  screenSize?: { width: number; height: number; scale: number };
}

class DeviceService {
  listDevices(): Promise<DeviceInfo[]>;
  getDevice(deviceId: string): Promise<DeviceInfo>;
  subscribeToDeviceChanges(callback: (devices: DeviceInfo[]) => void): void;
}
```

#### 5. Command Service (src/web-command-service.ts)

命令执行业务逻辑。

```typescript
interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}

class CommandService {
  executeCommand(deviceId: string, command: string, params: any): Promise<CommandResult>;
  executeScript(deviceId: string, script: string): Promise<CommandResult[]>;
}
```

### Frontend Components

#### 1. App Component (frontend/src/App.tsx)

主应用组件，管理全局状态和路由。

```typescript
interface AppState {
  selectedDevice: string | null;
  devices: DeviceInfo[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}
```

#### 2. DevicePanel Component (frontend/src/components/DevicePanel.tsx)

设备列表面板。

```typescript
interface DevicePanelProps {
  devices: DeviceInfo[];
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string) => void;
}
```

#### 3. ScreenViewer Component (frontend/src/components/ScreenViewer.tsx)

设备屏幕查看器。

```typescript
interface ScreenViewerProps {
  deviceId: string;
  refreshInterval: number;
  onTap: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
  onSwipe: (direction: string, x: number, y: number) => void;
}
```

#### 4. ControlPanel Component (frontend/src/components/ControlPanel.tsx)

虚拟按钮控制面板。

```typescript
interface ControlPanelProps {
  deviceId: string;
  platform: 'ios' | 'android';
  deviceType: 'mobile' | 'tv';
  onButtonPress: (button: string) => void;
}
```

#### 5. AppManager Component (frontend/src/components/AppManager.tsx)

应用管理组件。

```typescript
interface AppManagerProps {
  deviceId: string;
  apps: AppInfo[];
  onLaunch: (packageName: string) => void;
  onTerminate: (packageName: string) => void;
  onInstall: (file: File) => void;
  onUninstall: (packageName: string) => void;
}
```

#### 6. ScriptEditor Component (frontend/src/components/ScriptEditor.tsx)

脚本编辑器组件。

```typescript
interface ScriptEditorProps {
  deviceId: string;
  onExecute: (script: string) => void;
  executionLog: LogEntry[];
}
```

### API Service (frontend/src/services/api.ts)

前端 API 客户端。

```typescript
class ApiService {
  getDevices(): Promise<DeviceInfo[]>;
  getApps(deviceId: string): Promise<AppInfo[]>;
  launchApp(deviceId: string, packageName: string): Promise<void>;
  terminateApp(deviceId: string, packageName: string): Promise<void>;
  installApp(deviceId: string, file: File): Promise<void>;
  uninstallApp(deviceId: string, packageName: string): Promise<void>;
  tap(deviceId: string, x: number, y: number): Promise<void>;
  swipe(deviceId: string, direction: string, x?: number, y?: number): Promise<void>;
  sendKeys(deviceId: string, text: string, submit: boolean): Promise<void>;
  pressButton(deviceId: string, button: string): Promise<void>;
  getElements(deviceId: string): Promise<ElementInfo[]>;
  getScreenshot(deviceId: string): Promise<string>;
  getOrientation(deviceId: string): Promise<string>;
  setOrientation(deviceId: string, orientation: string): Promise<void>;
}
```

### WebSocket Service (frontend/src/services/websocket.ts)

前端 WebSocket 客户端。

```typescript
class WebSocketService {
  connect(url: string): Promise<void>;
  disconnect(): void;
  subscribe(eventType: string, callback: (data: any) => void): void;
  unsubscribe(eventType: string): void;
  send(message: WebSocketMessage): void;
}
```

## Data Models

### Device Model

```typescript
interface DeviceInfo {
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
```

### App Model

```typescript
interface AppInfo {
  packageName: string;
  appName: string;
  isRunning?: boolean;
}
```

### Element Model

```typescript
interface ElementInfo {
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
```

### Session Model

```typescript
interface SessionData {
  selectedDevice: string | null;
  refreshInterval: number;
  openPanels: string[];
  timestamp: number;
}
```

### Script Model

```typescript
interface Script {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface LogEntry {
  timestamp: number;
  command: string;
  params: any;
  result: CommandResult;
  status: 'success' | 'error';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. 
Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Connection and Initialization Properties

Property 1: Connection establishment timing
*For any* page load, when the Web Interface loads, the connection to the Mobile MCP Server should be established within 5 seconds
**Validates: Requirements 1.2**

Property 2: Browser compatibility warning
*For any* unsupported browser user agent, the system should display a warning message indicating minimum browser requirements
**Validates: Requirements 1.4**

### Device Management Properties

Property 3: Device list completeness
*For any* set of connected devices, when the Web Interface connects to the server, all available devices (simulators, emulators, and real devices) should be retrieved and displayed
**Validates: Requirements 2.1**

Property 4: Device information completeness
*For any* device in the list, the displayed information should include device name, platform, type, and connection status
**Validates: Requirements 2.2**

Property 5: Device connection update timing
*For any* new device connection event, the device list should update automatically within 3 seconds
**Validates: Requirements 2.3**

Property 6: Device disconnection handling
*For any* device disconnection event, the system should update the device status and notify the user
**Validates: Requirements 2.4**

### Screenshot and Display Properties

Property 7: Device screen display timing
*For any* device selection, the device screen should be displayed within 2 seconds
**Validates: Requirements 3.1**

Property 8: Screenshot metadata completeness
*For any* displayed screenshot, the system should show the current screenshot with actual dimensions and scale information
**Validates: Requirements 3.2**

Property 9: Auto-refresh interval
*For any* device screen, when auto-refresh is enabled, the screenshot should refresh automatically at the configured interval
**Validates: Requirements 3.3**

Property 10: Screenshot error retry
*For any* screenshot capture failure, the system should display an error message and retry automatically
**Validates: Requirements 3.5**

### Interaction Properties

Property 11: Click coordinate mapping
*For any* click position on the screenshot, the system should calculate the correct device coordinates and send a tap command
**Validates: Requirements 4.1**

Property 12: Scaled coordinate transformation
*For any* scaled screenshot and click position, the system should correctly map click coordinates to actual device coordinates
**Validates: Requirements 4.2**

Property 13: Tap feedback timing
*For any* tap command execution, the system should provide visual feedback and update the screenshot within 1 second
**Validates: Requirements 4.3**

Property 14: Long press detection
*For any* user interaction where the mouse is held down for 500ms, the system should send a long press command to the device
**Validates: Requirements 4.4**

Property 15: Swipe gesture recognition
*For any* swipe gesture, the system should detect the direction and distance and send the appropriate swipe command
**Validates: Requirements 4.5**

### Control Panel Properties

Property 16: Platform-specific button display
*For any* device platform, the Control Panel should show the appropriate buttons (including BACK for Android only)
**Validates: Requirements 5.1**

Property 17: Button command execution
*For any* control button click, the system should send the corresponding command to the device immediately
**Validates: Requirements 5.2**

Property 18: Button loading state
*For any* button command execution, the system should disable the button and show a loading indicator during execution
**Validates: Requirements 5.3**

Property 19: Button completion state
*For any* button command completion, the system should re-enable the button and update the device screen
**Validates: Requirements 5.4**

Property 20: Android TV button display
*For any* Android TV device, the system should additionally display DPAD buttons (CENTER, UP, DOWN, LEFT, RIGHT)
**Validates: Requirements 5.5**

### Text Input Properties

Property 21: Input buffering
*For any* text typed in the input field, the system should buffer the input locally before sending
**Validates: Requirements 6.1**

Property 22: Text submission
*For any* text input, when the user presses Enter or clicks Send, the system should send the complete text to the device
**Validates: Requirements 6.2**

Property 23: Text sending indicator
*For any* text being sent, the system should show a sending indicator
**Validates: Requirements 6.3**

Property 24: Input field cleanup
*For any* completed text input, the system should clear the input field and update the device screen
**Validates: Requirements 6.4**

Property 25: Submit after send option
*For any* text input with "Submit after send" enabled, the system should send an ENTER command after the text
**Validates: Requirements 6.5**

### Element List Properties

Property 26: Element information completeness
*For any* element in the list, the displayed information should include type, text, label, coordinates, and dimensions
**Validates: Requirements 7.2**

Property 27: Element highlighting
*For any* element clicked in the list, the system should highlight the corresponding area on the screenshot
**Validates: Requirements 7.3**

Property 28: Element tap on double-click
*For any* element double-clicked in the list, the system should send a tap command to that element's coordinates
**Validates: Requirements 7.4**

### App Management Properties

Property 29: App launch command
*For any* app in the list, when the user selects "Launch", the system should call mobile_launch_app with the correct package name
**Validates: Requirements 8.2**

Property 30: App terminate command
*For any* running app, when the user selects "Terminate", the system should call mobile_terminate_app with the correct package name
**Validates: Requirements 8.3**

Property 31: App install command
*For any* uploaded app file (.apk, .ipa, .app, .zip), the system should call mobile_install_app with the file path
**Validates: Requirements 8.4**

Property 32: App uninstall confirmation
*For any* app, when the user selects "Uninstall", the system should prompt for confirmation and call mobile_uninstall_app
**Validates: Requirements 8.5**

### Script Execution Properties

Property 33: Script sequential execution
*For any* script, when executed, the system should run each command sequentially and display progress
**Validates: Requirements 9.3**

Property 34: Command logging
*For any* script command execution, the system should show the command, parameters, and result in a log panel
**Validates: Requirements 9.4**

Property 35: Script error handling
*For any* script that encounters an error, the system should pause execution, highlight the failing command, and display the error message
**Validates: Requirements 9.5**

### Session Management Properties

Property 36: Session save completeness
*For any* session save operation, the system should store the selected device, screenshot refresh rate, and open panels
**Validates: Requirements 10.1**

Property 37: Session restore completeness
*For any* saved session load operation, the system should restore the device selection and UI configuration
**Validates: Requirements 10.2**

Property 38: Auto-save on close
*For any* browser close event, the system should automatically save the current session to local storage
**Validates: Requirements 10.3**

### API Properties

Property 39: JSON response format
*For any* REST API request, the system should return responses in JSON format with appropriate HTTP status codes
**Validates: Requirements 11.3**

Property 40: WebSocket reconnection with backoff
*For any* WebSocket connection drop, the system should attempt to reconnect automatically with exponential backoff
**Validates: Requirements 11.5**

### Configuration Properties

Property 41: Authentication enforcement
*For any* request when authentication is enabled, the system should require valid credentials before allowing access
**Validates: Requirements 12.3**

Property 42: CORS enforcement
*For any* cross-origin request when CORS is configured, the system should enforce the specified origin restrictions
**Validates: Requirements 12.4**

## Error Handling

### Backend Error Handling

1. **Device Not Found Errors**
   - Return 404 status code with descriptive error message
   - Include list of available devices in error response

2. **Command Execution Errors**
   - Catch ActionableError from Robot interface
   - Return 400 status code with error message
   - Log error details for debugging

3. **WebSocket Connection Errors**
   - Implement automatic reconnection with exponential backoff
   - Maximum retry attempts: 5
   - Backoff intervals: 1s, 2s, 4s, 8s, 16s
   - Notify user of connection status changes

4. **File Upload Errors**
   - Validate file type and size before processing
   - Return 400 for invalid files
   - Clean up temporary files on error

5. **Configuration Errors**
   - Validate configuration on server startup
   - Fail fast with clear error messages
   - Provide default values for optional settings

### Frontend Error Handling

1. **API Request Errors**
   - Display user-friendly error messages
   - Provide retry options for transient errors
   - Log errors to console for debugging

2. **Screenshot Loading Errors**
   - Show placeholder image with error message
   - Implement automatic retry with backoff
   - Allow manual refresh

3. **WebSocket Disconnection**
   - Show connection status indicator
   - Attempt automatic reconnection
   - Disable interactive features until reconnected

4. **Session Restoration Errors**
   - Fall back to default UI state
   - Notify user of restoration failure
   - Clear corrupted session data

5. **Script Execution Errors**
   - Pause script execution on error
   - Highlight failing command
   - Display error message with context
   - Provide options to continue or abort

## Testing Strategy

### Unit Testing

The system will use **Jest** for unit testing on both frontend and backend.

**Backend Unit Tests:**
- Test REST API endpoints with mock Robot instances
- Test WebSocket message handling
- Test Device Service logic
- Test Command Service logic
- Test Session Service logic
- Test configuration loading and validation
- Test error handling for various failure scenarios

**Frontend Unit Tests:**
- Test React component rendering
- Test API service methods with mock responses
- Test WebSocket service connection and message handling
- Test coordinate transformation logic
- Test session save/restore logic
- Test script parsing and execution logic

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript.

**Property-Based Testing Configuration:**
- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: browser-web-interface, Property {number}: {property_text}`

**Property-Based Tests:**

1. **Coordinate Transformation Properties**
   - Test that click coordinates are correctly mapped to device coordinates across various screen sizes and scale factors
   - Test that scaled coordinates round-trip correctly (screen → device → screen)

2. **Device List Properties**
   - Test that device information always includes required fields (name, platform, type, status)
   - Test that device list updates correctly when devices connect/disconnect

3. **Session Persistence Properties**
   - Test that session save and restore preserves all state (round-trip property)
   - Test that session data serialization/deserialization is consistent

4. **API Response Properties**
   - Test that all API responses are valid JSON with correct structure
   - Test that error responses include appropriate status codes and messages

5. **Script Execution Properties**
   - Test that script commands execute in order
   - Test that script execution stops on first error
   - Test that command results are logged correctly

6. **WebSocket Reconnection Properties**
   - Test that reconnection backoff intervals follow exponential pattern
   - Test that reconnection attempts respect maximum retry limit

### Integration Testing

**Backend Integration Tests:**
- Test full request/response cycle with real Express server
- Test WebSocket connection and message flow
- Test integration with MCP Core components
- Test file upload and processing

**Frontend Integration Tests:**
- Test user interactions with React Testing Library
- Test API calls with mock server (MSW)
- Test WebSocket communication with mock WebSocket server
- Test end-to-end user flows (device selection → screenshot → interaction)

### End-to-End Testing

Use **Playwright** for browser-based E2E testing:
- Test complete user workflows across different browsers
- Test real-time screenshot updates
- Test device interaction flows
- Test script execution flows
- Test session save/restore flows

## Implementation Notes

### Technology Stack

**Backend:**
- Node.js with TypeScript
- Express.js for HTTP server
- ws library for WebSocket server
- Existing MCP Core components (Robot, AndroidRobot, IosRobot, etc.)

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Monaco Editor for script editing
- React Query for API state management
- Zustand for client state management

### Security Considerations

1. **Authentication**
   - Support optional token-based authentication
   - Validate auth token on all API requests
   - Store auth token securely in browser (httpOnly cookie or secure storage)

2. **CORS**
   - Configure allowed origins
   - Validate origin on all requests
   - Support credentials in CORS requests

3. **Input Validation**
   - Validate all user inputs on backend
   - Sanitize file uploads
   - Prevent command injection in script execution

4. **HTTPS**
   - Support HTTPS with provided certificates
   - Redirect HTTP to HTTPS when enabled
   - Use secure WebSocket (wss://) with HTTPS

### Performance Considerations

1. **Screenshot Optimization**
   - Compress screenshots before sending (JPEG with quality 75)
   - Use WebSocket for streaming to reduce overhead
   - Implement client-side caching with cache-busting

2. **API Response Caching**
   - Cache device list with short TTL (3 seconds)
   - Cache app list until device changes
   - Use ETag for conditional requests

3. **WebSocket Message Batching**
   - Batch multiple events into single message when possible
   - Throttle screenshot updates to configured interval
   - Debounce user input events

4. **Frontend Optimization**
   - Lazy load components
   - Virtualize long lists (device list, app list, element list)
   - Memoize expensive computations
   - Use React.memo for pure components

### Deployment Considerations

1. **Server Startup**
   - Load configuration from environment variables or config file
   - Validate configuration before starting servers
   - Log startup information (ports, enabled features)

2. **Process Management**
   - Support graceful shutdown
   - Clean up resources on exit
   - Handle SIGTERM and SIGINT signals

3. **Logging**
   - Use existing logger from MCP Core
   - Log all API requests and responses
   - Log WebSocket connections and disconnections
   - Log errors with stack traces

4. **Monitoring**
   - Expose health check endpoint (/health)
   - Track active WebSocket connections
   - Monitor screenshot capture performance
   - Track API response times
