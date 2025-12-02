import type { DeviceInfo } from '../types';

interface DevicePanelProps {
  devices: DeviceInfo[];
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string) => void;
  isLoading?: boolean;
}

export function DevicePanel({
  devices,
  selectedDevice,
  onSelectDevice,
  isLoading = false,
}: DevicePanelProps) {
  if (isLoading) {
    return (
      <div className="card card-body h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading devices...</p>
        </div>
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="card card-body h-96 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 text-lg font-medium mb-2">No devices available</p>
          <p className="text-gray-500 text-sm">
            Connect a device or start a simulator/emulator to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Available Devices</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{devices.length} device{devices.length !== 1 ? 's' : ''} found</p>
      </div>
      <div className="card-body space-y-2 sm:space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
              selectedDevice === device.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
            }`}
            onClick={() => onSelectDevice(device.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{device.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                  <span className="badge badge-gray capitalize text-xs">{device.platform}</span>
                  <span className="badge badge-gray capitalize text-xs">{device.type}</span>
                  <span className={`badge ${device.status === 'connected' ? 'badge-success' : 'badge-gray'} capitalize text-xs`}>
                    {device.status}
                  </span>
                </div>
              </div>
              <div
                className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ml-2 sm:ml-3 flex-shrink-0 transition-all duration-300 ${
                  device.status === 'connected' 
                    ? 'bg-success-500 shadow-success-500/50 shadow-md animate-pulse-slow' 
                    : 'bg-gray-400'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
