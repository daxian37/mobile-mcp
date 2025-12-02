import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ElementInfo } from '../types';

interface ElementListProps {
  deviceId: string;
  onElementClick?: (element: ElementInfo) => void;
  onElementDoubleClick?: (element: ElementInfo) => void;
}

export const ElementList: React.FC<ElementListProps> = ({
  deviceId,
  onElementClick,
  onElementDoubleClick,
}) => {
  const [elements, setElements] = useState<ElementInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch elements from API
  const fetchElements = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      setError(null);
      const elementsData = await apiService.getElements(deviceId);
      setElements(elementsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load elements';
      setError(errorMessage);
      console.error('Elements fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Initial fetch
  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  // Handle element click with double-click detection
  const handleElementClick = useCallback((element: ElementInfo) => {
    // If there's already a timer, this is a double-click
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
      
      // Handle double-click
      if (onElementDoubleClick) {
        onElementDoubleClick(element);
      }
    } else {
      // Start timer for single click
      const timer = setTimeout(() => {
        setClickTimer(null);
        setSelectedElement(element);
        
        // Handle single click
        if (onElementClick) {
          onElementClick(element);
        }
      }, 300); // 300ms delay to detect double-click
      
      setClickTimer(timer);
    }
  }, [clickTimer, onElementClick, onElementDoubleClick]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, [clickTimer]);

  // Format element display text
  const getElementDisplayText = (element: ElementInfo): string => {
    return element.text || element.label || element.name || element.value || element.identifier || 'No text';
  };

  return (
    <div className="element-list card h-full flex flex-col animate-fade-in">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">UI Elements</h2>
          <p className="text-sm text-gray-500 mt-1">Accessible elements on screen</p>
        </div>
        <button
          onClick={fetchElements}
          disabled={loading}
          className="btn-primary btn-sm"
        >
          {loading ? (
            <span className="flex items-center">
              <span className="spinner h-3 w-3 mr-2"></span>
              Refreshing...
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </span>
          )}
        </button>
      </div>

      <div className="card-body flex-1 flex flex-col min-h-0">
        {error && (
          <div className="alert-danger mb-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-danger-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-danger-900">Error Loading Elements</p>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
                <button
                  onClick={fetchElements}
                  className="btn-danger btn-sm mt-3"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && elements.length === 0 && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="spinner h-12 w-12 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading elements...</p>
            </div>
          </div>
        )}

        {!loading && elements.length === 0 && !error && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center text-gray-500">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-semibold text-gray-700">No accessible elements found</p>
              <p className="text-sm mt-2 text-gray-500">The current screen has no accessible UI elements</p>
            </div>
          </div>
        )}

        {elements.length > 0 && (
          <div className="flex-1 overflow-auto">
            <div className="space-y-3">
              {elements.map((element, index) => (
                <div
                  key={index}
                  onClick={() => handleElementClick(element)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 transform hover:scale-[1.01] ${
                    selectedElement === element
                      ? 'bg-primary-50 border-primary-500 shadow-md'
                      : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-primary">
                          {element.type}
                        </span>
                        {element.focused && (
                          <span className="badge badge-success flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Focused
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getElementDisplayText(element)}
                      </p>
                      
                      {element.label && element.label !== element.text && (
                        <p className="text-xs text-gray-600 mt-1 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {element.label}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          ({element.coordinates.x}, {element.coordinates.y})
                        </span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          {element.coordinates.width} × {element.coordinates.height}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600 bg-gray-50 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click to highlight • Double-click to tap
            </p>
            {elements.length > 0 && (
              <p className="font-semibold text-primary-700">
                {elements.length} element{elements.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElementList;
