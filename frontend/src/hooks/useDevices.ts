import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useAppStore } from '../store';
import type { DeviceInfo } from '../types';

export const useDevices = () => {
  const { addToast } = useAppStore();
  const previousDevices = useRef<DeviceInfo[]>([]);

  const query = useQuery<DeviceInfo[], Error>({
    queryKey: ['devices'],
    queryFn: () => apiService.getDevices(),
    refetchInterval: 3000, // Refetch every 3 seconds to detect device changes
    staleTime: 2000,
  });

  // Show toast notifications for device connection/disconnection
  useEffect(() => {
    if (query.data && previousDevices.current.length > 0) {
      const currentIds = new Set(query.data.map(d => d.id));
      const previousIds = new Set(previousDevices.current.map(d => d.id));

      // Check for newly connected devices
      query.data.forEach(device => {
        if (!previousIds.has(device.id)) {
          addToast({
            type: 'info',
            message: 'Device connected',
            details: `${device.name} (${device.platform})`,
            duration: 4000,
          });
        }
      });

      // Check for disconnected devices
      previousDevices.current.forEach(device => {
        if (!currentIds.has(device.id)) {
          addToast({
            type: 'warning',
            message: 'Device disconnected',
            details: `${device.name} (${device.platform})`,
            duration: 4000,
          });
        }
      });
    }

    if (query.data) {
      previousDevices.current = query.data;
    }
  }, [query.data, addToast]);

  return query;
};

export const useDevice = (deviceId: string | null) => {
  return useQuery<DeviceInfo, Error>({
    queryKey: ['device', deviceId],
    queryFn: () => apiService.getDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 5000,
  });
};

export const useScreenshot = (deviceId: string | null, enabled: boolean = true) => {
  return useQuery<string, Error>({
    queryKey: ['screenshot', deviceId],
    queryFn: () => apiService.getScreenshot(deviceId!),
    enabled: !!deviceId && enabled,
    refetchInterval: 1000, // Default 1 second refresh
    staleTime: 0,
  });
};

export const useApps = (deviceId: string | null) => {
  return useQuery({
    queryKey: ['apps', deviceId],
    queryFn: () => apiService.getApps(deviceId!),
    enabled: !!deviceId,
    staleTime: 10000,
  });
};

export const useElements = (deviceId: string | null) => {
  return useQuery({
    queryKey: ['elements', deviceId],
    queryFn: () => apiService.getElements(deviceId!),
    enabled: !!deviceId,
    staleTime: 5000,
  });
};

export const useTapMutation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ deviceId, x, y }: { deviceId: string; x: number; y: number }) =>
      apiService.tap(deviceId, x, y),
    onSuccess: (_, variables) => {
      // Invalidate screenshot to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['screenshot', variables.deviceId] });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        message: 'Failed to tap',
        details: error.message,
        duration: 4000,
      });
    },
  });
};

export const useLaunchAppMutation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ deviceId, packageName }: { deviceId: string; packageName: string }) =>
      apiService.launchApp(deviceId, packageName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apps', variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ['screenshot', variables.deviceId] });
      addToast({
        type: 'success',
        message: 'App launched successfully',
        details: variables.packageName,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        message: 'Failed to launch app',
        details: error.message,
        duration: 5000,
      });
    },
  });
};

export const useTerminateAppMutation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ deviceId, packageName }: { deviceId: string; packageName: string }) =>
      apiService.terminateApp(deviceId, packageName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apps', variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ['screenshot', variables.deviceId] });
      addToast({
        type: 'success',
        message: 'App terminated successfully',
        details: variables.packageName,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        message: 'Failed to terminate app',
        details: error.message,
        duration: 5000,
      });
    },
  });
};

export const usePressButtonMutation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({ deviceId, button }: { deviceId: string; button: string }) =>
      apiService.pressButton(deviceId, button),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['screenshot', variables.deviceId] });
    },
    onError: (error: Error, variables) => {
      addToast({
        type: 'error',
        message: 'Failed to press button',
        details: `${variables.button}: ${error.message}`,
        duration: 4000,
      });
    },
  });
};

export const useSendKeysMutation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  return useMutation({
    mutationFn: ({
      deviceId,
      text,
      submit,
    }: {
      deviceId: string;
      text: string;
      submit: boolean;
    }) => apiService.sendKeys(deviceId, text, submit),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['screenshot', variables.deviceId] });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        message: 'Failed to send text',
        details: error.message,
        duration: 4000,
      });
    },
  });
};
