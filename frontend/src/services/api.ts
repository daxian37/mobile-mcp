import { config } from '../config/env';
import type { DeviceInfo, AppInfo, ElementInfo } from '../types';

class ApiService {
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.apiBaseUrl;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = this.maxRetries
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/devices`);
    const data = await response.json();
    return data.devices || [];
  }

  async getDevice(deviceId: string): Promise<DeviceInfo> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/devices/${deviceId}`);
    return response.json();
  }

  async getApps(deviceId: string): Promise<AppInfo[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/devices/${deviceId}/apps`);
    return response.json();
  }

  async launchApp(deviceId: string, packageName: string): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/apps/${packageName}/launch`,
      { method: 'POST' }
    );
  }

  async terminateApp(deviceId: string, packageName: string): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/apps/${packageName}/terminate`,
      { method: 'POST' }
    );
  }

  async installApp(deviceId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    await fetch(`${this.baseUrl}/api/devices/${deviceId}/apps/install`, {
      method: 'POST',
      body: formData,
    });
  }

  async uninstallApp(deviceId: string, packageName: string): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/apps/${packageName}`,
      { method: 'DELETE' }
    );
  }

  async tap(deviceId: string, x: number, y: number): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/tap`,
      {
        method: 'POST',
        body: JSON.stringify({ x, y }),
      }
    );
  }

  async longPress(deviceId: string, x: number, y: number): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/longpress`,
      {
        method: 'POST',
        body: JSON.stringify({ x, y }),
      }
    );
  }

  async swipe(
    deviceId: string,
    direction: string,
    x?: number,
    y?: number
  ): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/swipe`,
      {
        method: 'POST',
        body: JSON.stringify({ direction, x, y }),
      }
    );
  }

  async sendKeys(deviceId: string, text: string, submit: boolean = false): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/keys`,
      {
        method: 'POST',
        body: JSON.stringify({ text, submit }),
      }
    );
  }

  async pressButton(deviceId: string, button: string): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/button`,
      {
        method: 'POST',
        body: JSON.stringify({ button }),
      }
    );
  }

  async getElements(deviceId: string): Promise<ElementInfo[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/elements`
    );
    return response.json();
  }

  async getScreenshot(deviceId: string): Promise<string> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/screenshot`
    );
    const data = await response.json();
    return data.screenshot;
  }

  async getOrientation(deviceId: string): Promise<string> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/orientation`
    );
    const data = await response.json();
    return data.orientation;
  }

  async setOrientation(deviceId: string, orientation: string): Promise<void> {
    await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/orientation`,
      {
        method: 'POST',
        body: JSON.stringify({ orientation }),
      }
    );
  }

  async executeScript(deviceId: string, script: string): Promise<any[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/devices/${deviceId}/script`,
      {
        method: 'POST',
        body: JSON.stringify({ script }),
      }
    );
    return response.json();
  }
}

export const apiService = new ApiService();
export default ApiService;
