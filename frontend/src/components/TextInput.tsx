import { useState, KeyboardEvent } from 'react';
import type { DeviceInfo } from '../types';
import { apiService } from '../services/api';

interface TextInputProps {
  device: DeviceInfo;
  onScreenshotRefresh?: () => void;
}

export function TextInput({ device, onScreenshotRefresh }: TextInputProps) {
  const [text, setText] = useState<string>('');
  const [submitAfterSend, setSubmitAfterSend] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleSendText = async () => {
    if (!text.trim() || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await apiService.sendKeys(device.id, text, submitAfterSend);
      
      // Clear input field after sending
      setText('');
      
      // Trigger screenshot refresh
      if (onScreenshotRefresh) {
        setTimeout(() => onScreenshotRefresh(), 500);
      }
    } catch (error) {
      console.error('Failed to send text:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSending) {
      handleSendText();
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Text Input</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Send text to device</p>
      </div>
      
      <div className="card-body space-y-3 sm:space-y-4">
        {/* Text input field */}
        <div>
          <label htmlFor="text-input" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            Enter text to send to device
          </label>
          <input
            id="text-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            placeholder="Type text here..."
            className="input text-sm sm:text-base"
          />
        </div>

        {/* Submit after send checkbox */}
        <div className="flex items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input
            id="submit-after-send"
            type="checkbox"
            checked={submitAfterSend}
            onChange={(e) => setSubmitAfterSend(e.target.checked)}
            disabled={isSending}
            className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors flex-shrink-0"
          />
          <label htmlFor="submit-after-send" className="ml-2 sm:ml-3 block text-xs sm:text-sm font-medium text-gray-700">
            Submit after send (press ENTER after text)
          </label>
        </div>

        {/* Send button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSendText}
            disabled={!text.trim() || isSending}
            className="btn-primary flex-1"
          >
            {isSending ? (
              <span className="flex items-center justify-center">
                <span className="spinner h-4 w-4 mr-2"></span>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
