import { useState } from 'react';
import type { DeviceInfo } from '../types';
import { apiService } from '../services/api';

interface ControlPanelProps {
  device: DeviceInfo;
  onScreenshotRefresh?: () => void;
}

type ButtonType = 'HOME' | 'BACK' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'ENTER' | 
                  'DPAD_CENTER' | 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT';

interface ButtonConfig {
  type: ButtonType;
  label: string;
  platforms?: ('ios' | 'android')[];
  deviceTypes?: string[];
}

export function ControlPanel({ device, onScreenshotRefresh }: ControlPanelProps) {
  const [loadingButtons, setLoadingButtons] = useState<Set<ButtonType>>(new Set());

  // Define button configurations
  const commonButtons: ButtonConfig[] = [
    { type: 'HOME', label: 'Home' },
    { type: 'VOLUME_UP', label: 'Volume Up' },
    { type: 'VOLUME_DOWN', label: 'Volume Down' },
    { type: 'ENTER', label: 'Enter' },
  ];

  const androidOnlyButtons: ButtonConfig[] = [
    { type: 'BACK', label: 'Back', platforms: ['android'] },
  ];

  const androidTvButtons: ButtonConfig[] = [
    { type: 'DPAD_CENTER', label: 'Center', platforms: ['android'] },
    { type: 'DPAD_UP', label: 'Up', platforms: ['android'] },
    { type: 'DPAD_DOWN', label: 'Down', platforms: ['android'] },
    { type: 'DPAD_LEFT', label: 'Left', platforms: ['android'] },
    { type: 'DPAD_RIGHT', label: 'Right', platforms: ['android'] },
  ];

  const handleButtonPress = async (button: ButtonType) => {
    setLoadingButtons(prev => new Set(prev).add(button));
    
    try {
      await apiService.pressButton(device.id, button);
      
      // Trigger screenshot refresh after button press
      if (onScreenshotRefresh) {
        onScreenshotRefresh();
      }
    } catch (error) {
      console.error(`Failed to press button ${button}:`, error);
    } finally {
      setLoadingButtons(prev => {
        const next = new Set(prev);
        next.delete(button);
        return next;
      });
    }
  };

  const shouldShowButton = (config: ButtonConfig): boolean => {
    // Check platform restriction
    if (config.platforms && !config.platforms.includes(device.platform)) {
      return false;
    }
    return true;
  };

  const isAndroidTV = device.platform === 'android' && device.type === 'emulator' && 
                      (device.name.toLowerCase().includes('tv') || device.name.toLowerCase().includes('android tv'));

  const renderButton = (config: ButtonConfig) => {
    if (!shouldShowButton(config)) {
      return null;
    }

    const isLoading = loadingButtons.has(config.type);

    return (
      <button
        key={config.type}
        onClick={() => handleButtonPress(config.type)}
        disabled={isLoading}
        className={`btn-primary relative ${isLoading ? 'opacity-75' : ''}`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="spinner h-4 w-4 mr-2"></span>
            Loading...
          </span>
        ) : (
          config.label
        )}
      </button>
    );
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Control Panel</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Device control buttons</p>
      </div>
      <div className="card-body space-y-4 sm:space-y-6">
        {/* Common buttons */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
            <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Common Controls
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {commonButtons.map(renderButton)}
          </div>
        </div>

        {/* Android-only buttons */}
        {device.platform === 'android' && (
          <div className="pt-3 sm:pt-4 border-t border-gray-200">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
              <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2 text-success-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.43 11.43 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 001 18h22a10.81 10.81 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
              </svg>
              Android Controls
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {androidOnlyButtons.map(renderButton)}
            </div>
          </div>
        )}

        {/* Android TV DPAD buttons */}
        {isAndroidTV && (
          <div className="pt-3 sm:pt-4 border-t border-gray-200">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
              <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              D-Pad Controls
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div></div>
              {renderButton(androidTvButtons[1])} {/* UP */}
              <div></div>
              {renderButton(androidTvButtons[3])} {/* LEFT */}
              {renderButton(androidTvButtons[0])} {/* CENTER */}
              {renderButton(androidTvButtons[4])} {/* RIGHT */}
              <div></div>
              {renderButton(androidTvButtons[2])} {/* DOWN */}
              <div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
