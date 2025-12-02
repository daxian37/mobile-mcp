import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import { useAppStore } from '../store';
import type { DeviceInfo, ElementInfo } from '../types';

interface ScreenViewerProps {
  deviceId: string;
  device?: DeviceInfo;
  refreshTrigger?: number;
  highlightedElement?: ElementInfo | null;
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({ deviceId, device, refreshTrigger, highlightedElement }) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number; scale: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [clickFeedback, setClickFeedback] = useState<{ x: number; y: number } | null>(null);
  
  const refreshInterval = useAppStore((state) => state.refreshInterval);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const { addToast } = useAppStore();

  // Fetch screenshot from API
  const fetchScreenshot = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      setError(null);
      const screenshotData = await apiService.getScreenshot(deviceId);
      setScreenshot(screenshotData);
      
      // Get device dimensions if available
      if (device?.screenSize) {
        setDimensions(device.screenSize);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load screenshot';
      setError(errorMessage);
      console.error('Screenshot fetch error:', err);
      
      // Show toast notification for screenshot errors
      addToast({
        type: 'error',
        message: 'Failed to load screenshot',
        details: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [deviceId, device, addToast]);

  // Initial fetch
  useEffect(() => {
    fetchScreenshot();
  }, [fetchScreenshot]);

  // Respond to external refresh triggers
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchScreenshot();
    }
  }, [refreshTrigger, fetchScreenshot]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setImageSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  }, []);

  // Calculate device coordinates from click position
  const calculateDeviceCoordinates = useCallback((
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    if (!imgRef.current || !imageSize) return null;

    const rect = imgRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Calculate scale factor between displayed image and actual image
    const displayScale = {
      x: imageSize.width / rect.width,
      y: imageSize.height / rect.height,
    };

    // Convert to actual image coordinates
    const imageX = clickX * displayScale.x;
    const imageY = clickY * displayScale.y;

    // If we have device dimensions, use them; otherwise use image dimensions
    const deviceX = dimensions ? (imageX / imageSize.width) * dimensions.width : imageX;
    const deviceY = dimensions ? (imageY / imageSize.height) * dimensions.height : imageY;

    return {
      x: Math.round(deviceX),
      y: Math.round(deviceY),
    };
  }, [imageSize, dimensions]);

  // Calculate screen coordinates from device coordinates (inverse of above)
  const calculateScreenCoordinates = useCallback((
    deviceX: number,
    deviceY: number,
    deviceWidth: number,
    deviceHeight: number
  ): { x: number; y: number; width: number; height: number } | null => {
    if (!imgRef.current || !imageSize) return null;

    const rect = imgRef.current.getBoundingClientRect();

    // Convert device coordinates to image coordinates
    const imageX = dimensions ? (deviceX / dimensions.width) * imageSize.width : deviceX;
    const imageY = dimensions ? (deviceY / dimensions.height) * imageSize.height : deviceY;
    const imageWidth = dimensions ? (deviceWidth / dimensions.width) * imageSize.width : deviceWidth;
    const imageHeight = dimensions ? (deviceHeight / dimensions.height) * imageSize.height : deviceHeight;

    // Calculate scale factor between displayed image and actual image
    const displayScale = {
      x: rect.width / imageSize.width,
      y: rect.height / imageSize.height,
    };

    // Convert to screen coordinates
    const screenX = imageX * displayScale.x;
    const screenY = imageY * displayScale.y;
    const screenWidth = imageWidth * displayScale.x;
    const screenHeight = imageHeight * displayScale.y;

    return {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: screenHeight,
    };
  }, [imageSize, dimensions]);

  // Show visual feedback at click position
  const showClickFeedback = useCallback((clientX: number, clientY: number) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setClickFeedback({ x, y });
    setTimeout(() => setClickFeedback(null), 500);
  }, []);

  // Handle tap
  const handleTap = useCallback(async (clientX: number, clientY: number) => {
    const coords = calculateDeviceCoordinates(clientX, clientY);
    if (!coords) return;

    try {
      showClickFeedback(clientX, clientY);
      await apiService.tap(deviceId, coords.x, coords.y);
      
      // Refresh screenshot after tap
      setTimeout(() => fetchScreenshot(), 1000);
    } catch (err) {
      console.error('Tap error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send tap command');
    }
  }, [deviceId, calculateDeviceCoordinates, showClickFeedback, fetchScreenshot]);

  // Handle long press
  const handleLongPress = useCallback(async (clientX: number, clientY: number) => {
    const coords = calculateDeviceCoordinates(clientX, clientY);
    if (!coords) return;

    try {
      showClickFeedback(clientX, clientY);
      await apiService.longPress(deviceId, coords.x, coords.y);
      
      // Refresh screenshot after long press
      setTimeout(() => fetchScreenshot(), 1000);
    } catch (err) {
      console.error('Long press error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send long press command');
    }
  }, [deviceId, calculateDeviceCoordinates, showClickFeedback, fetchScreenshot]);

  // Handle swipe
  const handleSwipe = useCallback(async (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Minimum swipe distance threshold (in pixels)
    if (distance < 50) return;

    // Determine direction
    let direction: string;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const startCoords = calculateDeviceCoordinates(startX, startY);
    if (!startCoords) return;

    try {
      await apiService.swipe(deviceId, direction, startCoords.x, startCoords.y);
      
      // Refresh screenshot after swipe
      setTimeout(() => fetchScreenshot(), 1000);
    } catch (err) {
      console.error('Swipe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send swipe command');
    }
  }, [deviceId, calculateDeviceCoordinates, fetchScreenshot]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        handleLongPress(touchStartRef.current.x, touchStartRef.current.y);
        touchStartRef.current = null;
      }
    }, 500);
  }, [handleLongPress]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const deltaX = Math.abs(e.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.clientY - touchStartRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If movement is small, treat as tap
    if (distance < 10) {
      handleTap(e.clientX, e.clientY);
    } else {
      // Otherwise treat as swipe
      handleSwipe(
        touchStartRef.current.x,
        touchStartRef.current.y,
        e.clientX,
        e.clientY
      );
    }

    touchStartRef.current = null;
  }, [handleTap, handleSwipe]);

  const handleMouseLeave = useCallback(() => {
    // Clear long press timer if mouse leaves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        handleLongPress(touchStartRef.current.x, touchStartRef.current.y);
        touchStartRef.current = null;
      }
    }, 500);
  }, [handleLongPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If movement is small, treat as tap
    if (distance < 10) {
      handleTap(touch.clientX, touch.clientY);
    } else {
      // Otherwise treat as swipe
      handleSwipe(
        touchStartRef.current.x,
        touchStartRef.current.y,
        touch.clientX,
        touch.clientY
      );
    }

    touchStartRef.current = null;
  }, [handleTap, handleSwipe]);

  // Subscribe to WebSocket screenshot updates
  useEffect(() => {
    const handleScreenshotUpdate = (data: any) => {
      if (data.deviceId === deviceId && data.screenshot) {
        setScreenshot(data.screenshot);
        setError(null);
      }
    };

    wsService.subscribe('screenshot', handleScreenshotUpdate);

    return () => {
      wsService.unsubscribe('screenshot', handleScreenshotUpdate);
    };
  }, [deviceId]);

  // Auto-refresh with configurable interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchScreenshot();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchScreenshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="screen-viewer flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Device Screen
          </h2>
          {dimensions && (
            <span className="badge badge-primary">
              {dimensions.width} × {dimensions.height}
              {dimensions.scale !== 1 && ` (${dimensions.scale}x)`}
            </span>
          )}
        </div>
        <button
          onClick={fetchScreenshot}
          disabled={loading}
          className="btn-primary btn-sm"
        >
          {loading ? (
            <span className="flex items-center">
              <span className="spinner h-3 w-3 mr-2"></span>
              Refreshing...
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-gradient-to-br from-gray-50 to-gray-100" ref={containerRef}>
        {error && (
          <div className="alert-danger animate-slide-in mb-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-danger-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-danger-900">Screenshot Error</p>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
                <button
                  onClick={fetchScreenshot}
                  className="btn-danger btn-sm mt-3"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && !screenshot && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner h-16 w-16 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading screenshot...</p>
            </div>
          </div>
        )}

        {screenshot && (
          <div className="relative inline-block">
            <img
              ref={imgRef}
              src={`data:image/png;base64,${screenshot}`}
              alt="Device screenshot"
              className="max-w-full h-auto border border-gray-300 shadow-lg cursor-pointer select-none"
              onLoad={handleImageLoad}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              draggable={false}
            />
            
            {clickFeedback && (
              <div
                className="absolute w-10 h-10 rounded-full bg-primary-500 opacity-60 pointer-events-none animate-ping"
                style={{
                  left: clickFeedback.x - 20,
                  top: clickFeedback.y - 20,
                }}
              />
            )}

            {highlightedElement && (() => {
              const coords = calculateScreenCoordinates(
                highlightedElement.coordinates.x,
                highlightedElement.coordinates.y,
                highlightedElement.coordinates.width,
                highlightedElement.coordinates.height
              );
              
              if (!coords) return null;
              
              return (
                <div
                  className="absolute border-2 border-warning-400 bg-warning-400 bg-opacity-20 pointer-events-none animate-pulse shadow-lg"
                  style={{
                    left: coords.x,
                    top: coords.y,
                    width: coords.width,
                    height: coords.height,
                  }}
                />
              );
            })()}

            {loading && screenshot && (
              <div className="absolute top-3 right-3 bg-white bg-opacity-90 rounded-lg shadow-lg px-3 py-2 flex items-center">
                <span className="spinner h-4 w-4 mr-2"></span>
                <span className="text-xs font-medium text-gray-700">Updating...</span>
              </div>
            )}
          </div>
        )}

        {!screenshot && !loading && !error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">No screenshot available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenViewer;
