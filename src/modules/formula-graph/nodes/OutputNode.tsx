import { Handle, Position } from "reactflow";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";

interface OutputNodeProps {
  data: FormulaNodeData;
}

/**
 * OutputNode - Custom React Flow node for formula outputs
 */
export function OutputNode({ data }: OutputNodeProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]",
        "border-green-400",
        data.isError && "border-red-500",
        data.diff !== undefined &&
          data.diff > 1e-10 &&
          "border-orange-500 shadow-lg"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-green-600 uppercase">
          Output
        </div>
        <div className="font-medium text-gray-900">{data.label}</div>
        {data.value !== undefined && (
          <div className="text-sm text-gray-700 font-mono">
            {typeof data.value === "number"
              ? data.value.toFixed(8)
              : String(data.value)}
            {data.unit && (
              <span className="ml-1 text-xs text-gray-500">{data.unit}</span>
            )}
          </div>
        )}
        {data.diff !== undefined && data.diff > 0 && (
          <div className="text-xs text-orange-600 font-medium mt-1">
            Diff: {data.diff.toExponential(2)}
          </div>
        )}
        {data.description && (
          <div className="text-xs text-gray-500 mt-1">{data.description}</div>
        )}
      </div>
    </div>
  );
}
