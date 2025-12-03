import { useEffect, useMemo, useState, useRef } from "react";
import { Card } from "@/components/common/Card";
import { useFormulaStore } from "@/store/formulaStore";
import { useDeveloperStore } from "@/store/developerStore";
import { useAppStore } from "@/store/appStore";
import { useHistoryStore } from "@/store/historyStore";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { formatTimestamp } from "@/lib/utils";
import type { DatasheetSnapshot } from "@/types/history";
import { Trash2 } from "lucide-react";

/**
 * Extract formula names from a datasheet snapshot
 * Returns an array of formula names found in the snapshot's data
 */
function getFormulaNamesFromSnapshot(
  snapshot: DatasheetSnapshot,
  formulaDefinitions: Array<{ id: string; name: string }>
): string[] {
  const formulaIds = new Set<string>();

  // Extract formula IDs from snapshot data
  Object.keys(snapshot.data).forEach((formulaId) => {
    formulaIds.add(formulaId);
  });

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
    datasheetSnapshots,
    loadDatasheetSnapshots,
    replayDatasheetSnapshot,
    updateDatasheetSnapshotName,
    deleteDatasheetSnapshot,
    clearDatasheetSnapshots,
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
    return mode === "development"
      ? developerModeData.parsedFormulas
      : normalModeData.formulaDefinitions;
  }, [
    mode,
    developerModeData.parsedFormulas,
    normalModeData.formulaDefinitions,
  ]);

  // Load datasheet snapshots on mount
  useEffect(() => {
    loadDatasheetSnapshots();
  }, [loadDatasheetSnapshots]);

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
    mode === "development"
      ? developerModeData.runHistory
      : normalModeData.runHistory;
  const replayHistoryRecord =
    mode === "development"
      ? developerModeData.replayHistoryRecord
      : normalModeData.replayHistoryRecord;

  const hasExecutionHistory = runHistory.length > 0;
  const hasSnapshots = datasheetSnapshots.length > 0;
  const hasAnyHistory = hasExecutionHistory || hasSnapshots;

  /**
   * Start editing a snapshot name
   */
  const startEditing = (snapshot: DatasheetSnapshot) => {
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
      await updateDatasheetSnapshotName(snapshotId, trimmedName);
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
  const { addTab } = useFormulaTabStore();

  const handleNameClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    snapshot: DatasheetSnapshot
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
      clickTimeoutRef.current = setTimeout(async () => {
        await replayDatasheetSnapshot(snapshot.id);

        // Switch to the active formula tab if it exists in the snapshot
        if (snapshot.activeFormulaId) {
          const formula = formulaDefinitions.find(
            (f) => f.id === snapshot.activeFormulaId
          );
          const formulaName = formula?.name || snapshot.activeFormulaId;
          addTab(snapshot.activeFormulaId, formulaName, "grid");
        }

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
            onClick={clearDatasheetSnapshots}
            className=" hover:text-gray-600 cursor-pointer"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )
      }
    >
      <div className="space-y-1.5">
        {!hasAnyHistory ? (
          <p className="text-xs text-gray-500 p-3">No snapshots</p>
        ) : (
          <>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {/* Datasheet Snapshots Section */}
              {hasSnapshots && (
                <div>
                  {datasheetSnapshots.slice(0, 10).map((snapshot) => {
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
                        className="group relative w-full text-xs"
                      >
                        {isEditing ? (
                          <div className="px-2.5 py-1.5">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => saveEditing(snapshot.id)}
                              onKeyDown={(e) => handleKeyDown(e, snapshot.id)}
                              className="w-full text-gray-900 font-medium bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleNameClick(e, snapshot)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 transition-colors cursor-pointer rounded-md"
                            title="Click to replay, double-click to edit name"
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-gray-900 font-medium">
                                {snapshot.name}
                              </span>
                              {/* Delete button - visible on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDatasheetSnapshot(snapshot.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                                title="Delete snapshot"
                              >
                                <Trash2 size={12} strokeWidth={1.5} />
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                              {displayText}
                            </div>
                          </button>
                        )}
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
