import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { SessionService } from '../services/session';

export function useSession() {
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restorationError, setRestorationError] = useState<string | null>(null);
  
  const {
    selectedDevice,
    refreshInterval,
    openPanels,
    setSelectedDevice,
    setRefreshInterval,
    setOpenPanels,
  } = useAppStore();

  // Check for saved session on mount and offer to restore
  useEffect(() => {
    if (SessionService.hasSession()) {
      setShowRestorePrompt(true);
    }
  }, []);

  // Auto-save session when state changes
  useEffect(() => {
    const saveCurrentSession = () => {
      try {
        SessionService.saveSession({
          selectedDevice,
          refreshInterval,
          openPanels,
        });
      } catch (error) {
        console.error('Failed to auto-save session:', error);
      }
    };

    // Debounce the save to avoid excessive writes
    const timeoutId = setTimeout(saveCurrentSession, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedDevice, refreshInterval, openPanels]);

  // Auto-save on browser close/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        SessionService.saveSession({
          selectedDevice,
          refreshInterval,
          openPanels,
        });
      } catch (error) {
        console.error('Failed to save session on unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedDevice, refreshInterval, openPanels]);

  const restoreSession = () => {
    try {
      const sessionData = SessionService.loadSession();
      
      if (!sessionData) {
        setRestorationError('No session data found');
        setShowRestorePrompt(false);
        return;
      }

      // Restore the session state
      if (sessionData.selectedDevice) {
        setSelectedDevice(sessionData.selectedDevice);
      }
      setRefreshInterval(sessionData.refreshInterval);
      setOpenPanels(sessionData.openPanels);

      setShowRestorePrompt(false);
      setRestorationError(null);
    } catch (error) {
      console.error('Failed to restore session:', error);
      setRestorationError(
        error instanceof Error ? error.message : 'Failed to restore session'
      );
      setShowRestorePrompt(false);
    }
  };

  const dismissRestorePrompt = () => {
    setShowRestorePrompt(false);
    SessionService.clearSession();
  };

  const clearError = () => {
    setRestorationError(null);
  };

  return {
    showRestorePrompt,
    restorationError,
    restoreSession,
    dismissRestorePrompt,
    clearError,
  };
}
