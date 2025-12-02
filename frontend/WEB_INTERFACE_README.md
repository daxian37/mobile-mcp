# Mobile MCP Web Interface

A browser-based interface for controlling and automating iOS and Android devices through the Mobile MCP server. Access device screens, execute commands, manage apps, and run automation scripts directly from your web browser.

![Mobile MCP Web Interface](../mobile-mcp.png)

## Features

- 🖥️ **Real-time Device Control** - View and interact with device screens in real-time
- 📱 **Multi-Device Support** - Manage iOS simulators, Android emulators, and real devices
- 🎮 **Interactive Controls** - Tap, swipe, long-press, and use virtual buttons
- 📦 **App Management** - Install, launch, terminate, and uninstall apps
- 🔍 **UI Element Inspector** - View and interact with UI elements on screen
- 📝 **Script Execution** - Run automation scripts with real-time logging
- 💾 **Session Management** - Save and restore your workspace configuration
- 🔄 **Auto-Refresh** - Configurable screenshot refresh intervals
- 🌐 **Browser-Based** - No installation required, works in modern browsers

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Mobile MCP server installed and configured
- At least one iOS simulator, Android emulator, or real device connected

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/mobile-next/mobile-mcp.git
   cd mobile-mcp
   ```

2. **Install dependencies**:
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Build the project**:
   ```bash
   npm run build:web
   ```

### Running the Web Interface

#### Development Mode

Start the web server in development mode with hot-reload:

```bash
# Terminal 1: Start backend server
npm run dev:web

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

The web interface will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- WebSocket: `ws://localhost:3001`

#### Production Mode

Build and run the production version:

```bash
# Build both backend and frontend
npm run build:web

# Start the web server
node lib/web-server.js
```

The web interface will be available at `http://localhost:3000`.

## Configuration

### Environment Variables

Create a `.env` file in the project root to configure the web server:

```env
# HTTP Server Configuration
WEB_HTTP_PORT=3000              # HTTP server port (default: 3000)
WEB_WS_PORT=3001                # WebSocket server port (default: 3001)

# Authentication (optional)
WEB_ENABLE_AUTH=false           # Enable authentication (default: false)
WEB_AUTH_TOKEN=your-secret-token # Auth token when authentication is enabled

# CORS Configuration
WEB_ENABLE_CORS=true            # Enable CORS (default: true)
WEB_CORS_ORIGINS=*              # Allowed origins (comma-separated, * for all)

# HTTPS Configuration (optional)
WEB_ENABLE_HTTPS=false          # Enable HTTPS (default: false)
WEB_SSL_CERT=/path/to/cert.pem  # SSL certificate file path
WEB_SSL_KEY=/path/to/key.pem    # SSL key file path
```

### Frontend Configuration

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_BASE_URL=ws://localhost:3001
```

### Configuration File

Alternatively, create a `server.json` file in the project root:

```json
{
  "httpPort": 3000,
  "wsPort": 3001,
  "enableAuth": false,
  "authToken": "your-secret-token",
  "enableCors": true,
  "corsOrigins": ["http://localhost:3000", "https://yourdomain.com"],
  "enableHttps": false,
  "sslCert": "/path/to/cert.pem",
  "sslKey": "/path/to/key.pem"
}
```

Configuration priority: **Environment Variables > Configuration File > Defaults**

## Usage

### 1. Connect to Devices

When you open the web interface, it automatically connects to the Mobile MCP server and displays all available devices:

- iOS Simulators
- Android Emulators  
- Real iOS devices (via USB)
- Real Android devices (via USB/WiFi)

Select a device from the device panel to start interacting with it.

### 2. View Device Screen

Once a device is selected:
- The device screen appears in the main viewer
- Screenshots refresh automatically (default: 1 second interval)
- Screen dimensions and scale information are displayed
- Click the refresh button for manual updates

### 3. Interact with Device

#### Click/Tap
- Click anywhere on the screenshot to tap that location
- Coordinates are automatically scaled to match the device

#### Long Press
- Click and hold for 500ms to perform a long press

#### Swipe
- Click and drag to perform swipe gestures
- Direction and distance are automatically calculated

#### Virtual Buttons
Use the control panel for common device buttons:
- **HOME** - Return to home screen
- **BACK** - Go back (Android only)
- **VOLUME_UP/DOWN** - Adjust volume
- **ENTER** - Submit/confirm
- **DPAD** buttons - For Android TV devices

#### Text Input
- Type text in the input field
- Press Enter or click Send to input text
- Enable "Submit after send" to automatically press Enter after text

### 4. Manage Apps

The App Manager panel allows you to:

- **View installed apps** - See all apps with package names
- **Launch apps** - Start any installed app
- **Terminate apps** - Stop running apps
- **Install apps** - Upload and install .apk, .ipa, .app, or .zip files
- **Uninstall apps** - Remove apps from the device

### 5. Inspect UI Elements

The Element List panel shows:
- All accessible UI elements on the current screen
- Element type, text, label, and coordinates
- Click an element to highlight it on the screenshot
- Double-click to tap the element

### 6. Run Automation Scripts

The Script Editor allows you to:
- Write automation scripts using Mobile MCP commands
- Save and load scripts
- Execute scripts with real-time logging
- View command results and errors
- Pause, continue, or abort execution

Example script:
```javascript
// Launch Settings app
mobile_launch_app("com.android.settings")

