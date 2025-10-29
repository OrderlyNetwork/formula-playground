import { create } from "zustand";
import type { FormulaNode, FormulaEdge } from "../types/formula";
import { updateNodeData } from "../modules/formula-graph";

interface GraphStore {
  // State
  nodes: FormulaNode[];
  edges: FormulaEdge[];

  // Actions
  setNodes: (nodes: FormulaNode[]) => void;
  setEdges: (edges: FormulaEdge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<FormulaNode["data"]>) => void;
  resetGraph: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],

  // Set nodes
  setNodes: (nodes: FormulaNode[]) => {
    set({ nodes });
  },

  // Set edges
  setEdges: (edges: FormulaEdge[]) => {
    set({ edges });
  },

  // Update node data
  updateNodeData: (nodeId: string, data: Partial<FormulaNode["data"]>) => {
    const updatedNodes = updateNodeData(get().nodes, nodeId, data);
    set({ nodes: updatedNodes });
  },

  // Reset graph
  resetGraph: () => {
    set({ nodes: [], edges: [] });
  },
}));
