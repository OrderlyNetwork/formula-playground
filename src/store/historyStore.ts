import { create } from "zustand";
import type { DatasheetSnapshot } from "../types/history";
import { datasheetSnapshotManager } from "../modules/history-manager";
import { useSpreadsheetStore } from "./spreadsheetStore";

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
  saveDatasheetSnapshot: async (
    data: Record<string, Record<string, unknown>>,
    activeFormulaId?: string
  ) => {
    const timestamp = Date.now();
    const name = formatTimestampName(timestamp);

    // Deep clone data to avoid reference issues
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
      const snapshot = await datasheetSnapshotManager.getSnapshotById(snapshotId);
      if (!snapshot) {
        console.error("Datasheet snapshot not found:", snapshotId);
        return;
      }

      const spreadsheetStore = useSpreadsheetStore.getState();

      // Restore data for each formula
      Object.entries(snapshot.data).forEach(([formulaId, rowsData]) => {
        if (typeof rowsData !== "object" || rowsData === null) return;

        // 1. Reconstruct rows from snapshot data keys
        // The snapshot keys are the row IDs. We need to restore them to the store
        // so the UI knows what rows to render.
        const rowIds = Object.keys(rowsData);
        const rows = rowIds.map((id) => ({ id }));

        // Update the rows in the spreadsheet store
        spreadsheetStore.setTabRows(formulaId, rows);

        // 2. Get or create GridStore for this tab
        // If the tab hasn't been visited, GridStore might not exist.
        // We create it so we can populate the data.
        let gridStore = spreadsheetStore.getTabGridStore(formulaId);

        if (!gridStore) {
          // Use current columns if available, otherwise empty (will be synced when tab opens)
          const columns = spreadsheetStore.getTabColumns(formulaId);

          // Create new GridStore with a dummy callback (will be updated when component mounts)
          gridStore = spreadsheetStore.getOrCreateTabGridStore(
            formulaId,
            rows,
            columns,
            async () => { } // No-op callback
          );
        } else {
          // If it exists, sync the new row structure
          const columns = spreadsheetStore.getTabColumns(formulaId);
          gridStore.syncStructure(rows, columns);
        }

        // 3. Populate data into GridStore
        Object.entries(rowsData).forEach(([rowId, colValues]) => {
          if (typeof colValues === "object" && colValues !== null) {
            Object.entries(colValues).forEach(([colId, value]) => {
              // We use silent=true to avoid triggering calculations during restore
              // The UI will trigger necessary updates when it renders
              gridStore!.setValue(rowId, colId, value as any, true);
            });
          }
        });
      });

      // If there was an active formula in the snapshot, we could optionally switch to it
      // if (snapshot.activeFormulaId) {
      //   // Logic to switch active tab if desired
      // }

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
