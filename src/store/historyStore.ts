import { create } from "zustand";
import type { CanvasSnapshot } from "../types/history";
import { canvasSnapshotManager } from "../modules/history-manager";

interface HistoryStore {
  // State
  filterEngine: "all" | "ts" | "rust" | "local";
  sortBy: "timestamp" | "formula" | "duration";
  sortOrder: "asc" | "desc";
  searchQuery: string;
  canvasSnapshots: CanvasSnapshot[];

  // Actions
  setFilterEngine: (engine: "all" | "ts" | "rust" | "local") => void;
  setSortBy: (sortBy: "timestamp" | "formula" | "duration") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Canvas snapshot actions
  saveCanvasSnapshot: (
    formulaParams: Record<string, Record<string, unknown>>,
    canvasMode: "single" | "multi",
    formulaIds?: string[]
  ) => Promise<string>;
  loadCanvasSnapshots: () => Promise<void>;
  replayCanvasSnapshot: (snapshotId: string) => Promise<void>;
  updateCanvasSnapshotName: (snapshotId: string, name: string) => Promise<void>;
  deleteCanvasSnapshot: (snapshotId: string) => Promise<void>;
  clearCanvasSnapshots: () => Promise<void>;
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
  canvasSnapshots: [],

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

  // Save canvas snapshot
  // Note: React Flow functionality has been removed, now only saves formula parameters and canvas mode
  saveCanvasSnapshot: async (
    formulaParams: Record<string, Record<string, unknown>>,
    canvasMode: "single" | "multi",
    formulaIds?: string[]
  ) => {
    const timestamp = Date.now();
    const name = formatTimestampName(timestamp);

    // Deep clone formula params to avoid reference issues
    const snapshotParams = JSON.parse(
      JSON.stringify(formulaParams)
    ) as Record<string, Record<string, unknown>>;

    const snapshotId = await canvasSnapshotManager.addSnapshot({
      name,
      formulaParams: snapshotParams,
      canvasMode,
      formulaIds,
    });

    // Reload snapshots to update UI
    await get().loadCanvasSnapshots();

    return snapshotId;
  },

  // Load all canvas snapshots
  loadCanvasSnapshots: async () => {
    try {
      const snapshots = await canvasSnapshotManager.getAllSnapshots();
      set({ canvasSnapshots: snapshots });
    } catch (error) {
      console.error("Failed to load canvas snapshots:", error);
    }
  },

  // Replay a canvas snapshot - restore canvas state
  // Note: React Flow functionality has been removed, so this function only restores canvas mode and formula parameters
  replayCanvasSnapshot: async (snapshotId: string) => {
    try {
      const snapshot = await canvasSnapshotManager.getSnapshotById(snapshotId);
      if (!snapshot) {
        console.error("Canvas snapshot not found:", snapshotId);
        return;
      }

      // Import store dynamically to avoid circular dependencies
      const { useCanvasStore } = await import("./canvasStore");
      const canvasStore = useCanvasStore.getState();

      // Restore canvas mode
      canvasStore.setMode(snapshot.canvasMode);

      // Restore formula IDs from snapshot data (if available)
      if (snapshot.formulaIds && Array.isArray(snapshot.formulaIds)) {
        canvasStore.clearCanvas();
        snapshot.formulaIds.forEach((formulaId: string) => {
          canvasStore.addFormulaToCanvas(formulaId);
        });
      }

      // Restore formula parameters
      Object.entries(snapshot.formulaParams).forEach(([formulaId, params]) => {
        canvasStore.setFormulaParams(formulaId, params);
      });
    } catch (error) {
      console.error("Failed to replay canvas snapshot:", error);
    }
  },

  // Update a canvas snapshot's name
  updateCanvasSnapshotName: async (snapshotId: string, name: string) => {
    try {
      await canvasSnapshotManager.updateSnapshotName(snapshotId, name);
      // Reload snapshots to update UI
      await get().loadCanvasSnapshots();
    } catch (error) {
      console.error("Failed to update canvas snapshot name:", error);
    }
  },

  // Delete a single canvas snapshot
  deleteCanvasSnapshot: async (snapshotId: string) => {
    try {
      await canvasSnapshotManager.deleteSnapshot(snapshotId);
      // Reload snapshots to update UI
      await get().loadCanvasSnapshots();
    } catch (error) {
      console.error("Failed to delete canvas snapshot:", error);
    }
  },

  // Clear all canvas snapshots
  clearCanvasSnapshots: async () => {
    try {
      await canvasSnapshotManager.clearAllSnapshots();
      set({ canvasSnapshots: [] });
    } catch (error) {
      console.error("Failed to clear canvas snapshots:", error);
    }
  },
}));
