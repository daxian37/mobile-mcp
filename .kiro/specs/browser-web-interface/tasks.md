# Implementation Plan

- [x] 1. Setup project structure and dependencies
  - Create backend directory structure (src/web-server.ts, src/web-api.ts, src/web-websocket.ts, src/web-device-service.ts, src/web-command-service.ts)
  - Create frontend directory structure using Vite + React + TypeScript
  - Install backend dependencies (express, ws, cors, dotenv)
  - Install frontend dependencies (react, react-dom, tailwindcss, zustand, react-query)
  - Configure TypeScript for both frontend and backend
  - Setup build scripts in package.json
  - _Requirements: 11.1, 11.2_

- [x] 2. Implement backend web server core
  - [x] 2.1 Create WebServerConfig interface and WebServer class
    - Implement configuration loading from environment variables and config file
    - Add validation for required configuration fields
    - Support HTTP and HTTPS modes
    - _Requirements: 12.1, 12.2, 12.5_
  
  - [x] 2.2 Implement Express HTTP server setup
    - Configure Express middleware (cors, json parser, static files)
    - Setup CORS with configurable origins
    - Add authentication middleware when enabled
    - Add error handling middleware
    - _Requirements: 12.3, 12.4_
  
  - [x] 2.3 Implement WebSocket server setup
    - Create WebSocket server on configured port
    - Handle connection and disconnection events
    - Implement message routing
    - Add authentication for WebSocket connections
    - _Requirements: 11.2, 11.4_
  
  - [x] 2.4 Write property test for configuration loading
    - **Property 41: Authentication enforcement**
    - **Validates: Requirements 12.3**
  
  - [x] 2.5 Write property test for CORS enforcement
    - **Property 42: CORS enforcement**
    - **Validates: Requirements 12.4**

- [x] 3. Implement Device Service
  - [x] 3.1 Create DeviceService class with device listing
    - Integrate with existing SimctlManager, AndroidDeviceManager, and IosManager
    - Implement listDevices() method returning DeviceInfo array
    - Add device status tracking (connected/disconnected)
    - _Requirements: 2.1, 2.2_
  
  - [x] 3.2 Implement device change subscription
    - Add polling mechanism to detect device changes
    - Implement callback notification system
    - Emit WebSocket events on device connect/disconnect
    - _Requirements: 2.3, 2.4_
  
  - [x] 3.3 Write property test for device list completeness
    - **Property 3: Device list completeness**
    - **Validates: Requirements 2.1**
  
  - [x] 3.4 Write property test for device information completeness
    - **Property 4: Device information completeness**
    - **Validates: Requirements 2.2**
  
  - [x] 3.5 Write property test for device update timing
    - **Property 5: Device connection update timing**
    - **Validates: Requirements 2.3**

- [x] 4. Implement Command Service
  - [x] 4.1 Create CommandService class with basic command execution
    - Implement executeCommand() method
    - Integrate with Robot interface (tap, swipe, sendKeys, pressButton)
    - Add error handling for ActionableError
    - Return CommandResult with success/error status
    - _Requirements: 4.1, 4.2, 5.2, 6.2_
  
  - [x] 4.2 Implement script execution
    - Parse script into individual commands
    - Execute commands sequentially
    - Track execution progress
    - Stop on first error
    - Return array of CommandResult
    - _Requirements: 9.3, 9.4, 9.5_
  
  - [x] 4.3 Write property test for coordinate mapping
    - **Property 11: Click coordinate mapping**
    - **Validates: Requirements 4.1**
  
  - [x] 4.4 Write property test for scaled coordinate transformation
    - **Property 12: Scaled coordinate transformation**
    - **Validates: Requirements 4.2**
  
  - [x] 4.5 Write property test for script sequential execution
    - **Property 33: Script sequential execution**
    - **Validates: Requirements 9.3**

- [x] 5. Implement REST API endpoints
  - [x] 5.1 Implement device endpoints
    - GET /api/devices - list all devices
    - GET /api/devices/:deviceId - get device info
    - GET /api/devices/:deviceId/screenshot - get screenshot
    - GET /api/devices/:deviceId/orientation - get orientation
    - POST /api/devices/:deviceId/orientation - set orientation
    - _Requirements: 2.1, 3.1, 3.2_
  
  - [x] 5.2 Implement app management endpoints
    - GET /api/devices/:deviceId/apps - list apps
    - POST /api/devices/:deviceId/apps/:packageName/launch - launch app
    - POST /api/devices/:deviceId/apps/:packageName/terminate - terminate app
    - POST /api/devices/:deviceId/apps/install - install app (with file upload)
    - DELETE /api/devices/:deviceId/apps/:packageName - uninstall app
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.3 Implement interaction endpoints
    - POST /api/devices/:deviceId/tap - tap at coordinates
    - POST /api/devices/:deviceId/longpress - long press at coordinates
    - POST /api/devices/:deviceId/swipe - swipe gesture
    - POST /api/devices/:deviceId/keys - send text input
    - POST /api/devices/:deviceId/button - press button
    - GET /api/devices/:deviceId/elements - list UI elements
    - _Requirements: 4.1, 4.4, 4.5, 6.2, 5.2, 7.1_
  
  - [x] 5.4 Implement script execution endpoint
    - POST /api/devices/:deviceId/script - execute script
    - Return execution log with command results
    - _Requirements: 9.3, 9.4_
  
  - [x] 5.5 Write property test for JSON response format
    - **Property 39: JSON response format**
    - **Validates: Requirements 11.3**

