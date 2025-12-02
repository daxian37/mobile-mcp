import { create } from 'zustand';
import type { DeviceInfo, Toast } from '../types';

interface AppState {
  // Device selection
  selectedDevice: string | null;
  setSelectedDevice: (deviceId: string | null) => void;

  // Connection status
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;

  // Screenshot refresh interval (in milliseconds)
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;

  // Open panels
  openPanels: string[];
  togglePanel: (panelId: string) => void;
  setOpenPanels: (panels: string[]) => void;

  // Devices cache
  devices: DeviceInfo[];
  setDevices: (devices: DeviceInfo[]) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Device selection
  selectedDevice: null,
  setSelectedDevice: (deviceId) => set({ selectedDevice: deviceId }),

  // Connection status
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Screenshot refresh interval
  refreshInterval: 1000, // Default 1 second
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),

  // Open panels
  openPanels: [],
  togglePanel: (panelId) =>
    set((state) => ({
      openPanels: state.openPanels.includes(panelId)
        ? state.openPanels.filter((id) => id !== panelId)
        : [...state.openPanels, panelId],
    })),
  setOpenPanels: (panels) => set({ openPanels: panels }),

  // Devices cache
  devices: [],
  setDevices: (devices) => set({ devices }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Toast notifications
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
