import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Script, LogEntry } from '../types';

interface ScriptEditorProps {
  deviceId: string;
}

export function ScriptEditor({ deviceId }: ScriptEditorProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptName, setScriptName] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewScriptDialog, setShowNewScriptDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = () => {
    // Load scripts from localStorage
    const savedScripts = localStorage.getItem('mobile-mcp-scripts');
    if (savedScripts) {
      try {
        const parsed = JSON.parse(savedScripts);
        setScripts(parsed);
      } catch (err) {
        console.error('Failed to load scripts:', err);
      }
    }
  };

  const saveScriptsToStorage = (updatedScripts: Script[]) => {
    localStorage.setItem('mobile-mcp-scripts', JSON.stringify(updatedScripts));
    setScripts(updatedScripts);
  };

  const handleNewScript = () => {
    setShowNewScriptDialog(true);
    setScriptName('');
  };

  const createNewScript = () => {
    if (!scriptName.trim()) {
      setError('Script name cannot be empty');
      return;
    }

    const newScript: Script = {
      id: Date.now().toString(),
      name: scriptName.trim(),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedScripts = [...scripts, newScript];
    saveScriptsToStorage(updatedScripts);
    setSelectedScript(newScript);
    setScriptContent('');
    setShowNewScriptDialog(false);
    setScriptName('');
  };

  const handleSaveScript = () => {
    if (!selectedScript) return;

    const updatedScripts = scripts.map((script) =>
      script.id === selectedScript.id
        ? { ...script, content: scriptContent, updatedAt: Date.now() }
        : script
    );

    saveScriptsToStorage(updatedScripts);
    setSelectedScript({ ...selectedScript, content: scriptContent, updatedAt: Date.now() });
    setError(null);
  };

  const handleDeleteScript = (scriptId: string) => {
    const updatedScripts = scripts.filter((script) => script.id !== scriptId);
    saveScriptsToStorage(updatedScripts);
    
    if (selectedScript?.id === scriptId) {
      setSelectedScript(null);
      setScriptContent('');
    }
    
    setShowDeleteConfirm(null);
  };

  const handleSelectScript = (script: Script) => {
    setSelectedScript(script);
    setScriptContent(script.content);
    setExecutionLog([]);
    setError(null);
  };

  const handleExecuteScript = async () => {
    if (!selectedScript || !scriptContent.trim()) {
      setError('No script to execute');
      return;
    }

    setIsExecuting(true);
    setIsPaused(false);
    setExecutionLog([]);
    setError(null);

    try {
      const results = await apiService.executeScript(deviceId, scriptContent);
      
      // Convert results to log entries
      const logEntries: LogEntry[] = results.map((result: any, index: number) => ({
        timestamp: Date.now() + index,
        command: result.command || 'unknown',
        params: result.params || {},
        result: {
          success: result.success,
          message: result.message,
          data: result.data,
        },
        status: result.success ? 'success' : 'error',
      }));

      setExecutionLog(logEntries);

      // Check if any command failed
      const failedCommand = logEntries.find((entry) => entry.status === 'error');
      if (failedCommand) {
        setError(`Script execution failed at command: ${failedCommand.command}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Script execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    // Note: Actual pause/resume functionality would require backend support
  };

  const handleContinue = () => {
    setIsPaused(false);
    // Note: Actual pause/resume functionality would require backend support
  };

  const handleAbort = () => {
    setIsExecuting(false);
    setIsPaused(false);
    // Note: Actual abort functionality would require backend support
  };

  return (
    <div className="card h-full flex flex-col animate-fade-in">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Script Editor</h2>
          <p className="text-sm text-gray-500 mt-1">Create and execute automation scripts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewScript}
            className="btn-success btn-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
          <button
            onClick={handleSaveScript}
            disabled={!selectedScript}
            className="btn-primary btn-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
          <button
            onClick={() => selectedScript && setShowDeleteConfirm(selectedScript.id)}
            disabled={!selectedScript}
            className="btn-danger btn-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button
            onClick={handleExecuteScript}
            disabled={!selectedScript || isExecuting || !scriptContent.trim()}
            className="btn-primary btn-sm bg-purple-600 hover:bg-purple-700 active:bg-purple-800 focus:ring-purple-500"
          >
            {isExecuting ? (
              <span className="flex items-center">
                <span className="spinner h-3 w-3 mr-2"></span>
                Executing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Execute
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="card-body flex-1 flex flex-col min-h-0">
        {error && (
          <div className="alert-danger mb-4 animate-slide-in">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-danger-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-danger-900">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Script List Sidebar */}
          <div className="w-64 border-r border-gray-200 pr-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Scripts
            </h3>
            {scripts.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500">No scripts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scripts.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => handleSelectScript(script)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedScript?.id === script.id
                        ? 'bg-primary-100 text-primary-800 shadow-sm'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate">{script.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editor and Log */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedScript ? (
              <>
                {/* Script Editor */}
                <div className="flex-1 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Script Content
                  </label>
                  <textarea
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                    className="input w-full h-full p-3 font-mono text-sm resize-none"
                    placeholder="Enter script commands here..."
                    spellCheck={false}
                  />
                </div>

                {/* Execution Controls */}
                {isExecuting && (
                  <div className="mb-4 flex gap-2 animate-slide-in">
                    <button
                      onClick={isPaused ? handleContinue : handlePause}
                      className="btn-warning btn-sm"
                    >
                      {isPaused ? (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          Continue
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleAbort}
                      className="btn-danger btn-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Abort
                    </button>
                  </div>
                )}

                {/* Execution Log */}
                {executionLog.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 animate-slide-in">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Execution Log
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 max-h-64 overflow-y-auto border border-gray-200">
                      {executionLog.map((entry, index) => (
                        <div
                          key={index}
                          className={`mb-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                            entry.status === 'error'
                              ? 'bg-danger-50 border-2 border-danger-300 shadow-sm'
                              : 'bg-white border-2 border-success-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 flex items-center">
                                {entry.status === 'error' ? (
                                  <svg className="w-4 h-4 mr-2 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 mr-2 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {entry.command}
                              </div>
                              {Object.keys(entry.params).length > 0 && (
                                <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded">
                                  {JSON.stringify(entry.params)}
                                </div>
                              )}
                              {entry.result.message && (
                                <div className={`text-xs mt-2 font-medium ${
                                  entry.status === 'error' ? 'text-danger-700' : 'text-gray-600'
                                }`}>
                                  {entry.result.message}
                                </div>
                              )}
                            </div>
                            <span
                              className={`ml-3 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                entry.status === 'success'
                                  ? 'badge-success'
                                  : 'badge-danger'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium">Select a script or create a new one to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Script Dialog */}
      {showNewScriptDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Create New Script
            </h3>
            <input
              type="text"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="Enter script name..."
              className="input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createNewScript();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowNewScriptDialog(false);
                  setScriptName('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createNewScript}
                className="btn-success"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-in">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to delete this script? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteScript(showDeleteConfirm)}
                className="btn-danger"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
