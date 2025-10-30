/**
 * Formula Settings Dialog
 * Allows users to configure jsDelivr execution source per formula
 */

import { useState } from "react";
import type { FormulaDefinition } from "../../../types/formula";
import { db } from "../../../lib/dexie";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";

interface FormulaSettingsProps {
  formula: FormulaDefinition;
  onSave: (updated: FormulaDefinition) => void;
  onClose: () => void;
}

/**
 * @description Extract version from jsDelivr URL
 * Example: https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/dist/formulas.js -> v1.0.0
 */
function extractVersion(url: string): string {
  const versionMatch = url.match(/@([^/]+)\//);
  return versionMatch ? versionMatch[1] : "latest";
}

/**
 * @description FormulaSettings component for configuring jsDelivr execution source
 */
export function FormulaSettings({
  formula,
  onSave,
  onClose,
}: FormulaSettingsProps) {
  const [jsdelivrUrl, setJsdelivrUrl] = useState(
    formula.jsdelivrInfo?.url || ""
  );
  const [functionName, setFunctionName] = useState(
    formula.jsdelivrInfo?.functionName || formula.name || ""
  );
  const [enabled, setEnabled] = useState(
    formula.jsdelivrInfo?.enabled || false
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description Validate jsDelivr URL format
   */
  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid (disables jsDelivr)
    return /^https:\/\/cdn\.jsdelivr\.net\//.test(url);
  };

  /**
   * @description Handle save button click
   */
  const handleSave = async () => {
    setError(null);

    // Validate URL format
    if (jsdelivrUrl && !validateUrl(jsdelivrUrl)) {
      setError("Invalid jsDelivr URL format. Must start with https://cdn.jsdelivr.net/");
      return;
    }

    // Validate function name is provided if URL is set
    if (jsdelivrUrl && !functionName.trim()) {
      setError("Function name is required when jsDelivr URL is provided");
      return;
    }

    setSaving(true);

    try {
      const updated: FormulaDefinition = {
        ...formula,
        jsdelivrInfo: jsdelivrUrl
          ? {
              url: jsdelivrUrl,
              functionName: functionName.trim(),
              version: extractVersion(jsdelivrUrl),
              enabled,
            }
          : undefined,
      };

      // Save to IndexedDB
      await db.formulas.put(updated);

      // Notify parent
      onSave(updated);

      // Close dialog
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card title={`公式设置: ${formula.name}`}>
          <div className="space-y-4">
            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="font-medium text-blue-900 mb-1">
                jsDelivr 执行配置说明
              </p>
              <p className="text-blue-800">
                配置此项后，公式将从 jsDelivr CDN 加载预编译的
                JavaScript 代码执行。
                如不配置，将使用内置的硬编码实现（如果有）。
              </p>
            </div>

            {/* jsDelivr URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                jsDelivr URL (可选)
              </label>
              <input
                type="text"
                value={jsdelivrUrl}
                onChange={(e) => setJsdelivrUrl(e.target.value)}
                placeholder="https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/dist/formulas.js"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                示例: https://cdn.jsdelivr.net/gh/orderly/formula-sdk@v1.0.0/dist/formulas.js
              </p>
            </div>

            {/* Function Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                函数名
              </label>
              <input
                type="text"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                placeholder="calculateFundingFee"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                在加载的 JS 文件中要调用的函数名
              </p>
            </div>

            {/* Enable Checkbox */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  启用 jsDelivr 执行（否则使用硬编码实现）
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Version Info (if URL is set) */}
            {jsdelivrUrl && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">检测到的版本:</span>{" "}
                  {extractVersion(jsdelivrUrl)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