- [x] 6. Implement WebSocket real-time features
  - [x] 6.1 Implement screenshot streaming
    - Subscribe to device screenshot updates
    - Compress screenshots before sending
    - Send screenshots at configurable interval
    - Handle screenshot capture errors
    - _Requirements: 3.3, 3.5_
  
  - [x] 6.2 Implement device event notifications
    - Broadcast device connect/disconnect events
    - Send command execution results
    - Handle client subscriptions
    - _Requirements: 2.3, 2.4_
  
  - [x] 6.3 Implement WebSocket reconnection logic
    - Detect connection drops
    - Implement exponential backoff (1s, 2s, 4s, 8s, 16s)
    - Maximum 5 retry attempts
    - Send connection status updates
    - _Requirements: 11.5_
  
  - [x] 6.4 Write property test for WebSocket reconnection backoff
    - **Property 40: WebSocket reconnection with backoff**
    - **Validates: Requirements 11.5**

- [x] 7. Checkpoint - Backend core functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Setup frontend project structure
  - [x] 8.1 Initialize Vite React TypeScript project
    - Create frontend directory
    - Setup Vite configuration
    - Configure TypeScript
    - Setup TailwindCSS
    - Create basic App component
    - _Requirements: 1.1, 1.5_
  
  - [x] 8.2 Create service layer
    - Implement ApiService class with all API methods
    - Implement WebSocketService class
    - Add error handling and retry logic
    - Configure base URLs from environment
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [x] 8.3 Setup state management
    - Configure Zustand store for app state
    - Configure React Query for API state
    - Create hooks for device selection, connection status
    - _Requirements: 1.1, 1.2_

- [x] 9. Implement frontend core components
  - [x] 9.1 Create App component with connection handling
    - Implement connection status indicator
    - Handle WebSocket connection/disconnection
    - Show error messages for connection failures
    - Implement browser compatibility check
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 9.2 Create DevicePanel component
    - Display device list with name, platform, type, status
    - Implement device selection
    - Show empty state when no devices available
    - Auto-update on device changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 9.3 Write property test for connection timing
    - **Property 1: Connection establishment timing**
    - **Validates: Requirements 1.2**
  
  - [x] 9.4 Write property test for browser compatibility warning
    - **Property 2: Browser compatibility warning**
    - **Validates: Requirements 1.4**

- [x] 10. Implement ScreenViewer component
  - [x] 10.1 Create basic screenshot display
    - Fetch and display device screenshot
    - Show dimensions and scale information
    - Implement manual refresh button
    - Handle screenshot loading errors
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 10.2 Implement auto-refresh with WebSocket
    - Subscribe to screenshot updates via WebSocket
    - Implement configurable refresh interval
    - Show loading indicator during refresh
    - _Requirements: 3.3_
  
  - [x] 10.3 Implement click interaction
    - Handle click events on screenshot
    - Calculate device coordinates from click position
    - Account for screenshot scaling
    - Send tap command via API
    - Show visual feedback
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 10.4 Implement gesture detection
    - Detect long press (500ms hold)
    - Detect swipe gestures (direction and distance)
    - Send appropriate commands via API
    - _Requirements: 4.4, 4.5_
  
  - [x] 10.5 Write property test for screen display timing
    - **Property 7: Device screen display timing**
    - **Validates: Requirements 3.1**
  
  - [x] 10.6 Write property test for screenshot metadata
    - **Property 8: Screenshot metadata completeness**
    - **Validates: Requirements 3.2**

- [x] 11. Implement ControlPanel component
  - [x] 11.1 Create button layout
    - Display HOME, VOLUME_UP, VOLUME_DOWN, ENTER buttons
    - Show BACK button for Android only
    - Show DPAD buttons for Android TV only
    - _Requirements: 5.1, 5.5_
  
  - [x] 11.2 Implement button interactions
    - Send button press commands via API
    - Show loading state during execution
    - Re-enable button after completion
    - Trigger screenshot refresh after button press
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 11.3 Write property test for platform-specific buttons
    - **Property 16: Platform-specific button display**
    - **Validates: Requirements 5.1**
  
  - [x] 11.4 Write property test for Android TV buttons
    - **Property 20: Android TV button display**
    - **Validates: Requirements 5.5**

