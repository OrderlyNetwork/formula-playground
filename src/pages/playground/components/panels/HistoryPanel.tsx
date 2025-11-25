import { useEffect, useMemo, useState, useRef } from "react";
import { Card } from "@/components/common/Card";
import { useFormulaStore } from "@/store/formulaStore";
import { useDeveloperStore } from "@/store/developerStore";
import { useAppStore } from "@/store/appStore";
import { useHistoryStore } from "@/store/historyStore";
import { formatTimestamp } from "@/lib/utils";
import type { CanvasSnapshot } from "@/types/history";
import { Trash2 } from "lucide-react";

/**
 * Extract formula names from a canvas snapshot
 * Returns an array of formula names found in the snapshot's formula parameters
 */
function getFormulaNamesFromSnapshot(
  snapshot: CanvasSnapshot,
  formulaDefinitions: Array<{ id: string; name: string }>
): string[] {
  const formulaIds = new Set<string>();

  // Extract formula IDs from formula parameters
  Object.keys(snapshot.formulaParams).forEach((formulaId) => {
    formulaIds.add(formulaId);
  });

  // Also extract from formulaIds array if available (for newer snapshots)
  if (snapshot.formulaIds) {
    snapshot.formulaIds.forEach((formulaId) => {
      formulaIds.add(formulaId);
    });
  }

  // Map formula IDs to names
  const formulaNames = Array.from(formulaIds)
    .map((formulaId) => {
      const formula = formulaDefinitions.find((f) => f.id === formulaId);
      return formula?.name || formulaId;
    })
    .filter(Boolean);

  return formulaNames;
}

export function HistoryPanel() {
  const { mode } = useAppStore();
  const normalModeData = useFormulaStore();
  const developerModeData = useDeveloperStore();
  const {
    canvasSnapshots,
    loadCanvasSnapshots,
    replayCanvasSnapshot,
    updateCanvasSnapshotName,
    deleteCanvasSnapshot,
    clearCanvasSnapshots,
  } = useHistoryStore();

  // Track which snapshot is being edited
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(
    null
  );
  const [editingName, setEditingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Track click timing to distinguish single vs double click
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Get formula definitions based on mode
  const formulaDefinitions = useMemo(() => {
    return mode === "developer"
      ? developerModeData.parsedFormulas
      : normalModeData.formulaDefinitions;
  }, [
    mode,
    developerModeData.parsedFormulas,
    normalModeData.formulaDefinitions,
  ]);

  // Load canvas snapshots on mount
  useEffect(() => {
    loadCanvasSnapshots();
  }, [loadCanvasSnapshots]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Use correct store based on mode
  const runHistory =
    mode === "developer"
      ? developerModeData.runHistory
      : normalModeData.runHistory;
  const replayHistoryRecord =
    mode === "developer"
      ? developerModeData.replayHistoryRecord
      : normalModeData.replayHistoryRecord;

  const hasExecutionHistory = runHistory.length > 0;
  const hasSnapshots = canvasSnapshots.length > 0;
  const hasAnyHistory = hasExecutionHistory || hasSnapshots;

  /**
   * Start editing a snapshot name
   */
  const startEditing = (snapshot: CanvasSnapshot) => {
    setEditingSnapshotId(snapshot.id);
    setEditingName(snapshot.name);
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  /**
   * Save the edited name
   */
  const saveEditing = async (snapshotId: string) => {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== "") {
      await updateCanvasSnapshotName(snapshotId, trimmedName);
    }
    setEditingSnapshotId(null);
    setEditingName("");
  };

  /**
   * Cancel editing
   */
  const cancelEditing = () => {
    setEditingSnapshotId(null);
    setEditingName("");
  };

  /**
   * Handle key press in edit input
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    snapshotId: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing(snapshotId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  /**
   * Handle click on snapshot name - distinguish single vs double click
   */
  const handleNameClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    snapshot: CanvasSnapshot
  ) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // If double click (within 300ms), start editing
    if (timeSinceLastClick < 300) {
      e.preventDefault();
      e.stopPropagation();
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      startEditing(snapshot);
      lastClickTimeRef.current = 0;
    } else {
      // Single click - delay replay to allow for double click
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        replayCanvasSnapshot(snapshot.id);
        clickTimeoutRef.current = null;
        lastClickTimeRef.current = 0;
      }, 300);
    }
  };

  return (
    <Card
      title="Snapshots"
      headerRight={
        hasSnapshots && (
          <button
            onClick={clearCanvasSnapshots}
            className=" hover:text-gray-600 cursor-pointer"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )
      }
    >
      <div className="space-y-1.5">
        {!hasAnyHistory ? (
          <p className="text-xs text-gray-500 p-3">No history</p>
        ) : (
          <>
            {/* Clear buttons */}
            {/* <div className="flex justify-end gap-2 mb-1.5">
              {hasSnapshots && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvasSnapshots}
                >
                  Clear Snapshots
                </Button>
              )}
              {hasExecutionHistory && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  Clear Executions
                </Button>
              )}
            </div> */}

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {/* Canvas Snapshots Section */}
              {hasSnapshots && (
                <div>
                  {/* <div className="text-xs font-semibold text-gray-700 px-2.5 py-1">
                    Canvas Snapshots
                  </div> */}
                  {canvasSnapshots.slice(0, 10).map((snapshot) => {
                    const formulaNames = getFormulaNamesFromSnapshot(
                      snapshot,
                      formulaDefinitions
                    );
                    const displayText =
                      formulaNames.length > 0
                        ? formulaNames.join(", ")
                        : "No formulas";
                    const isEditing = editingSnapshotId === snapshot.id;

                    return (
                      <div
                        key={snapshot.id}
                        className="group relative w-full px-2.5 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                      >
                        <div className="w-full relative">
                          <div className="flex justify-between items-start">
                            {isEditing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => saveEditing(snapshot.id)}
                                onKeyDown={(e) => handleKeyDown(e, snapshot.id)}
                                className="flex-1 text-gray-900 font-medium bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <button
                                onClick={(e) => handleNameClick(e, snapshot)}
                                className="text-left flex-1"
                                title="Double-click to edit name"
                              >
                                <span className="text-gray-900 font-medium">
                                  {snapshot.name}
                                </span>
                              </button>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-blue-100 rounded">
                                {snapshot.canvasMode === "multi"
                                  ? "Multi"
                                  : "Single"}
                              </span>
                              {/* Delete button - visible on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCanvasSnapshot(snapshot.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-100 rounded text-red-600 absolute bottom-0 right-0"
                                title="Delete snapshot"
                              >
                                <Trash2 size={12} strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                          {!isEditing && (
                            <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                              {displayText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Execution Records Section */}
              {hasExecutionHistory && (
                <div className="space-y-1">
                  {hasSnapshots && (
                    <div className="text-xs font-semibold text-gray-700 px-2.5 py-1 mt-2">
                      Execution Records
                    </div>
                  )}
                  {runHistory.slice(0, 20).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => replayHistoryRecord(record.id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs bg-white hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-gray-900">
                          {record.engine.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {record.durationMs.toFixed(2)}ms
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1">
                        {formatTimestamp(record.timestamp)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
