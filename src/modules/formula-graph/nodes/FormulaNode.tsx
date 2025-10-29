import { Handle, Position, useStore } from "reactflow";
import type { Connection } from "reactflow";
import { useCallback, useMemo, Fragment, memo } from "react";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";

interface FormulaNodeProps {
  id: string;
  data: FormulaNodeData;
}

const HEADER_HEIGHT = 96; // title + 2-line description space
const HANDLE_GAP = 24; // vertical spacing between handles
const HEADER_TO_FIRST_HANDLE_GAP = 18; // spacing between description and first handle
const BOTTOM_PADDING = 16;

/**
 * FormulaNode - Custom React Flow node for the main formula
 */
export const FormulaNode = memo(function FormulaNode({
  id,
  data,
}: FormulaNodeProps) {
  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;

  const containerMinHeight =
    HEADER_HEIGHT +
    HEADER_TO_FIRST_HANDLE_GAP +
    Math.max(1, handleCount) * HANDLE_GAP +
    BOTTOM_PADDING;

  const DEFAULT_HANDLE_ID = "__default__";
  const edges = useStore((s) => s.edges);
  const occupiedTargetHandles = useMemo(() => {
    const set = new Set<string>();
    for (const e of edges) {
      if (e.target === id) {
        const handleId = e.targetHandle ?? DEFAULT_HANDLE_ID;
        set.add(handleId);
      }
    }
    return set;
  }, [edges, id]);

  const isValidConnection = useCallback(
    (conn: Connection) => {
      if (conn.target !== id) return true;
      const handleId = conn.targetHandle ?? DEFAULT_HANDLE_ID;
      return !occupiedTargetHandles.has(handleId);
    },
    [id, occupiedTargetHandles]
  );

  const isDefaultOccupied = occupiedTargetHandles.has(DEFAULT_HANDLE_ID);
  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2 bg-white shadow-md min-w-[280px] relative",
        "border-purple-500",
        data.isError && "border-red-500"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-1 pr-2"
        style={{ paddingTop: 8, paddingBottom: 8, minHeight: HEADER_HEIGHT }}
      >
        <div className="font-bold text-gray-900 text-lg truncate max-w-[240px]">
          {data.label}
        </div>
        {data.description && (
          <div className="text-xs text-gray-600 max-w-[240px] line-clamp-2">
            {data.description}
          </div>
        )}
      </div>

      {/* Handles below header with labels on the right */}
      {handleCount > 0 ? (
        inputs.map((input, index) => (
          <Fragment key={input.key}>
            <Handle
              id={input.key}
              type="target"
              position={Position.Left}
              className="w-3 h-3 bg-purple-500"
              style={{
                top:
                  HEADER_HEIGHT +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  6 +
                  index * HANDLE_GAP,
              }}
              isConnectable={!occupiedTargetHandles.has(input.key)}
              isValidConnection={isValidConnection}
            />
            <span
              className="absolute text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5"
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
        ))
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-purple-500"
            style={{ top: HEADER_HEIGHT + HEADER_TO_FIRST_HANDLE_GAP }}
            isConnectable={!isDefaultOccupied}
            isValidConnection={isValidConnection}
          />
          <span
            className="absolute text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5"
            style={{
              top: HEADER_HEIGHT - 4 + HEADER_TO_FIRST_HANDLE_GAP,
              left: 16,
            }}
          >
            input
          </span>
        </>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
});