- [x] 12. Implement text input component
  - [x] 12.1 Create text input UI
    - Add text input field
    - Add Send button
    - Add "Submit after send" checkbox
    - Show sending indicator
    - _Requirements: 6.1, 6.3_
  
  - [x] 12.2 Implement text sending logic
    - Buffer input locally
    - Send text on Enter or Send button click
    - Optionally send ENTER command after text
    - Clear input field after sending
    - Trigger screenshot refresh
    - _Requirements: 6.2, 6.4, 6.5_
  
  - [x] 12.3 Write property test for text submission
    - **Property 22: Text submission**
    - **Validates: Requirements 6.2**
  
  - [x] 12.4 Write property test for submit after send
    - **Property 25: Submit after send option**
    - **Validates: Requirements 6.5**

- [x] 13. Implement ElementList component
  - [x] 13.1 Create element list UI
    - Fetch elements via API
    - Display elements in a list with type, text, label, coordinates
    - Show empty state when no elements found
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 13.2 Implement element interactions
    - Highlight element on screenshot when clicked
    - Send tap command on double-click
    - _Requirements: 7.3, 7.4_
  
  - [x] 13.3 Write property test for element information completeness
    - **Property 26: Element information completeness**
    - **Validates: Requirements 7.2**
  
  - [x] 13.4 Write property test for element tap on double-click
    - **Property 28: Element tap on double-click**
    - **Validates: Requirements 7.4**

- [x] 14. Implement AppManager component
  - [x] 14.1 Create app list UI
    - Fetch and display installed apps
    - Show app name and package identifier
    - Add Launch, Terminate, Uninstall buttons for each app
    - _Requirements: 8.1_
  
  - [x] 14.2 Implement app management actions
    - Launch app via API
    - Terminate app via API
    - Show confirmation dialog for uninstall
    - Uninstall app via API
    - _Requirements: 8.2, 8.3, 8.5_
  
  - [x] 14.3 Implement app installation
    - Add file upload UI
    - Validate file type (.apk, .ipa, .app, .zip)
    - Upload and install app via API
    - Show progress indicator
    - _Requirements: 8.4_
  
  - [x] 14.4 Write property test for app launch command
    - **Property 29: App launch command**
    - **Validates: Requirements 8.2**
  
  - [x] 14.5 Write property test for app install command
    - **Property 31: App install command**
    - **Validates: Requirements 8.4**

- [x] 15. Implement ScriptEditor component
  - [x] 15.1 Create script editor UI
    - Integrate Monaco Editor
    - Add script list sidebar
    - Add New/Save/Delete script buttons
    - Add Execute button
    - _Requirements: 9.1_
  
  - [x] 15.2 Implement script execution
    - Send script to backend via API
    - Display execution log in real-time
    - Show command, parameters, and results
    - Highlight failing command on error
    - Add Pause/Continue/Abort controls
    - _Requirements: 9.3, 9.4, 9.5_
  
  - [x] 15.3 Write property test for command logging
    - **Property 34: Command logging**
    - **Validates: Requirements 9.4**
  
  - [x] 15.4 Write property test for script error handling
    - **Property 35: Script error handling**
    - **Validates: Requirements 9.5**

- [x] 16. Implement session management
  - [x] 16.1 Create SessionService
    - Implement saveSession() to localStorage
    - Implement loadSession() from localStorage
    - Store selected device, refresh interval, open panels
    - _Requirements: 10.1, 10.2_
  
  - [x] 16.2 Implement auto-save and restore
    - Auto-save session on browser close
    - Offer to restore session on page load
    - Handle restoration errors gracefully
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [x] 16.3 Write property test for session round-trip
    - **Property 36: Session save completeness**
    - **Property 37: Session restore completeness**
    - **Validates: Requirements 10.1, 10.2**
  
  - [x] 16.4 Write property test for auto-save
    - **Property 38: Auto-save on close**
    - **Validates: Requirements 10.3**

- [x] 17. Implement styling and responsive design
  - [x] 17.1 Apply TailwindCSS styling to all components
    - Create consistent color scheme
    - Add hover and active states
    - Implement loading indicators
    - Add animations for state transitions
    - _Requirements: 1.1_
  
  - [x] 17.2 Make UI responsive
    - Support desktop and tablet layouts
    - Adjust component sizes for different screens
    - Test on minimum supported browser versions
    - _Requirements: 1.5_

- [x] 18. Add error handling and user feedback
  - [x] 18.1 Implement error boundaries
    - Add React error boundaries
    - Show user-friendly error messages
    - Provide recovery options
    - _Requirements: 1.3_
  
  - [x] 18.2 Add toast notifications
    - Show success messages for actions
    - Show error messages with details
    - Show connection status changes
    - _Requirements: 2.4, 3.5_

- [x] 19. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Create documentation
  - [x] 20.1 Write README for web interface
    - Document installation steps
    - Document configuration options
    - Provide usage examples
    - Include screenshots
  
  - [x] 20.2 Write API documentation
    - Document all REST endpoints
    - Document WebSocket message format
    - Provide request/response examples
  
  - [x] 20.3 Update main project README
    - Add web interface section
    - Link to web interface README
    - Update installation instructions
