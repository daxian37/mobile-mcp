# Mobile MCP Web Interface - Frontend

This is the frontend application for the Mobile MCP Web Interface, built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Query** - Server state management
- **Zustand** - Client state management

## Project Structure

```
frontend/
├── src/
│   ├── config/          # Configuration (environment variables)
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and WebSocket services
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Configuration

Create a `.env` file in the frontend directory to configure the API and WebSocket URLs:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_BASE_URL=ws://localhost:3001
```

## Features Implemented

### Service Layer

- **ApiService**: REST API client with retry logic for all device operations
- **WebSocketService**: WebSocket client with automatic reconnection and exponential backoff

### State Management

- **Zustand Store**: Global application state (device selection, connection status, UI state)
- **React Query**: Server state management with automatic caching and refetching

### Custom Hooks

- **useConnection**: Manages WebSocket connection and status
- **useDevices**: Fetches and manages device list
- **useDevice**: Fetches individual device information
- **useScreenshot**: Fetches device screenshots with auto-refresh
- **useApps**: Fetches installed apps
- **useElements**: Fetches UI elements
- Various mutation hooks for device interactions

## Next Steps

The following components need to be implemented:

1. DevicePanel - Device list and selection
2. ScreenViewer - Screenshot display and interaction
3. ControlPanel - Virtual buttons
4. AppManager - App management
5. ScriptEditor - Script execution
6. ElementList - UI element inspection
7. Session management - Save/restore sessions
