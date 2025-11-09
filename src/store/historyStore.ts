import { create } from "zustand";
import type { CanvasSnapshot } from "../types/history";
import type { FormulaNode, FormulaEdge } from "../types/formula";
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
    nodes: FormulaNode[],
    edges: FormulaEdge[],
    formulaParams: Record<string, Record<string, unknown>>,
    canvasMode: "single" | "multi"
  ) => Promise<string>;
  loadCanvasSnapshots: () => Promise<void>;
  replayCanvasSnapshot: (snapshotId: string) => Promise<void>;
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
  saveCanvasSnapshot: async (
    nodes: FormulaNode[],
    edges: FormulaEdge[],
    formulaParams: Record<string, Record<string, unknown>>,
    canvasMode: "single" | "multi"
  ) => {
    const timestamp = Date.now();
    const name = formatTimestampName(timestamp);

    // Deep clone nodes and edges to avoid reference issues
    const snapshotNodes = JSON.parse(JSON.stringify(nodes)) as FormulaNode[];
    const snapshotEdges = JSON.parse(JSON.stringify(edges)) as FormulaEdge[];
    const snapshotParams = JSON.parse(
      JSON.stringify(formulaParams)
    ) as Record<string, Record<string, unknown>>;

    const snapshotId = await canvasSnapshotManager.addSnapshot({
      name,
      nodes: snapshotNodes,
      edges: snapshotEdges,
      formulaParams: snapshotParams,
      canvasMode,
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
  replayCanvasSnapshot: async (snapshotId: string) => {
    try {
      const snapshot = await canvasSnapshotManager.getSnapshotById(snapshotId);
      if (!snapshot) {
        console.error("Canvas snapshot not found:", snapshotId);
        return;
      }

      // Import stores dynamically to avoid circular dependencies
      const { useGraphStore } = await import("./graphStore");
      const { useCanvasStore } = await import("./canvasStore");

      const graphStore = useGraphStore.getState();
      const canvasStore = useCanvasStore.getState();

      // Restore nodes and edges
      graphStore.setNodes(snapshot.nodes);
      graphStore.setEdges(snapshot.edges);

      // Restore canvas mode
      canvasStore.setMode(snapshot.canvasMode);

      // Update canvasFormulaIds based on restored nodes first
      // This needs to happen before setting formulaParams because clearCanvas clears params
      if (snapshot.canvasMode === "multi") {
        // Extract formula IDs from nodes
        const formulaIds = new Set<string>();
        snapshot.nodes.forEach((node) => {
          if (node.type === "formula") {
            // Extract formula ID from node ID (handle both "formula" and "formulaId-formula" formats)
            const formulaId = node.id.includes("-")
              ? node.id.split("-")[0]
              : node.data?.id;
            if (formulaId) {
              formulaIds.add(formulaId);
            }
          }
        });
        // Update canvasFormulaIds (this clears existing params)
        canvasStore.clearCanvas();
        formulaIds.forEach((formulaId) => {
          canvasStore.addFormulaToCanvas(formulaId);
        });
      } else {
        // Single mode - find the first formula node
        const formulaNode = snapshot.nodes.find((node) => node.type === "formula");
        if (formulaNode) {
          const formulaId = formulaNode.id.includes("-")
            ? formulaNode.id.split("-")[0]
            : formulaNode.data?.id;
          if (formulaId) {
            canvasStore.replaceCanvasFormula(formulaId);
          }
        } else {
          // No formula node found, clear canvas
          canvasStore.clearCanvas();
        }
      }

      // Restore formula parameters after canvasFormulaIds are set
      // This ensures params are set on the correct formulas
      Object.entries(snapshot.formulaParams).forEach(([formulaId, params]) => {
        canvasStore.setFormulaParams(formulaId, params);
      });
    } catch (error) {
      console.error("Failed to replay canvas snapshot:", error);
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
