import { config } from '../config/env';
import type { WebSocketMessage, WebSocketEvent } from '../types';

type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(url?: string) {
    this.url = url || config.wsBaseUrl;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Notify subscribers of connection status change
          this.notifyConnectionStatus('connected');
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketEvent = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.ws = null;

          // Notify subscribers of connection status change
          this.notifyConnectionStatus('disconnected');

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.notifyConnectionStatus('failed');
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`
    );

    // Notify subscribers of reconnection attempt
    this.notifyConnectionStatus('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: this.reconnectDelay
    });

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 16000);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventCallbacks.clear();
  }

  subscribe(eventType: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    this.eventCallbacks.get(eventType)!.add(callback);
  }

  unsubscribe(eventType: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventCallbacks.delete(eventType);
      return;
    }

    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(eventType);
      }
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  private handleMessage(event: WebSocketEvent): void {
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event.data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return 'connected';
    }
    if (this.isConnecting) {
      return 'connecting';
    }
    return 'disconnected';
  }

  private notifyConnectionStatus(status: string, data?: any): void {
    // Emit a special connection_status event
    const event: WebSocketEvent = {
      type: 'connection_status',
      data: {
        status,
        timestamp: Date.now(),
        ...data
      }
    };
    this.handleMessage(event);
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }
}

export const wsService = new WebSocketService();
export default WebSocketService;
