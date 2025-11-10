import { Handle, Position, useStore } from "reactflow";
import type { Connection } from "reactflow";
import { useCallback, useMemo, Fragment, memo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { Calculator } from "lucide-react";
import { ControlButton } from "../components/ControlButton";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { useFormulaRunner } from "../hooks/useFormulaRunner";

interface FormulaNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
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
  selected,
}: FormulaNodeProps) {
  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;

  // 使用 FormulaRunner hook
  const {
    isAutoRunning,
    status: executionStatus,
    errorMessage,
    inputValues,
    startAutoRun,
    stopAutoRun,
    execute: handleManualExecute,
  } = useFormulaRunner(id);

  // Note: runnerManager initialization is handled in useFormulaRunner hook

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
        "p-4 rounded-lg border-2 bg-white shadow-md w-[300px] relative",
        "border-purple-500",
        executionStatus === "error" && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-purple-600 shadow-lg ring-2 ring-purple-200"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-1 pr-8"
        style={{ paddingBottom: 8, minHeight: HEADER_HEIGHT }}
      >
        <div className="font-semibold text-gray-900 text-lg truncate max-w-[296px] flex items-center gap-1">
          <Calculator size={22} strokeWidth={1.5} /> <span>{data.label}</span>
        </div>
        {data.description && (
          <div className="text-xs text-gray-600 max-w-[296px] line-clamp-2">
            {data.description}
          </div>
        )}

        {/* 错误信息显示 - 标题下方 */}
        {executionStatus === "error" && errorMessage && (
          <ErrorDisplay
            errorMessage={errorMessage}
            inputValues={inputValues}
          />
        )}

        {/* 控制按钮 - 右上角 */}
        <div className="absolute top-2 right-2">
          <ControlButton
            status={executionStatus}
            isAutoRunning={isAutoRunning}
            onStartAutoRun={startAutoRun}
            onStopAutoRun={stopAutoRun}
            onManualExecute={handleManualExecute}
            size="sm"
            className="shadow-sm"
          />
        </div>
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
