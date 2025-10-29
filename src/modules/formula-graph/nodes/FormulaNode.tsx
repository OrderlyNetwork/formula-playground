import { Handle, Position } from "reactflow";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";

interface FormulaNodeProps {
  data: FormulaNodeData;
}

/**
 * FormulaNode - Custom React Flow node for the main formula
 */
export function FormulaNode({ data }: FormulaNodeProps) {
  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;
  const containerMinHeight = Math.max(100, 80 + handleCount * 24);
  return (
    <div
      className={cn(
        "px-6 py-4 rounded-lg border-2 bg-white shadow-md min-w-[220px] relative",
        "border-purple-500",
        data.isError && "border-red-500"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      {handleCount > 0 ? (
        inputs.map((input, index) => (
          <>
            <Handle
              key={`${input.key}-handle`}
              id={input.key}
              type="target"
              position={Position.Left}
              className="w-3 h-3 bg-purple-500"
              style={{ top: 40 + index * 24 }}
            />
            <span
              key={`${input.key}-label`}
              className="absolute -left-2 -translate-x-full text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5"
              style={{ top: 36 + index * 24 }}
            >
              {input.key}
            </span>
          </>
        ))
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-purple-500"
        />
      )}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-purple-600 uppercase">
          Formula
        </div>
        <div className="font-bold text-gray-900 text-lg">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-600 max-w-[200px]">
            {data.description}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}
