import { create } from "zustand";
import type { DatasheetSnapshot } from "../types/history";
import { datasheetSnapshotManager } from "../modules/history-manager";
import { useSpreadsheetStore } from "./spreadsheetStore";
import { toast } from "sonner";

interface HistoryStore {
  // State
  filterEngine: "all" | "ts" | "rust" | "local";
  sortBy: "timestamp" | "formula" | "duration";
  sortOrder: "asc" | "desc";
  searchQuery: string;
  datasheetSnapshots: DatasheetSnapshot[];

  // Actions
  setFilterEngine: (engine: "all" | "ts" | "rust" | "local") => void;
  setSortBy: (sortBy: "timestamp" | "formula" | "duration") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Datasheet snapshot actions
  saveDatasheetSnapshot: (
    data: Record<string, Record<string, unknown>>,
    activeFormulaId?: string
  ) => Promise<string>;
  loadDatasheetSnapshots: () => Promise<void>;
  replayDatasheetSnapshot: (snapshotId: string) => Promise<void>;
  updateDatasheetSnapshotName: (
    snapshotId: string,
    name: string
  ) => Promise<void>;
  deleteDatasheetSnapshot: (snapshotId: string) => Promise<void>;
  clearDatasheetSnapshots: () => Promise<void>;
}

/**
 * Format timestamp to simplified string format: "YYYY-MM-DD HH:mm:ss"
 */
