// Environment configuration
const getEnvVar = (key: string, defaultValue: string): string => {
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  return defaultValue;
};

export const config = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001'),
  wsBaseUrl: getEnvVar('VITE_WS_BASE_URL', 'ws://localhost:3001'),
};
