import { Handle, Position } from "reactflow";
import { Fragment, memo } from "react";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";

interface ObjectNodeProps {
  data: FormulaNodeData;
}

const HEADER_HEIGHT = 44;
const HANDLE_GAP = 24;
const HEADER_TO_FIRST_HANDLE_GAP = 12;
const BOTTOM_PADDING = 12;

export const ObjectNode = memo(function ObjectNode({ data }: ObjectNodeProps) {
  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;
  const containerMinHeight =
    HEADER_HEIGHT +
    HEADER_TO_FIRST_HANDLE_GAP +
    Math.max(1, handleCount) * HANDLE_GAP +
    BOTTOM_PADDING;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 bg-white shadow-sm min-w-[240px] relative",
        "border-sky-500",
        data.isError && "border-red-500"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      <div className="font-semibold text-gray-900 mb-1">
        Object: {data.label}
      </div>
      {data.description && (
        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {inputs.map((input, index) => (
        <Fragment key={input.key}>
          <Handle
            id={input.key}
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-sky-500"
            style={{
              top:
                HEADER_HEIGHT +
                6 +
                HEADER_TO_FIRST_HANDLE_GAP +
                index * HANDLE_GAP,
            }}
          />
          <span
            className="absolute text-[10px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-1 py-0.5"
            style={{
              top:
                HEADER_HEIGHT -
                4 +
                HEADER_TO_FIRST_HANDLE_GAP +
                index * HANDLE_GAP,
              left: 16,
            }}
          >
            {input.key}
          </span>
        </Fragment>
      ))}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-sky-500"
      />
    </div>
  );
});
