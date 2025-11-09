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
import { useCanvasStore } from "@/store/canvasStore";
import { CanvasControlsPanel } from "./panels/CanvasControlsPanel";
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

  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes,
    setEdges,
  } = useGraphStore();
  const { mode: canvasMode, removeFormulaFromCanvas } = useCanvasStore();

  // console.log("storeNodes", storeNodes);

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
    setNodeDimensionsMap,
    formulaDefinitions
  );
  useNodeValueUpdates(currentInputs, tsResult);
  const { onConnect, onEdgesChange } = useGraphConnections();

  /**
   * Find all nodes related to a FormulaNode
   * Related nodes include: input nodes, output nodes, array nodes, object nodes
   * In multi-formula mode, nodes are identified by ID prefix (formulaId-)
   * In single-formula mode, nodes are identified by edges
   */
  const findRelatedNodes = useCallback(
    (
      formulaNodeId: string,
      nodes: typeof storeNodes,
      edges: typeof storeEdges
    ): string[] => {
      const relatedNodeIds = new Set<string>();
      relatedNodeIds.add(formulaNodeId);

      // Check if this is a prefixed node (multi-formula mode: "formulaId-formula")
      // or a plain node (single-formula mode: "formula")
      const isPrefixed = formulaNodeId.includes("-");

      if (isPrefixed) {
        // Multi-formula mode: find all nodes with the same prefix
        const prefix = formulaNodeId.split("-")[0] + "-";
        nodes.forEach((node) => {
          if (node.id.startsWith(prefix)) {
            relatedNodeIds.add(node.id);
          }
        });
      } else {
        // Single-formula mode: find all nodes connected through edges
        // 1. Find all nodes connected to this FormulaNode through edges
        edges.forEach((edge) => {
          if (edge.target === formulaNodeId) {
            relatedNodeIds.add(edge.source);
          }
          if (edge.source === formulaNodeId) {
            relatedNodeIds.add(edge.target);
          }
        });

        // 2. For object nodes, find their child input/array nodes recursively
        const findChildNodes = (nodeId: string) => {
          edges.forEach((edge) => {
            if (edge.target === nodeId && !relatedNodeIds.has(edge.source)) {
              relatedNodeIds.add(edge.source);
              // Recursively find children of this node (e.g., nested object properties)
              const sourceNode = nodes.find((n) => n.id === edge.source);
              if (sourceNode?.type === "object") {
                findChildNodes(edge.source);
              }
            }
          });
        };

        // Find children of object nodes
        const objectNodes = nodes.filter(
          (node) => node.type === "object" && relatedNodeIds.has(node.id)
        );
        objectNodes.forEach((objectNode) => {
          findChildNodes(objectNode.id);
        });
      }

      return Array.from(relatedNodeIds);
    },
    []
  );

  // Handle node changes with FormulaNode deletion logic
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = useGraphStore.getState().nodes;
      const currentEdges = useGraphStore.getState().edges;

      // Check if any FormulaNode is being deleted
      const deletedFormulaNodes: Array<{ nodeId: string; formulaId?: string }> =
        [];
      changes.forEach((change) => {
        if (change.type === "remove") {
          const node = currentNodes.find((n) => n.id === change.id);
          if (node?.type === "formula") {
            // Extract formula ID from node ID (handle both "formula" and "formulaId-formula" formats)
            const formulaId = node.id.includes("-")
              ? node.id.split("-")[0]
              : node.data?.id;
            deletedFormulaNodes.push({ nodeId: node.id, formulaId });
          }
        }
      });

      // If FormulaNode(s) are being deleted, delete all related nodes and edges
      if (deletedFormulaNodes.length > 0) {
        const nodesToDelete = new Set<string>();
        const edgesToDelete = new Set<string>();

        deletedFormulaNodes.forEach(({ nodeId: formulaNodeId, formulaId }) => {
          // Find all related nodes
          const relatedNodeIds = findRelatedNodes(
            formulaNodeId,
            currentNodes,
            currentEdges
          );
          relatedNodeIds.forEach((nodeId) => nodesToDelete.add(nodeId));

          // Find all edges connected to these nodes
          currentEdges.forEach((edge) => {
            if (
              nodesToDelete.has(edge.source) ||
              nodesToDelete.has(edge.target)
            ) {
              edgesToDelete.add(edge.id);
            }
          });

          // Update canvas store if in multi mode
          if (canvasMode === "multi" && formulaId) {
            removeFormulaFromCanvas(formulaId);
          }
        });

        // Create new changes array that includes deletion of all related nodes
        const enhancedChanges: NodeChange[] = [...changes];
        nodesToDelete.forEach((nodeId) => {
          // Only add if not already in changes
          if (!changes.some((c) => c.type === "remove" && c.id === nodeId)) {
            enhancedChanges.push({ type: "remove", id: nodeId });
          }
        });

        // Apply node changes
        const nextNodes = applyNodeChanges(enhancedChanges, currentNodes);
        setNodes(nextNodes);

        // Remove related edges
        const nextEdges = currentEdges.filter(
          (edge) => !edgesToDelete.has(edge.id)
        );
        setEdges(nextEdges);
      } else {
        // Normal node changes (no FormulaNode deletion)
        const next = applyNodeChanges(changes, currentNodes);
        setNodes(next);
      }
    },
    [setNodes, setEdges, findRelatedNodes, canvasMode, removeFormulaFromCanvas]
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
        <CanvasControlsPanel />
        {/* <MiniMap /> */}
      </ReactFlow>
    </div>
  );
}
