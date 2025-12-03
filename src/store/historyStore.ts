import { create } from "zustand";
import type { DatasheetSnapshot } from "../types/history";
import { datasheetSnapshotManager } from "../modules/history-manager";
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
    data: Record<string, Record<string, Record<string, unknown>>>,
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
    data: Record<string, Record<string, Record<string, unknown>>>,
    activeFormulaId?: string
  ) => {
    const timestamp = Date.now();
    const name = formatTimestampName(timestamp);

    // Deep clone data to avoid reference issues
    // Data format: formulaId -> rowId -> columnId -> cellValue
    const snapshotData = JSON.parse(JSON.stringify(data)) as Record<
      string,
      Record<string, Record<string, unknown>>
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

      // Delegate restoration to DataFlowManager
      const { dataFlowManager } = await import(
        "../modules/formula-datasheet/services/DataFlowManager"
      );
      
      const warnings = await dataFlowManager.restoreFullSnapshot(snapshot);

      // Show warnings if any data couldn't be restored
      if (warnings && warnings.length > 0) {
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
      toast.error("Failed to restore snapshot");
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
