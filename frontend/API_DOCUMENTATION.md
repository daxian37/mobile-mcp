# Mobile MCP Web Interface - API Documentation

Complete reference for the REST API and WebSocket protocol used by the Mobile MCP Web Interface.

## Table of Contents

- [REST API](#rest-api)
  - [Authentication](#authentication)
  - [Device Endpoints](#device-endpoints)
  - [App Management Endpoints](#app-management-endpoints)
  - [Interaction Endpoints](#interaction-endpoints)
  - [Script Execution](#script-execution)
  - [Health Check](#health-check)
- [WebSocket Protocol](#websocket-protocol)
  - [Connection](#websocket-connection)
  - [Message Format](#message-format)
  - [Subscriptions](#subscriptions)
  - [Events](#events)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## REST API

Base URL: `http://localhost:3001/api` (configurable via `WEB_HTTP_PORT`)

All API responses are in JSON format with appropriate HTTP status codes.

### Authentication

If authentication is enabled (`WEB_ENABLE_AUTH=true`), include the auth token in the `Authorization` header:

```
Authorization: Bearer your-auth-token
```

The health check endpoint (`/api/health`) does not require authentication.

---

### Device Endpoints

#### List All Devices

Get a list of all available devices (simulators, emulators, and real devices).

**Request:**
```http
GET /api/devices
```

**Response:**
```json
{
  "devices": [
    {
      "id": "emulator-5554",
      "name": "Pixel 6 API 33",
      "platform": "android",
      "type": "emulator",
      "status": "connected",
      "screenSize": {
        "width": 1080,
        "height": 2400,
        "scale": 2.75
      }
    },
    {
      "id": "iPhone-15-Pro",
      "name": "iPhone 15 Pro",
      "platform": "ios",
      "type": "simulator",
      "status": "connected",
      "screenSize": {
        "width": 1179,
        "height": 2556,
        "scale": 3.0
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Failed to list devices

---

#### Get Device Info

Get detailed information about a specific device.

**Request:**
```http
GET /api/devices/:deviceId
```

**Parameters:**
- `deviceId` (path) - Device identifier (e.g., "emulator-5554")

**Response:**
```json
{
  "device": {
    "id": "emulator-5554",
    "name": "Pixel 6 API 33",
    "platform": "android",
    "type": "emulator",
    "status": "connected",
    "screenSize": {
      "width": 1080,
      "height": 2400,
      "scale": 2.75
    },
    "orientation": "portrait"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to get device info

---

#### Get Screenshot

Capture a screenshot from the device.

**Request:**
```http
GET /api/devices/:deviceId/screenshot
```

**Parameters:**
- `deviceId` (path) - Device identifier

**Response:**
```json
{
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...", 
  "width": 1080,
  "height": 2400,
  "scale": 2.75,
  "format": "png"
}
```

**Fields:**
- `screenshot` - Base64-encoded PNG image
- `width` - Screen width in pixels
- `height` - Screen height in pixels
- `scale` - Screen scale factor
- `format` - Image format (always "png")

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to capture screenshot (ActionableError)
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to capture screenshot

---

#### Get Orientation

Get the current screen orientation of the device.

**Request:**
```http
GET /api/devices/:deviceId/orientation
```

**Parameters:**
- `deviceId` (path) - Device identifier

**Response:**
```json
{
  "orientation": "portrait"
}
```

**Values:**
- `portrait` - Vertical orientation
- `landscape` - Horizontal orientation

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to get orientation
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to get orientation

---

#### Set Orientation

Change the screen orientation of the device.

**Request:**
```http
POST /api/devices/:deviceId/orientation
Content-Type: application/json

{
  "orientation": "landscape"
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `orientation` (body) - Target orientation ("portrait" or "landscape")

**Response:**
```json
{
  "success": true,
  "message": "Orientation set to landscape"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid orientation or failed to set
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to set orientation

---

### App Management Endpoints

#### List Installed Apps

Get a list of all installed apps on the device.

**Request:**
```http
GET /api/devices/:deviceId/apps
```

**Parameters:**
- `deviceId` (path) - Device identifier

**Response:**
```json
{
  "apps": [
    {
      "packageName": "com.android.settings",
      "appName": "Settings"
    },
    {
      "packageName": "com.android.chrome",
      "appName": "Chrome"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to list apps
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to list apps

---

#### Launch App

Launch an installed app by package name.

**Request:**
```http
POST /api/devices/:deviceId/apps/:packageName/launch
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `packageName` (path) - App package name (e.g., "com.android.settings")

**Response:**
```json
{
  "success": true,
  "message": "App com.android.settings launched successfully"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to launch app
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to launch app

---

#### Terminate App

Stop a running app.

**Request:**
```http
POST /api/devices/:deviceId/apps/:packageName/terminate
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `packageName` (path) - App package name

**Response:**
```json
{
  "success": true,
  "message": "App com.android.chrome terminated successfully"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to terminate app
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to terminate app

---

#### Install App

Install an app from a file.

**Request:**
```http
POST /api/devices/:deviceId/apps/install
Content-Type: application/json

{
  "filePath": "/path/to/app.apk"
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `filePath` (body) - Path to app file (.apk, .ipa, .app, .zip)

**Response:**
```json
{
  "success": true,
  "message": "App installed successfully from /path/to/app.apk"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing file path or failed to install
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to install app

---

#### Uninstall App

Remove an installed app from the device.

**Request:**
```http
DELETE /api/devices/:deviceId/apps/:packageName
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `packageName` (path) - App package name

**Response:**
```json
{
  "success": true,
  "message": "App com.example.app uninstalled successfully"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to uninstall app
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to uninstall app

---

### Interaction Endpoints

#### Tap

Tap at specific coordinates on the screen.

**Request:**
```http
POST /api/devices/:deviceId/tap
Content-Type: application/json

{
  "x": 540,
  "y": 1200
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `x` (body) - X coordinate in pixels
- `y` (body) - Y coordinate in pixels

**Response:**
```json
{
  "success": true,
  "message": "Tapped at coordinates (540, 1200)"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing coordinates or failed to tap
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to tap

---

#### Long Press

Long press at specific coordinates.

**Request:**
```http
POST /api/devices/:deviceId/longpress
Content-Type: application/json

{
  "x": 540,
  "y": 1200,
  "duration": 1000
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `x` (body) - X coordinate in pixels
- `y` (body) - Y coordinate in pixels
- `duration` (body, optional) - Duration in milliseconds (default: 1000)

**Response:**
```json
{
  "success": true,
  "message": "Long pressed at coordinates (540, 1200) for 1000ms"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing coordinates or failed to long press
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to long press

---

#### Swipe

Perform a swipe gesture.

**Request:**
```http
POST /api/devices/:deviceId/swipe
Content-Type: application/json

{
  "direction": "up",
  "x": 540,
  "y": 1200
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `direction` (body) - Swipe direction ("up", "down", "left", "right")
- `x` (body, optional) - Starting X coordinate (default: screen center)
- `y` (body, optional) - Starting Y coordinate (default: screen center)

**Response:**
```json
{
  "success": true,
  "message": "Swiped up from (540, 1200)"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing direction or failed to swipe
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to swipe

---

#### Send Keys

Type text into the focused input field.

**Request:**
```http
POST /api/devices/:deviceId/keys
Content-Type: application/json

{
  "text": "Hello World",
  "submit": true
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `text` (body) - Text to type
- `submit` (body, optional) - Send ENTER after text (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Typed text: Hello World (with submit)"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing text or failed to type
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to type

---

#### Press Button

Press a device button.

**Request:**
```http
POST /api/devices/:deviceId/button
Content-Type: application/json

{
  "button": "HOME"
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `button` (body) - Button name

**Supported Buttons:**
- `HOME` - Home button (iOS/Android)
- `BACK` - Back button (Android only)
- `VOLUME_UP` - Volume up
- `VOLUME_DOWN` - Volume down
- `ENTER` - Enter/Return
- `DPAD_CENTER` - D-pad center (Android TV)
- `DPAD_UP` - D-pad up (Android TV)
- `DPAD_DOWN` - D-pad down (Android TV)
- `DPAD_LEFT` - D-pad left (Android TV)
- `DPAD_RIGHT` - D-pad right (Android TV)

**Response:**
```json
{
  "success": true,
  "message": "Pressed button: HOME"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing button or failed to press
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to press button

---

#### List UI Elements

Get a list of all accessible UI elements on the current screen.

**Request:**
```http
GET /api/devices/:deviceId/elements
```

**Parameters:**
- `deviceId` (path) - Device identifier

**Response:**
```json
{
  "elements": [
    {
      "type": "Button",
      "text": "Submit",
      "label": "Submit Button",
      "coordinates": {
        "x": 540,
        "y": 1200,
        "width": 200,
        "height": 80
      },
      "focused": false
    },
    {
      "type": "TextField",
      "text": "",
      "label": "Username",
      "value": "",
      "coordinates": {
        "x": 100,
        "y": 800,
        "width": 880,
        "height": 60
      },
      "focused": true
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Failed to list elements
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to list elements

---

### Script Execution

#### Execute Script

Execute an automation script with multiple commands.

**Request:**
```http
POST /api/devices/:deviceId/script
Content-Type: application/json

{
  "script": "mobile_launch_app(\"com.android.settings\")\nmobile_take_screenshot()\nmobile_click_on_screen_at_coordinates(100, 200)"
}
```

**Parameters:**
- `deviceId` (path) - Device identifier
- `script` (body) - Script content with commands (one per line)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "command": "mobile_launch_app",
      "params": ["com.android.settings"],
      "success": true,
      "message": "App launched successfully"
    },
    {
      "command": "mobile_take_screenshot",
      "params": [],
      "success": true,
      "data": "iVBORw0KGgoAAAANSUhEUgAA..."
    },
    {
      "command": "mobile_click_on_screen_at_coordinates",
      "params": [100, 200],
      "success": true,
      "message": "Tapped at coordinates (100, 200)"
    }
  ]
}
```

**Error Response** (if a command fails):
```json
{
  "success": false,
  "results": [
    {
      "command": "mobile_launch_app",
      "params": ["com.invalid.app"],
      "success": false,
      "message": "App not found"
    }
  ],
  "error": "Script execution stopped at command 1: App not found"
}
```

**Status Codes:**
- `200 OK` - Success (all commands executed)
- `400 Bad Request` - Missing script or script execution failed
- `404 Not Found` - Device not found
- `500 Internal Server Error` - Failed to execute script

---

### Health Check

#### Check Server Health

Check if the server is running and responsive.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1704067200000
}
```

**Status Codes:**
- `200 OK` - Server is healthy

**Note:** This endpoint does not require authentication.

---

## WebSocket Protocol

WebSocket URL: `ws://localhost:3001` (configurable via `WEB_WS_PORT`)

The WebSocket connection provides real-time communication for screenshot streaming and event notifications.

### WebSocket Connection

#### Connect

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected to Mobile MCP Web Interface');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from Mobile MCP Web Interface');
};
```

#### Connect with Authentication

If authentication is enabled, include the token in the query string:

```javascript
const token = 'your-auth-token';
const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
```

#### Connection Confirmation

Upon successful connection, the server sends a confirmation message:

```json
{
  "type": "connection_status",
  "data": {
    "clientId": "client-abc123",
    "status": "connected",
    "message": "Connected to Mobile MCP Web Interface"
  }
}
```

---

### Message Format

All WebSocket messages use JSON format.

#### Client → Server Messages

```typescript
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'command';
  payload: any;
}
```

#### Server → Client Events

```typescript
interface WebSocketEvent {
  type: 'screenshot' | 'device_connected' | 'device_disconnected' | 'command_result' | 'connection_status';
  data: any;
}
```

---

### Subscriptions

Clients can subscribe to different types of real-time updates.

#### Subscribe to Screenshot Updates

Receive automatic screenshot updates at a specified interval.

**Request:**
```json
{
  "type": "subscribe",
  "payload": {
    "type": "screenshot",
    "deviceId": "emulator-5554",
    "interval": 1000
  }
}
```

**Parameters:**
- `type` - "screenshot"
- `deviceId` - Device identifier
- `interval` - Update interval in milliseconds (default: 1000)

**Response Events:**
```json
{
  "type": "screenshot",
  "data": {
    "deviceId": "emulator-5554",
    "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
    "width": 1080,
    "height": 2400,
    "scale": 2.75,
    "timestamp": 1704067200000
  }
}
```

---

#### Subscribe to Device Events

Receive notifications when devices connect or disconnect.

**Request:**
```json
{
  "type": "subscribe",
  "payload": {
    "type": "device_events"
  }
}
```

**Response Events:**

Device Connected:
```json
{
  "type": "device_connected",
  "data": {
    "id": "emulator-5554",
    "name": "Pixel 6 API 33",
    "platform": "android",
    "type": "emulator",
    "status": "connected"
  }
}
```

Device Disconnected:
```json
{
  "type": "device_disconnected",
  "data": {
    "id": "emulator-5554",
    "name": "Pixel 6 API 33"
  }
}
```

---

#### Subscribe to Command Results

Receive real-time notifications of command execution results.

**Request:**
```json
{
  "type": "subscribe",
  "payload": {
    "type": "command_results"
  }
}
```

**Response Events:**
```json
{
  "type": "command_result",
  "data": {
    "deviceId": "emulator-5554",
    "command": "tap",
    "params": { "x": 540, "y": 1200 },
    "success": true,
    "message": "Tapped at coordinates (540, 1200)",
    "timestamp": 1704067200000
  }
}
```

---

#### Unsubscribe

Stop receiving updates for a subscription type.

**Request:**
```json
{
  "type": "unsubscribe",
  "payload": {
    "type": "screenshot"
  }
}
```

**Subscription Types:**
- `screenshot` - Screenshot updates
- `device_events` - Device connect/disconnect events
- `command_results` - Command execution results

---

### Events

#### Screenshot Event

Sent when a new screenshot is available (if subscribed).

```json
{
  "type": "screenshot",
  "data": {
    "deviceId": "emulator-5554",
    "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
    "width": 1080,
    "height": 2400,
    "scale": 2.75,
    "timestamp": 1704067200000
  }
}
```

---

#### Device Connected Event

Sent when a new device is detected (if subscribed to device_events).

```json
{
  "type": "device_connected",
  "data": {
    "id": "iPhone-15-Pro",
    "name": "iPhone 15 Pro",
    "platform": "ios",
    "type": "simulator",
    "status": "connected",
    "screenSize": {
      "width": 1179,
      "height": 2556,
      "scale": 3.0
    }
  }
}
```

---

#### Device Disconnected Event

Sent when a device is disconnected (if subscribed to device_events).

```json
{
  "type": "device_disconnected",
  "data": {
    "id": "emulator-5554",
    "name": "Pixel 6 API 33",
    "timestamp": 1704067200000
  }
}
```

---

#### Command Result Event

Sent when a command completes execution (if subscribed to command_results).

```json
{
  "type": "command_result",
  "data": {
    "deviceId": "emulator-5554",
    "command": "mobile_launch_app",
    "params": { "packageName": "com.android.settings" },
    "success": true,
    "message": "App launched successfully",
    "timestamp": 1704067200000
  }
}
```

---

#### Connection Status Event

Sent when the WebSocket connection status changes.

```json
{
  "type": "connection_status",
  "data": {
    "clientId": "client-abc123",
    "status": "connected",
    "message": "Connected to Mobile MCP Web Interface"
  }
}
```

---

## Error Handling

### HTTP Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters or ActionableError
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - CORS policy violation
- `404 Not Found` - Device or resource not found
- `500 Internal Server Error` - Server error

### Device Not Found Response

When a device is not found, the response includes available devices:

```json
{
  "error": "Device not found",
  "message": "Device with ID 'invalid-device' not found",
  "availableDevices": [
    { "id": "emulator-5554", "name": "Pixel 6 API 33" },
    { "id": "iPhone-15-Pro", "name": "iPhone 15 Pro" }
  ]
}
```

### WebSocket Errors

WebSocket errors are logged to the browser console. Common errors:

- **Connection Refused**: Server is not running or wrong port
- **Authentication Failed**: Invalid or missing token
- **Connection Closed**: Server stopped or network issue

### Automatic Reconnection

The WebSocket client implements automatic reconnection with exponential backoff:

- Retry intervals: 1s, 2s, 4s, 8s, 16s
- Maximum retry attempts: 5
- After max retries, manual reconnection required

---

## Examples

### Complete Workflow Example

```javascript
// 1. Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = async () => {
  // 2. Subscribe to screenshot updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: {
      type: 'screenshot',
      deviceId: 'emulator-5554',
      interval: 1000
    }
  }));

  // 3. Subscribe to device events
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { type: 'device_events' }
  }));

  // 4. Get device list via REST API
  const devicesResponse = await fetch('http://localhost:3001/api/devices');
  const { devices } = await devicesResponse.json();
  console.log('Available devices:', devices);

  // 5. Launch an app
  await fetch('http://localhost:3001/api/devices/emulator-5554/apps/com.android.settings/launch', {
    method: 'POST'
  });

  // 6. Wait a moment for app to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 7. Tap on screen
  await fetch('http://localhost:3001/api/devices/emulator-5554/tap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: 540, y: 1200 })
  });

  // 8. Type text
  await fetch('http://localhost:3001/api/devices/emulator-5554/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello World', submit: true })
  });
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'screenshot') {
    // Update UI with new screenshot
    const img = document.getElementById('device-screen');
    img.src = `data:image/png;base64,${message.data.screenshot}`;
  } else if (message.type === 'device_connected') {
    console.log('New device connected:', message.data.name);
  } else if (message.type === 'device_disconnected') {
    console.log('Device disconnected:', message.data.name);
  }
};
```

### Script Execution Example

```javascript
const script = `
mobile_launch_app("com.android.settings")
mobile_take_screenshot()
mobile_click_on_screen_at_coordinates(540, 1200)
mobile_swipe_on_screen("down")
mobile_type_keys("Test Input", true)
mobile_press_button("HOME")
`;

const response = await fetch('http://localhost:3001/api/devices/emulator-5554/script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ script })
});

const result = await response.json();
console.log('Script execution results:', result.results);
```

### Authentication Example

```javascript
const token = 'your-auth-token';

// REST API with authentication
const response = await fetch('http://localhost:3001/api/devices', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// WebSocket with authentication
const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production deployments, consider:

- Implementing rate limiting middleware
- Throttling screenshot updates
- Limiting concurrent WebSocket connections
- Setting maximum script execution time

---

## Versioning

API Version: 1.0.0

The API follows semantic versioning. Breaking changes will increment the major version.

---

## Support

For issues, questions, or feature requests:

- 📖 [Documentation](https://github.com/mobile-next/mobile-mcp/wiki)
- 💬 [Slack Community](http://mobilenexthq.com/join-slack)
- 🐛 [Issue Tracker](https://github.com/mobile-next/mobile-mcp/issues)

---

## Related Documentation

- [Web Interface README](./WEB_INTERFACE_README.md) - Setup and usage guide
- [Main README](../README.md) - Mobile MCP overview
- [Wiki](https://github.com/mobile-next/mobile-mcp/wiki) - Comprehensive guides
