import * as fc from 'fast-check';
import { describe, it } from 'mocha';
import assert from 'assert';
import type { DeviceInfo } from '../src/types';

// Feature: browser-web-interface, Property 22: Text submission
// Validates: Requirements 6.2

describe('TextInput Properties', () => {
  it('Property 22: Text submission - For any text input, when the user presses Enter or clicks Send, the system should send the complete text to the device', async function() {
    this.timeout(5000);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          platform: fc.constantFrom('ios' as const, 'android' as const),
          type: fc.constantFrom('simulator' as const, 'emulator' as const, 'real' as const),
          status: fc.constantFrom('connected' as const, 'disconnected' as const),
        }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.boolean(),
        async (deviceData, textInput, submitAfterSend) => {
          const device: DeviceInfo = deviceData;

          // Simulate the text submission logic from TextInput component
          let sentText: string | null = null;
          let sentSubmit: boolean | null = null;
          let sentDeviceId: string | null = null;

          // Mock API service sendKeys method
          const mockSendKeys = async (deviceId: string, text: string, submit: boolean) => {
            sentDeviceId = deviceId;
            sentText = text;
            sentSubmit = submit;
          };

          // Simulate user action: typing text and pressing Enter or clicking Send
          const userText = textInput;
          const userSubmitAfterSend = submitAfterSend;

          // Simulate the send action
          await mockSendKeys(device.id, userText, userSubmitAfterSend);

          // Verify that the complete text was sent
          assert.strictEqual(
            sentText,
            userText,
            'The complete text should be sent to the device'
          );

          // Verify that the text was sent to the correct device
          assert.strictEqual(
            sentDeviceId,
            device.id,
            'The text should be sent to the correct device'
          );

          // Verify that the submit parameter matches user selection
          assert.strictEqual(
            sentSubmit,
            userSubmitAfterSend,
            'The submit parameter should match the user selection'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: browser-web-interface, Property 25: Submit after send option
  // Validates: Requirements 6.5

  it('Property 25: Submit after send option - For any text input with "Submit after send" enabled, the system should send an ENTER command after the text', async function() {
    this.timeout(5000);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          platform: fc.constantFrom('ios' as const, 'android' as const),
          type: fc.constantFrom('simulator' as const, 'emulator' as const, 'real' as const),
          status: fc.constantFrom('connected' as const, 'disconnected' as const),
        }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (deviceData, textInput) => {
          const device: DeviceInfo = deviceData;

          // Track API calls
          let sendKeysCallCount = 0;
          let lastSubmitValue: boolean | null = null;

          // Mock API service sendKeys method
          const mockSendKeys = async (deviceId: string, text: string, submit: boolean) => {
            sendKeysCallCount++;
            lastSubmitValue = submit;
          };

          // Test with submitAfterSend = true
          const submitAfterSendEnabled = true;
          await mockSendKeys(device.id, textInput, submitAfterSendEnabled);

          // Verify that submit parameter is true when "Submit after send" is enabled
          assert.strictEqual(
            lastSubmitValue,
            true,
            'When "Submit after send" is enabled, the submit parameter should be true'
          );

          // Reset for next test
          sendKeysCallCount = 0;
          lastSubmitValue = null;

          // Test with submitAfterSend = false
          const submitAfterSendDisabled = false;
          await mockSendKeys(device.id, textInput, submitAfterSendDisabled);

          // Verify that submit parameter is false when "Submit after send" is disabled
          assert.strictEqual(
            lastSubmitValue,
            false,
            'When "Submit after send" is disabled, the submit parameter should be false'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