function formatTimestampName(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  // Initial state
  filterEngine: "all",
  sortBy: "timestamp",
  sortOrder: "desc",
  searchQuery: "",
  datasheetSnapshots: [],

  // Set filter by engine
  setFilterEngine: (engine: "all" | "ts" | "rust" | "local") => {
    set({ filterEngine: engine });
  },

  // Set sort by field
  setSortBy: (sortBy: "timestamp" | "formula" | "duration") => {
    set({ sortBy });
  },

  // Set sort order
  setSortOrder: (order: "asc" | "desc") => {
    set({ sortOrder: order });
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Reset all filters
  resetFilters: () => {
    set({
      filterEngine: "all",
      sortBy: "timestamp",
      sortOrder: "desc",
      searchQuery: "",
    });
  },

  // Save datasheet snapshot
  // IMPORTANT: Only saves cell data, NOT structure (rows/columns)
  // Structure is always derived from current formula definitions
  saveDatasheetSnapshot: async (
    data: Record<string, Record<string, unknown>>,
    activeFormulaId?: string
  ) => {
    const timestamp = Date.now();
    const name = formatTimestampName(timestamp);

    // Deep clone data to avoid reference issues
    // Data format: formulaId -> rowId -> columnId -> cellValue
    const snapshotData = JSON.parse(JSON.stringify(data)) as Record<
      string,
      Record<string, unknown>
    >;

    const snapshotId = await datasheetSnapshotManager.addSnapshot({
      name,
      data: snapshotData,
      activeFormulaId,
    });

    // Reload snapshots to update UI
    await get().loadDatasheetSnapshots();

    return snapshotId;
  },

  // Load all datasheet snapshots
  loadDatasheetSnapshots: async () => {
    try {
      const snapshots = await datasheetSnapshotManager.getAllSnapshots();
      set({ datasheetSnapshots: snapshots });
    } catch (error) {
      console.error("Failed to load datasheet snapshots:", error);
    }
  },

  // Replay a datasheet snapshot - restore datasheet state
  replayDatasheetSnapshot: async (snapshotId: string) => {
    try {
      const snapshot = await datasheetSnapshotManager.getSnapshotById(
        snapshotId
      );
      if (!snapshot) {
        console.error("Datasheet snapshot not found:", snapshotId);
        return;
      }

      const spreadsheetStore = useSpreadsheetStore.getState();
      const warnings: string[] = [];

      // Restore data for each formula
      Object.entries(snapshot.data).forEach(([formulaId, rowsData]) => {
        if (typeof rowsData !== "object" || rowsData === null) return;

        // IMPORTANT: Use CURRENT structure (rows/columns) from formula definition
        // DO NOT reconstruct structure from snapshot data keys
        // This ensures formula evolution doesn't break snapshots

        // 1. Get current rows for this formula (from existing state or default)
        const currentRows = spreadsheetStore.getTabRows(formulaId) || [];
        const currentColumns = spreadsheetStore.getTabColumns(formulaId) || [];

        // If no current structure exists, we can't restore data
        if (currentRows.length === 0) {
          warnings.push(
            `Formula "${formulaId}" has no rows defined. Data not restored.`
          );
          return;
        }

        // 2. Get or create GridStore for this tab
        let gridStore = spreadsheetStore.getTabGridStore(formulaId);

        if (!gridStore) {
          // Create new GridStore with current structure
          gridStore = spreadsheetStore.getOrCreateTabGridStore(
            formulaId,
            currentRows,
            currentColumns,
            async () => {} // No-op callback
          );
        } else {
          // Sync with current structure (in case it changed)
          gridStore.syncStructure(currentRows, currentColumns);
        }

        // 3. Populate data into EXISTING rows/columns structure
        // Only restore data for cells that exist in current structure
        const unmappedRows = new Set<string>();
        const unmappedColumns = new Set<string>();

        Object.entries(rowsData).forEach(([snapshotRowId, colValues]) => {
          if (typeof colValues !== "object" || colValues === null) return;

          // Check if this row exists in current structure
          const rowExists = currentRows.some((row) => row.id === snapshotRowId);
          if (!rowExists) {
            unmappedRows.add(snapshotRowId);
            return; // Skip this row - it doesn't exist in current structure
          }

          Object.entries(colValues).forEach(([colId, value]) => {
            // Check if this column exists in current structure
            const columnExists = currentColumns.some((col) => col.id === colId);
            if (!columnExists) {
              unmappedColumns.add(colId);
              return; // Skip this cell - column doesn't exist in current structure
            }

            // Restore cell value (silent=true to avoid triggering calculations)
            gridStore!.setValue(snapshotRowId, colId, value as any, true);
          });
        });

        // Log warnings for unmapped data
        if (unmappedRows.size > 0) {
          warnings.push(
            `Formula "${formulaId}": ${unmappedRows.size} row(s) from snapshot not found in current structure`
          );
        }
        if (unmappedColumns.size > 0) {
          warnings.push(
            `Formula "${formulaId}": ${
              unmappedColumns.size
            } column(s) from snapshot not found in current structure (${Array.from(
              unmappedColumns
            ).join(", ")})`
          );
        }

        // 4. Trigger batch update notification to refresh UI
        // This is crucial when the current tab is the same as the snapshot formula
        // Silent mode (used above) doesn't trigger UI updates, so we need to manually notify
        gridStore.notifyBatchUpdate();
      });

      // Show warnings if any data couldn't be restored
      if (warnings.length > 0) {
        console.warn("Snapshot replay warnings:", warnings);
        toast.warning("Snapshot partially restored", {
          description: warnings.join("\n"),
          duration: 5000,
        });
      } else {
        toast.success("Snapshot restored successfully");
      }
    } catch (error) {
      console.error("Failed to replay datasheet snapshot:", error);
    }
  },

  // Update a datasheet snapshot's name
  updateDatasheetSnapshotName: async (snapshotId: string, name: string) => {
    try {
      await datasheetSnapshotManager.updateSnapshotName(snapshotId, name);
      // Reload snapshots to update UI
      await get().loadDatasheetSnapshots();
    } catch (error) {
      console.error("Failed to update datasheet snapshot name:", error);
    }
  },

  // Delete a single datasheet snapshot
  deleteDatasheetSnapshot: async (snapshotId: string) => {
    try {
      await datasheetSnapshotManager.deleteSnapshot(snapshotId);
      // Reload snapshots to update UI
      await get().loadDatasheetSnapshots();
    } catch (error) {
      console.error("Failed to delete datasheet snapshot:", error);
    }
  },

  // Clear all datasheet snapshots
  clearDatasheetSnapshots: async () => {
    try {
      await datasheetSnapshotManager.clearAllSnapshots();
      set({ datasheetSnapshots: [] });
    } catch (error) {
      console.error("Failed to clear datasheet snapshots:", error);
    }
  },
}));
