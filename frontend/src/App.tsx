import { useEffect, useState } from 'react';
import { useConnection } from './hooks/useConnection';
import { useDevices } from './hooks/useDevices';
import { useSession } from './hooks/useSession';
import { useAppStore } from './store';
import { DevicePanel } from './components/DevicePanel';
import { ScreenViewer } from './components/ScreenViewer';
import { ControlPanel } from './components/ControlPanel';
import { TextInput } from './components/TextInput';
import { ElementList } from './components/ElementList';
import { ToastContainer } from './components/ToastContainer';
import { checkBrowserCompatibility, getBrowserRequirementsMessage } from './utils/browserCheck';
import type { ElementInfo } from './types';

function App() {
  const { connectionStatus } = useConnection();
  const { data: devices, isLoading, error } = useDevices();
  const { selectedDevice, setSelectedDevice } = useAppStore();
  const {
    showRestorePrompt,
    restorationError,
    restoreSession,
    dismissRestorePrompt,
    clearError,
  } = useSession();
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);
  const [screenshotRefreshTrigger, setScreenshotRefreshTrigger] = useState<number>(0);
  const [highlightedElement, setHighlightedElement] = useState<ElementInfo | null>(null);

  useEffect(() => {
    const browserInfo = checkBrowserCompatibility();
    if (!browserInfo.isSupported) {
      setBrowserWarning(
        `Your browser (${browserInfo.name} ${browserInfo.version}) may not be fully supported. ${getBrowserRequirementsMessage()}`
      );
    }
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-success-500 shadow-success-500/50 shadow-sm';
      case 'connecting':
        return 'bg-warning-500 shadow-warning-500/50 shadow-sm';
      case 'disconnected':
        return 'bg-danger-500 shadow-danger-500/50 shadow-sm';
      default:
        return 'bg-gray-500';
    }
  };

  const handleElementClick = (element: ElementInfo) => {
    setHighlightedElement(element);
  };

  const handleElementDoubleClick = async (element: ElementInfo) => {
    if (!selectedDevice) return;
    
    try {
      const { apiService } = await import('./services/api');
      const centerX = element.coordinates.x + element.coordinates.width / 2;
      const centerY = element.coordinates.y + element.coordinates.height / 2;
      await apiService.tap(selectedDevice, Math.round(centerX), Math.round(centerY));
      
      // Refresh screenshot after tap
      setScreenshotRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to tap element:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer />
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Mobile MCP Web Interface
            </h1>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xs sm:text-sm font-medium text-gray-600 hidden sm:inline">Connection:</span>
              <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-50 border border-gray-200">
                <div className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full transition-all duration-300 ${getConnectionStatusColor()} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 capitalize">
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {showRestorePrompt && (
              <div className="alert-info animate-slide-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-primary-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-primary-900">Restore Previous Session?</h3>
                    <div className="mt-2 text-sm text-primary-700">
                      <p>We found a saved session from your last visit. Would you like to restore it?</p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={restoreSession}
                        className="btn-primary btn-sm"
                      >
                        Restore Session
                      </button>
                      <button
                        onClick={dismissRestorePrompt}
                        className="btn-secondary btn-sm"
                      >
                        Start Fresh
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {restorationError && (
              <div className="alert-warning animate-slide-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-warning-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-warning-900">Session Restoration Failed</h3>
                    <div className="mt-2 text-sm text-warning-700">
                      <p>{restorationError}</p>
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={clearError}
                      className="inline-flex text-warning-500 hover:text-warning-600 transition-colors"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {browserWarning && (
              <div className="alert-warning animate-slide-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-warning-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-warning-900">Browser Compatibility Warning</h3>
                    <div className="mt-2 text-sm text-warning-700">
                      <p className="whitespace-pre-line">{browserWarning}</p>
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setBrowserWarning(null)}
                      className="inline-flex text-warning-500 hover:text-warning-600 transition-colors"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {connectionStatus === 'disconnected' && (
              <div className="alert-danger animate-slide-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-danger-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-danger-900">Connection Failed</h3>
                    <div className="mt-2 text-sm text-danger-700">
                      <p>Unable to connect to the Mobile MCP Server. Please check that the server is running and try refreshing the page.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert-danger animate-slide-in">
                <p className="text-danger-800 font-medium">
                  Error: {error instanceof Error ? error.message : 'Failed to load devices'}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              <div className="xl:col-span-1">
                <DevicePanel
                  devices={devices || []}
                  selectedDevice={selectedDevice}
                  onSelectDevice={setSelectedDevice}
                  isLoading={isLoading}
                />
              </div>
              
              {selectedDevice && (
                <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                  <div className="bg-white rounded-lg shadow min-h-[400px] sm:min-h-[500px]">
                    <ScreenViewer
                      deviceId={selectedDevice}
                      device={devices?.find(d => d.id === selectedDevice)}
                      refreshTrigger={screenshotRefreshTrigger}
                      highlightedElement={highlightedElement}
                    />
                  </div>
                  
                  {/* Control Panel and Text Input */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <ControlPanel
                      device={devices?.find(d => d.id === selectedDevice)!}
                      onScreenshotRefresh={() => setScreenshotRefreshTrigger(prev => prev + 1)}
                    />
                    <TextInput
                      device={devices?.find(d => d.id === selectedDevice)!}
                      onScreenshotRefresh={() => setScreenshotRefreshTrigger(prev => prev + 1)}
                    />
                  </div>

                  {/* Element List */}
                  <div className="h-80 sm:h-96">
                    <ElementList
                      deviceId={selectedDevice}
                      onElementClick={handleElementClick}
                      onElementDoubleClick={handleElementDoubleClick}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
