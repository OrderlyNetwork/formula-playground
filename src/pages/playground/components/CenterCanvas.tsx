import { useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
} from "reactflow";
import type { NodeChange, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

import { InputNode } from "@/modules/formula-graph/nodes/InputNode";
import { FormulaNode } from "@/modules/formula-graph/nodes/FormulaNode";
import { OutputNode } from "@/modules/formula-graph/nodes/OutputNode";
import { ObjectNode } from "@/modules/formula-graph/nodes/ObjectNode";
import { ArrayNode } from "@/modules/formula-graph/nodes/ArrayNode";
import { ApiNode } from "@/modules/formula-graph/nodes/ApiNode";
import { WebSocketNode } from "@/modules/formula-graph/nodes/WebSocketNode";
import { useModeData } from "@/store/useModeData";
import { useAppStore } from "@/store/appStore";
import { useGraphStore } from "@/store/graphStore";
import { useGraphDragDrop } from "./hooks/useGraphDragDrop";
import { useGraphGeneration } from "./hooks/useGraphGeneration";
import { useNodeDimensions } from "./hooks/useNodeDimensions";
import { useNodeValueUpdates } from "./hooks/useNodeValueUpdates";
import { useGraphConnections } from "./hooks/useGraphConnections";

const nodeTypes = {
  input: InputNode,
  formula: FormulaNode,
  output: OutputNode,
  object: ObjectNode,
  array: ArrayNode,
  api: ApiNode,
  websocket: WebSocketNode,
};

export function CenterCanvas() {
  const { mode } = useAppStore();

  // Get mode-specific data efficiently with custom hook
  const { formulaDefinitions, selectedFormulaId, currentInputs, tsResult } =
    useModeData();

  const { nodes: storeNodes, edges: storeEdges, setNodes } = useGraphStore();

  console.log("storeNodes", storeNodes);

  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Memoize formula lookup to avoid re-calculating
  const selectedFormula = useMemo(() => {
    return formulaDefinitions.find((f) => f.id === selectedFormulaId);
  }, [formulaDefinitions, selectedFormulaId]);

  // Custom hooks for different concerns
  const { onDragOver, onDrop } = useGraphDragDrop(reactFlowInstanceRef);
  const { setNodeDimensionsMap } = useNodeDimensions(reactFlowInstanceRef);
  useGraphGeneration(
    selectedFormula,
    selectedFormulaId,
    reactFlowInstanceRef,
    setNodeDimensionsMap
  );
  useNodeValueUpdates(currentInputs, tsResult);
  const { onConnect, onEdgesChange } = useGraphConnections();

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const current = useGraphStore.getState().nodes;
      const next = applyNodeChanges(changes, current);
      setNodes(next);
    },
    [setNodes]
  );

  // In developer mode, if the user hasn't entered any formulas yet, show the "Select a formula" message
  // instead of rendering an empty canvas area.
  if (mode === "developer" && formulaDefinitions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
        <p className="text-gray-500">Input your formulas to visualize</p>
      </div>
    );
  }

  if (!selectedFormulaId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a formula to visualize</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={storeNodes}
        edges={storeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance as ReactFlowInstance;
        }}
        nodesConnectable={true}
        connectOnClick={true}
        onConnect={onConnect}
        edgesUpdatable={true}
        maxZoom={1.5}
        minZoom={0.5}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        {/* <MiniMap /> */}
      </ReactFlow>
    </div>
  );
}
