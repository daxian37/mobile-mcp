import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { AppInfo } from '../types';

interface AppManagerProps {
  deviceId: string;
}

export function AppManager({ deviceId }: AppManagerProps) {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string | null>(null);

  useEffect(() => {
    if (deviceId) {
      loadApps();
    }
  }, [deviceId]);

  const loadApps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const appList = await apiService.getApps(deviceId);
      setApps(appList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async (packageName: string) => {
    setActionInProgress(packageName);
    setError(null);
    try {
      await apiService.launchApp(deviceId, packageName);
      await loadApps(); // Refresh app list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch app');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTerminate = async (packageName: string) => {
    setActionInProgress(packageName);
    setError(null);
    try {
      await apiService.terminateApp(deviceId, packageName);
      await loadApps(); // Refresh app list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate app');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUninstall = async (packageName: string) => {
    setActionInProgress(packageName);
    setError(null);
    try {
      await apiService.uninstallApp(deviceId, packageName);
      setShowUninstallConfirm(null);
      await loadApps(); // Refresh app list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall app');
    } finally {
      setActionInProgress(null);
    }
  };

  const confirmUninstall = (packageName: string) => {
    setShowUninstallConfirm(packageName);
  };

  const cancelUninstall = () => {
    setShowUninstallConfirm(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.apk', '.ipa', '.app', '.zip'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Please upload one of: ${validExtensions.join(', ')}`);
      event.target.value = ''; // Reset file input
      return;
    }

    setIsInstalling(true);
    setInstallProgress('Uploading...');
    setError(null);

    try {
      await apiService.installApp(deviceId, file);
      setInstallProgress('Installation complete');
      setTimeout(() => {
        setInstallProgress(null);
        loadApps(); // Refresh app list
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install app');
      setInstallProgress(null);
    } finally {
      setIsInstalling(false);
      event.target.value = ''; // Reset file input
    }
  };

  if (isLoading) {
    return (
      <div className="card animate-fade-in">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">App Manager</h2>
        </div>
        <div className="card-body flex items-center justify-center h-64">
          <div className="text-center">
            <div className="spinner h-12 w-12 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading apps...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-fade-in">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">App Manager</h2>
        </div>
        <div className="card-body">
          <div className="alert-danger">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-danger-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-danger-900">Error Loading Apps</p>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
                <button
                  onClick={loadApps}
                  className="btn-danger btn-sm mt-3"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!apps || apps.length === 0) {
    return (
      <div className="card animate-fade-in">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">App Manager</h2>
        </div>
        <div className="card-body h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-600 text-lg font-semibold">No apps found on this device</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">App Manager</h2>
          <p className="text-sm text-gray-500 mt-1">{apps.length} app{apps.length !== 1 ? 's' : ''} installed</p>
        </div>
        <div className="flex gap-2">
          <label className={`btn-success btn-sm cursor-pointer ${isInstalling ? 'opacity-75 cursor-not-allowed' : ''}`}>
            {isInstalling ? (
              <span className="flex items-center">
                <span className="spinner h-3 w-3 mr-2"></span>
                Installing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Install App
              </span>
            )}
            <input
              type="file"
              accept=".apk,.ipa,.app,.zip"
              onChange={handleFileUpload}
              disabled={isInstalling}
              className="hidden"
            />
          </label>
          <button
            onClick={loadApps}
            className="btn-secondary btn-sm"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Installation Progress */}
        {installProgress && (
          <div className="alert-success mb-4 animate-slide-in">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-success-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-success-900">{installProgress}</p>
            </div>
          </div>
        )}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {apps.map((app) => (
            <div
              key={app.packageName}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{app.appName}</p>
                  <p className="text-sm text-gray-600 truncate mt-1">{app.packageName}</p>
                  {app.isRunning && (
                    <span className="badge badge-success mt-2 inline-flex items-center">
                      <span className="w-2 h-2 bg-success-500 rounded-full mr-1.5 animate-pulse"></span>
                      Running
                    </span>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleLaunch(app.packageName)}
                    className="btn-primary btn-sm"
                    disabled={actionInProgress === app.packageName}
                  >
                    {actionInProgress === app.packageName ? (
                      <span className="flex items-center">
                        <span className="spinner h-3 w-3 mr-1"></span>
                        Launching...
                      </span>
                    ) : (
                      'Launch'
                    )}
                  </button>
                  <button
                    onClick={() => handleTerminate(app.packageName)}
                    className="btn-warning btn-sm"
                    disabled={actionInProgress === app.packageName}
                  >
                    {actionInProgress === app.packageName ? (
                      <span className="flex items-center">
                        <span className="spinner h-3 w-3 mr-1"></span>
                        Terminating...
                      </span>
                    ) : (
                      'Terminate'
                    )}
                  </button>
                  <button
                    onClick={() => confirmUninstall(app.packageName)}
                    className="btn-danger btn-sm"
                    disabled={actionInProgress === app.packageName}
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uninstall Confirmation Dialog */}
      {showUninstallConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-in">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Uninstall</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to uninstall{' '}
                  <span className="font-semibold text-gray-900">{showUninstallConfirm}</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={cancelUninstall}
                className="btn-secondary"
                disabled={actionInProgress === showUninstallConfirm}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUninstall(showUninstallConfirm)}
                className="btn-danger"
                disabled={actionInProgress === showUninstallConfirm}
              >
                {actionInProgress === showUninstallConfirm ? (
                  <span className="flex items-center">
                    <span className="spinner h-4 w-4 mr-2"></span>
                    Uninstalling...
                  </span>
                ) : (
                  'Uninstall'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
