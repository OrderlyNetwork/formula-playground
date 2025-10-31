import { Handle, Position } from "reactflow";
import { memo } from "react";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";
import { Globe } from "lucide-react";

interface ApiNodeProps {
  data: FormulaNodeData;
}

/**
 * ApiNode - Custom React Flow node for RESTful API requests
 * Displays pre-configured API endpoint information
 */
export const ApiNode = memo(function ApiNode({ data }: ApiNodeProps) {
  const method = data.apiConfig?.method || "GET";
  const url = data.apiConfig?.url || "";

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[260px]",
        "border-orange-400",
        data.isError && "border-red-500"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Globe size={18} strokeWidth={1.5} className="text-orange-600" />
        <div className="font-semibold text-gray-900">{data.label}</div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 mb-3">{data.description}</div>
      )}

      {/* API Configuration - Read-only display */}
      <div className="space-y-2">
        {/* HTTP Method Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Method:</span>
          <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
            {method}
          </span>
        </div>

        {/* URL Display */}
        <div>
          <div className="text-xs text-gray-600 mb-1">Endpoint:</div>
          <div className="text-xs font-mono bg-gray-50 text-gray-700 px-2 py-1.5 rounded border border-gray-200 break-all">
            {url || "Not configured"}
          </div>
        </div>

        {/* Response data indicator */}
        {data.value && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-green-50 rounded border border-green-200">
            <div className="font-medium mb-1 text-green-700">Response:</div>
            <div className="font-mono text-[10px] text-gray-700">
              {typeof data.value === "string"
                ? data.value
                : JSON.stringify(data.value, null, 2)}
            </div>
          </div>
        )}
      </div>

      {/* Source handle for output */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
});
