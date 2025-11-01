import { Button } from "@/components/common/Button";
import { Trash2 } from "lucide-react";
import type { FormulaDefinition } from "@/types/formula";

interface DatabaseManagementComponentProps {
  formulas: FormulaDefinition[];
  onClearCache: () => void;
  onClearDatabase: () => void;
}

export function DatabaseManagementComponent({
  formulas,
  onClearCache,
  onClearDatabase,
}: DatabaseManagementComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">Database Management</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage formula data and cache in IndexedDB
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-white border border-gray-200 rounded-md">
          <h4 className="font-medium text-sm mb-2">Clear Compilation Cache</h4>
          <p className="text-xs text-gray-600 mb-3">
            Clear jsDelivr compilation cache. Will reload on next execution
          </p>
          <Button variant="outline" onClick={onClearCache} size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-sm mb-2 text-red-900">
            Clear All Data
          </h4>
          <p className="text-xs text-red-700 mb-3">
            <strong>Dangerous Operation:</strong>
            This will delete all formula definitions, configurations, and cache.
            This action cannot be undone
          </p>
          <Button
            variant="outline"
            onClick={onClearDatabase}
            className="border-red-300 text-red-700 hover:bg-red-100"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="font-medium text-sm mb-2">Data Statistics</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Formula Count: {formulas.length}</div>
            <div>
              jsDelivr Configured:{" "}
              {formulas.filter((f) => f.jsdelivrInfo?.url).length}
            </div>
            <div>
              Execution Enabled:{" "}
              {formulas.filter((f) => f.jsdelivrInfo?.enabled).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
