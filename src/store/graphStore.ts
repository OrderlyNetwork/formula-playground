import { create } from "zustand";
import type { FormulaNode, FormulaEdge } from "../types/formula";
import type { NodeExecutionState, NodeExecutionStatus } from "../types/runner";
import { updateNodeData } from "../modules/formula-graph";

interface GraphStore {
  // State
  nodes: FormulaNode[];
  edges: FormulaEdge[];
  nodeExecutionStates: Map<string, NodeExecutionState>;

  // Actions
  setNodes: (nodes: FormulaNode[]) => void;
  setEdges: (edges: FormulaEdge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<FormulaNode["data"]>) => void;

  // Runner related actions
  updateNodeExecutionState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeAutoRun: (nodeId: string, isAutoRunning: boolean) => void;
  updateNodeResult: (nodeId: string, result: any, executionTime?: number) => void;
  setNodeError: (nodeId: string, error: string) => void;

  resetGraph: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  nodeExecutionStates: new Map(),

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

  // Update node execution state
  updateNodeExecutionState: (nodeId: string, stateUpdate: Partial<NodeExecutionState>) => {
    const { nodeExecutionStates } = get();
    const currentState = nodeExecutionStates.get(nodeId) || {
      nodeId,
      status: 'idle' as NodeExecutionStatus,
      isAutoRunning: false,
      inputValues: {}
    };

    const updatedState = { ...currentState, ...stateUpdate };
    const updatedStates = new Map(nodeExecutionStates);
    updatedStates.set(nodeId, updatedState);

    // 同步更新节点数据中的执行状态
    get().updateNodeData(nodeId, {
      executionState: {
        status: updatedState.status,
        isAutoRunning: updatedState.isAutoRunning,
        lastExecutionTime: updatedState.lastExecutionTime,
        lastResult: updatedState.lastResult,
        errorMessage: updatedState.errorMessage
      }
    });

    set({ nodeExecutionStates: updatedStates });
  },

  // Set node execution status
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => {
    get().updateNodeExecutionState(nodeId, {
      status,
      lastExecutionTime: Date.now()
    });
  },

  // Set node auto run
  setNodeAutoRun: (nodeId: string, isAutoRunning: boolean) => {
    get().updateNodeExecutionState(nodeId, { isAutoRunning });
  },

  // Update node result
  updateNodeResult: (nodeId: string, result: any, executionTime?: number) => {
    get().updateNodeExecutionState(nodeId, {
      lastResult: result,
      lastExecutionTime: executionTime || Date.now(),
      errorMessage: undefined
    });
  },

  // Set node error
  setNodeError: (nodeId: string, error: string) => {
    get().updateNodeExecutionState(nodeId, {
      errorMessage: error,
      lastExecutionTime: Date.now()
    });
  },

  // Reset graph
  resetGraph: () => {
    set({
      nodes: [],
      edges: [],
      nodeExecutionStates: new Map()
    });
  },
}));
