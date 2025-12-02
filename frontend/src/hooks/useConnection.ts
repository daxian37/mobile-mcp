import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { wsService } from '../services/websocket';

export const useConnection = () => {
  const { connectionStatus, setConnectionStatus, addToast } = useAppStore();
  const previousStatus = useRef<string>(connectionStatus);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setConnectionStatus('connecting');
        await wsService.connect();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();

    // Check connection status periodically
    const intervalId = setInterval(() => {
      const status = wsService.getConnectionStatus();
      setConnectionStatus(status);
    }, 1000);

    return () => {
      clearInterval(intervalId);
      wsService.disconnect();
    };
  }, [setConnectionStatus]);

  // Show toast notifications for connection status changes
  useEffect(() => {
    if (previousStatus.current !== connectionStatus) {
      if (connectionStatus === 'connected' && previousStatus.current === 'connecting') {
        addToast({
          type: 'success',
          message: 'Connected to server',
          duration: 3000,
        });
      } else if (connectionStatus === 'disconnected' && previousStatus.current === 'connected') {
        addToast({
          type: 'error',
          message: 'Connection lost',
          details: 'Attempting to reconnect...',
          duration: 5000,
        });
      }
      previousStatus.current = connectionStatus;
    }
  }, [connectionStatus, addToast]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
  };
};
