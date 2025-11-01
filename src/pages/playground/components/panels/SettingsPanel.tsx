import { useState, useEffect } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/store/settingsStore";
import { Globe, Radio, RotateCcw, Save } from "lucide-react";

/**
 * SettingsPanel component for managing application-wide settings
 * Includes environment variable management for API and WebSocket base URLs
 */
export function SettingsPanel() {
  const { settings, setApiBaseURL, setWebSocketBaseURL, resetSettings } =
    useSettingsStore();

  // Local state for form inputs
  const [apiBaseURL, setApiBaseURLLocal] = useState(settings.apiBaseURL);
  const [webSocketBaseURL, setWebSocketBaseURLLocal] = useState(
    settings.webSocketBaseURL
  );
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Sync local state with store when settings change externally
   */
  useEffect(() => {
    setApiBaseURLLocal(settings.apiBaseURL);
    setWebSocketBaseURLLocal(settings.webSocketBaseURL);
    setHasChanges(false);
  }, [settings]);

  /**
   * Check if there are unsaved changes
   */
  useEffect(() => {
    const changed =
      apiBaseURL !== settings.apiBaseURL ||
      webSocketBaseURL !== settings.webSocketBaseURL;
    setHasChanges(changed);
  }, [apiBaseURL, webSocketBaseURL, settings]);

  /**
   * Handle save button click
   */
  const handleSave = () => {
    setApiBaseURL(apiBaseURL);
    setWebSocketBaseURL(webSocketBaseURL);
    setHasChanges(false);
  };

  /**
   * Handle reset button click
   * Resets to default values
   */
  const handleReset = () => {
    resetSettings();
    // Reset will sync from store via useEffect
  };

  /**
   * Validate URL format (optional validation)
   */
  const validateURL = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (no base URL)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const apiURLValid = validateURL(apiBaseURL);
  const wsURLValid = validateURL(webSocketBaseURL);

  return (
    <Card title="Settings" className="flex flex-col h-full">
      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-4 py-2 px-2.5">
          {/* Environment Variables Section */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <span>Environment Variables</span>
            </div>

            <div className="space-y-3">
              {/* API Base URL */}
              <div>
                <label className="flex text-xs font-medium text-gray-700 mb-1.5 items-center gap-1.5">
                  <span>API Base URL</span>
                </label>
                <Input
                  type="text"
                  placeholder="https://api.orderly.org"
                  value={apiBaseURL}
                  onChange={(e) => setApiBaseURLLocal(e.target.value)}
                  className={`h-8 text-xs ${
                    apiBaseURL && !apiURLValid
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
                {apiBaseURL && !apiURLValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Invalid URL format
                  </p>
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  Base URL for RESTful API requests
                </p>
              </div>

              {/* WebSocket Base URL */}
              <div>
                <label className="flex text-xs font-medium text-gray-700 mb-1.5 items-center gap-1.5">
                  <span>WebSocket Base URL</span>
                </label>
                <Input
                  type="text"
                  placeholder="wss://ws-evm.orderly.org"
                  value={webSocketBaseURL}
                  onChange={(e) => setWebSocketBaseURLLocal(e.target.value)}
                  className={`h-8 text-xs ${
                    webSocketBaseURL && !wsURLValid
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
                {webSocketBaseURL && !wsURLValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Invalid URL format
                  </p>
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  Base URL for WebSocket connections
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed footer with action buttons */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1.5"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            <span>Reset</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={
              !hasChanges ||
              !apiURLValid ||
              !wsURLValid ||
              (apiBaseURL === settings.apiBaseURL &&
                webSocketBaseURL === settings.webSocketBaseURL)
            }
            className="flex items-center gap-1.5"
          >
            <Save size={14} strokeWidth={1.5} />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
