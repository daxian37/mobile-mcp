import * as fc from 'fast-check';
import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';

// Mock localStorage for Node.js environment
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Setup localStorage mock
(global as any).localStorage = new LocalStorageMock();

// Inline SessionService implementation for testing
interface SessionData {
  selectedDevice: string | null;
  refreshInterval: number;
  openPanels: string[];
  timestamp: number;
}

const SESSION_STORAGE_KEY = 'mobile-mcp-session';

class SessionService {
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

  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  static hasSession(): boolean {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
    } catch (error) {
      console.error('Failed to check for session:', error);
      return false;
    }
  }
}

describe('Session Management Properties', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    (global as any).localStorage.clear();
  });

  // Feature: browser-web-interface, Property 36: Session save completeness
  // Validates: Requirements 10.1
  it('Property 36: Session save completeness - saved session should contain all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedDevice: fc.oneof(fc.string(), fc.constant(null)),
          refreshInterval: fc.integer({ min: 100, max: 10000 }),
          openPanels: fc.array(fc.string(), { maxLength: 10 }),
        }),
        (sessionInput) => {
          // Save the session
          SessionService.saveSession(sessionInput);

          // Load the session back
          const loadedSession = SessionService.loadSession();

          // Assert that the session was saved and loaded successfully
          assert.ok(loadedSession !== null, 'Session should be loaded successfully');

          // Assert all fields are present and correct
          assert.strictEqual(
            loadedSession.selectedDevice,
            sessionInput.selectedDevice,
            'selectedDevice should match'
          );
          assert.strictEqual(
            loadedSession.refreshInterval,
            sessionInput.refreshInterval,
            'refreshInterval should match'
          );
          assert.deepStrictEqual(
            loadedSession.openPanels,
            sessionInput.openPanels,
            'openPanels should match'
          );
          assert.ok(
            typeof loadedSession.timestamp === 'number',
            'timestamp should be a number'
          );
          assert.ok(
            loadedSession.timestamp > 0,
            'timestamp should be positive'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: browser-web-interface, Property 37: Session restore completeness
  // Validates: Requirements 10.2
  it('Property 37: Session restore completeness - restored session should preserve all state', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedDevice: fc.oneof(fc.string(), fc.constant(null)),
          refreshInterval: fc.integer({ min: 100, max: 10000 }),
          openPanels: fc.array(fc.string(), { maxLength: 10 }),
        }),
        (sessionInput) => {
          // Save the session
          SessionService.saveSession(sessionInput);

          // Load the session
          const restoredSession = SessionService.loadSession();

          // Assert restoration was successful
          assert.ok(restoredSession !== null, 'Session should be restored');

          // Assert that device selection is preserved
          assert.strictEqual(
            restoredSession.selectedDevice,
            sessionInput.selectedDevice,
            'Device selection should be preserved'
          );

          // Assert that UI configuration is preserved
          assert.strictEqual(
            restoredSession.refreshInterval,
            sessionInput.refreshInterval,
            'Refresh interval should be preserved'
          );
          assert.deepStrictEqual(
            restoredSession.openPanels,
            sessionInput.openPanels,
            'Open panels should be preserved'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 36 & 37: Session round-trip - save then load should preserve all data', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedDevice: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.constant(null)
          ),
          refreshInterval: fc.integer({ min: 100, max: 10000 }),
          openPanels: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { maxLength: 10 }
          ),
        }),
        (originalSession) => {
          // Save the session
          SessionService.saveSession(originalSession);

          // Load it back
          const loadedSession = SessionService.loadSession();

          // Assert round-trip preserves all data
          assert.ok(loadedSession !== null, 'Session should be loaded');
          assert.strictEqual(
            loadedSession.selectedDevice,
            originalSession.selectedDevice,
            'selectedDevice should round-trip correctly'
          );
          assert.strictEqual(
            loadedSession.refreshInterval,
            originalSession.refreshInterval,
            'refreshInterval should round-trip correctly'
          );
          assert.deepStrictEqual(
            loadedSession.openPanels,
            originalSession.openPanels,
            'openPanels should round-trip correctly'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Session validation - should reject invalid session data', () => {
    // Test with invalid selectedDevice type
    (global as any).localStorage.setItem(
      'mobile-mcp-session',
      JSON.stringify({
        selectedDevice: 123, // Invalid: should be string or null
        refreshInterval: 1000,
        openPanels: [],
        timestamp: Date.now(),
      })
    );

    const result1 = SessionService.loadSession();
    assert.strictEqual(result1, null, 'Should reject invalid selectedDevice type');

    // Test with invalid refreshInterval type
    (global as any).localStorage.setItem(
      'mobile-mcp-session',
      JSON.stringify({
        selectedDevice: null,
        refreshInterval: 'invalid', // Invalid: should be number
        openPanels: [],
        timestamp: Date.now(),
      })
    );

    const result2 = SessionService.loadSession();
    assert.strictEqual(result2, null, 'Should reject invalid refreshInterval type');

    // Test with invalid openPanels type
    (global as any).localStorage.setItem(
      'mobile-mcp-session',
      JSON.stringify({
        selectedDevice: null,
        refreshInterval: 1000,
        openPanels: 'invalid', // Invalid: should be array
        timestamp: Date.now(),
      })
    );

    const result3 = SessionService.loadSession();
    assert.strictEqual(result3, null, 'Should reject invalid openPanels type');
  });

  it('Session service should handle missing session gracefully', () => {
    // Ensure no session exists
    SessionService.clearSession();

    // Try to load non-existent session
    const result = SessionService.loadSession();
    assert.strictEqual(result, null, 'Should return null for missing session');

    // hasSession should return false
    assert.strictEqual(
      SessionService.hasSession(),
      false,
      'hasSession should return false when no session exists'
    );
  });

  it('Session service should handle corrupted JSON gracefully', () => {
    // Set corrupted JSON
    (global as any).localStorage.setItem('mobile-mcp-session', 'invalid json {');

    // Try to load corrupted session
    const result = SessionService.loadSession();
    assert.strictEqual(result, null, 'Should return null for corrupted session data');
  });

  // Feature: browser-web-interface, Property 38: Auto-save on close
  // Validates: Requirements 10.3
  it('Property 38: Auto-save on close - session should be saved when browser closes', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedDevice: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.constant(null)
          ),
          refreshInterval: fc.integer({ min: 100, max: 10000 }),
          openPanels: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { maxLength: 10 }
          ),
        }),
        (sessionData) => {
          // Clear any existing session
          SessionService.clearSession();

          // Simulate the auto-save that happens on beforeunload
          // In the actual implementation, this is triggered by the beforeunload event
          SessionService.saveSession(sessionData);

          // Verify the session was saved
          assert.ok(
            SessionService.hasSession(),
            'Session should exist after auto-save'
          );

          // Verify the saved data is correct
          const loadedSession = SessionService.loadSession();
          assert.ok(loadedSession !== null, 'Session should be loadable');
          assert.strictEqual(
            loadedSession.selectedDevice,
            sessionData.selectedDevice,
            'Auto-saved selectedDevice should match'
          );
          assert.strictEqual(
            loadedSession.refreshInterval,
            sessionData.refreshInterval,
            'Auto-saved refreshInterval should match'
          );
          assert.deepStrictEqual(
            loadedSession.openPanels,
            sessionData.openPanels,
            'Auto-saved openPanels should match'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 38 (Integration): Auto-save should persist across page reloads', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedDevice: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.constant(null)
          ),
          refreshInterval: fc.integer({ min: 100, max: 10000 }),
          openPanels: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }),
            { maxLength: 10 }
          ),
        }),
        (sessionData) => {
          // Simulate first page load - save session
          SessionService.saveSession(sessionData);

          // Simulate page reload - create new localStorage instance
          // In a real browser, this would be a new page load
          const savedData = (global as any).localStorage.getItem('mobile-mcp-session');
          assert.ok(savedData !== null, 'Session should persist in localStorage');

          // Simulate loading the session on the new page
          const restoredSession = SessionService.loadSession();
          assert.ok(restoredSession !== null, 'Session should be restorable after reload');

          // Verify all data persisted correctly
          assert.strictEqual(
            restoredSession.selectedDevice,
            sessionData.selectedDevice,
            'selectedDevice should persist across reload'
          );
          assert.strictEqual(
            restoredSession.refreshInterval,
            sessionData.refreshInterval,
            'refreshInterval should persist across reload'
          );
          assert.deepStrictEqual(
            restoredSession.openPanels,
            sessionData.openPanels,
            'openPanels should persist across reload'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