// Wait for app to load
mobile_take_screenshot()

// Tap on a specific location
mobile_click_on_screen_at_coordinates(100, 200)

// Type text
mobile_type_keys("Hello World", true)

// Swipe down
mobile_swipe_on_screen("down")
```

### 7. Save Your Session

The web interface automatically saves your session:
- Selected device
- Screenshot refresh interval
- Open panels and their positions

Sessions are restored when you return to the interface.

## Browser Support

The web interface supports modern browsers:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Older browsers will display a compatibility warning.

## Troubleshooting

### Cannot Connect to Server

**Problem**: "Failed to connect to Mobile MCP server"

**Solutions**:
1. Verify the backend server is running: `npm run dev:web`
2. Check the API URL in `frontend/.env` matches the server port
3. Ensure no firewall is blocking the connection
4. Check server logs for errors

### No Devices Showing

**Problem**: Device list is empty

**Solutions**:
1. Verify devices are connected and recognized by the system:
   - iOS: `xcrun simctl list` or check Xcode
   - Android: `adb devices`
2. Restart the web server
3. Check Mobile MCP server logs for device detection errors

### Screenshot Not Updating

**Problem**: Device screen is frozen or not refreshing

**Solutions**:
1. Click the manual refresh button
2. Check WebSocket connection status (should show "Connected")
3. Verify the device is still connected
4. Try selecting the device again
5. Check browser console for WebSocket errors

### Authentication Errors

**Problem**: "Unauthorized" or "Invalid token" errors

**Solutions**:
1. If authentication is enabled, ensure `WEB_AUTH_TOKEN` is set
2. Include the token in requests:
   - REST API: `Authorization: Bearer your-token`
   - WebSocket: `ws://localhost:3001?token=your-token`
3. Verify the token matches on both client and server

### CORS Errors

**Problem**: "Not allowed by CORS" errors

**Solutions**:
1. Add your frontend origin to `WEB_CORS_ORIGINS`
2. Use `*` to allow all origins (development only)
3. Ensure `WEB_ENABLE_CORS=true`
4. Check browser console for specific CORS error details

### Port Already in Use

**Problem**: "Port 3000 already in use"

**Solutions**:
1. Change the port in `.env`: `WEB_HTTP_PORT=3002`
2. Kill the process using the port:
   ```bash
   # Find process
   lsof -i :3000
   # Kill process
   kill -9 <PID>
   ```

## Architecture

The web interface uses a modern, scalable architecture:

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **React Query** - Server state management
- **Zustand** - Client state management

### Backend
- **Express.js** - HTTP server
- **WebSocket (ws)** - Real-time communication
- **TypeScript** - Type safety
- **Mobile MCP Core** - Device automation

### Communication
- **REST API** - Device management and commands
- **WebSocket** - Real-time screenshot streaming and events

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete REST API and WebSocket documentation.

## Development

### Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── AppManager.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── DevicePanel.tsx
│   │   ├── ElementList.tsx
│   │   ├── ScreenViewer.tsx
│   │   ├── ScriptEditor.tsx
│   │   └── TextInput.tsx
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and WebSocket services
│   ├── store/           # State management
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app component
├── test/                # Test files
└── package.json
```

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build everything
npm run build:web

# Build backend only
npm run build

# Build frontend only
cd frontend
npm run build
```

## Security Considerations

### Authentication

Enable authentication for production deployments:

```env
WEB_ENABLE_AUTH=true
WEB_AUTH_TOKEN=your-strong-random-token
```

Generate a secure token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### HTTPS

Enable HTTPS for secure communication:

```env
WEB_ENABLE_HTTPS=true
WEB_SSL_CERT=/path/to/cert.pem
WEB_SSL_KEY=/path/to/key.pem
```

Generate self-signed certificates for development:
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### CORS

Restrict origins in production:

```env
WEB_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Performance Tips

1. **Adjust Screenshot Refresh Rate**: Lower refresh rates reduce bandwidth and CPU usage
2. **Use WebSocket for Streaming**: More efficient than polling REST API
3. **Close Unused Panels**: Reduces memory usage
4. **Limit Script Complexity**: Break long scripts into smaller chunks
5. **Use Element Selectors**: More reliable than coordinate-based taps

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/mobile-next/mobile-mcp/wiki)
- 💬 [Slack Community](http://mobilenexthq.com/join-slack)
- 🐛 [Issue Tracker](https://github.com/mobile-next/mobile-mcp/issues)
- 📧 Email: support@mobilenexthq.com

## Related Documentation

- [Main README](../README.md) - Mobile MCP overview
- [API Documentation](./API_DOCUMENTATION.md) - REST API and WebSocket reference
- [Quick Start Guide](../QUICK_START.md) - Get started with Mobile MCP
- [Wiki](https://github.com/mobile-next/mobile-mcp/wiki) - Comprehensive guides
