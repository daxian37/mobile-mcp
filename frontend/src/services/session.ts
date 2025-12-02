import type { SessionData } from '../types';

const SESSION_STORAGE_KEY = 'mobile-mcp-session';

export class SessionService {
  /**
   * Save the current session to localStorage
   * Stores selected device, refresh interval, and open panels
   */
  static saveSession(sessionData: Omit<SessionData, 'timestamp'>): void {
    try {
      const dataWithTimestamp: SessionData = {
        ...sessionData,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Failed to save session to localStorage');
    }
  }

  /**
   * Load a saved session from localStorage
   * Returns null if no session exists or if loading fails
   */
  static loadSession(): SessionData | null {
    try {
      const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!storedData) {
        return null;
      }

      const sessionData = JSON.parse(storedData) as SessionData;
      
      // Validate the loaded data has required fields
      if (
        typeof sessionData.selectedDevice !== 'string' &&
        sessionData.selectedDevice !== null
      ) {
        throw new Error('Invalid session data: selectedDevice must be string or null');
      }
      
      if (typeof sessionData.refreshInterval !== 'number') {
        throw new Error('Invalid session data: refreshInterval must be a number');
      }
      
      if (!Array.isArray(sessionData.openPanels)) {
        throw new Error('Invalid session data: openPanels must be an array');
      }
      
      if (typeof sessionData.timestamp !== 'number') {
        throw new Error('Invalid session data: timestamp must be a number');
      }

      return sessionData;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Clear the saved session from localStorage
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Check if a saved session exists
   */
  static hasSession(): boolean {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
    } catch (error) {
      console.error('Failed to check for session:', error);
      return false;
    }
  }
}
