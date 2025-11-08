import { Handle, Position } from "reactflow";
import { memo } from "react";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";
import { Radio } from "lucide-react";

interface WebSocketNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

/**
 * WebSocketNode - Custom React Flow node for WebSocket data streaming
 * Displays pre-configured WebSocket endpoint information
 */
export const WebSocketNode = memo(function WebSocketNode({
  id,
  data,
  selected,
}: WebSocketNodeProps) {
  const url = data.wsConfig?.url || "";
  const topic = data.wsConfig?.topic || "";
  const connectionStatus = data.wsConfig?.status || "disconnected";

  /**
   * Get status color based on connection state
   */
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600 bg-green-50 border-green-200";
      case "connecting":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  /**
   * Get status text based on connection state
   */
  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[260px]",
        "border-teal-400",
        data.isError && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-teal-600 shadow-lg ring-2 ring-teal-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Radio size={18} strokeWidth={1.5} className="text-teal-600" />
        <div className="font-semibold text-gray-900">{data.label}</div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 mb-3">{data.description}</div>
      )}

      {/* WebSocket Configuration - Read-only display */}
      <div className="space-y-2">
        {/* Connection Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Status:</span>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded border",
              getStatusColor()
            )}
          >
            {getStatusText()}
          </span>
        </div>

        {/* Topic Badge */}
        {topic && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Topic:</span>
            <span className="text-xs font-mono bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
              {topic}
            </span>
          </div>
        )}

        {/* Stream data display */}
        {data.value && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-teal-50 rounded border border-teal-200">
            <div className="font-medium mb-1 text-teal-700">Latest Data:</div>
            <div className="font-mono text-[10px] text-gray-700 max-h-20 overflow-y-auto">
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
        className="w-3 h-3 bg-teal-500"
      />
    </div>
  );
});
