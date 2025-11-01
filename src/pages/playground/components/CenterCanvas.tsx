import { useCallback, useEffect, useRef, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import type { NodeChange, EdgeChange, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

import { InputNode } from "@/modules/formula-graph/nodes/InputNode";
import { FormulaNode } from "@/modules/formula-graph/nodes/FormulaNode";
import { OutputNode } from "@/modules/formula-graph/nodes/OutputNode";
import { ObjectNode } from "@/modules/formula-graph/nodes/ObjectNode";
import { ApiNode } from "@/modules/formula-graph/nodes/ApiNode";
import { WebSocketNode } from "@/modules/formula-graph/nodes/WebSocketNode";
import { useModeData } from "@/store/useModeData";
import { useAppStore } from "@/store/appStore";
import { useGraphStore } from "@/store/graphStore";
import { generateFormulaGraph } from "@/modules/formula-graph";

const nodeTypes = {
  input: InputNode,
  formula: FormulaNode,
  output: OutputNode,
  object: ObjectNode,
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
    resetGraph,
  } = useGraphStore();

  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  /**
   * Handle drag over event to allow dropping
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Handle drop event to create new node from data source
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      try {
        const dropData = JSON.parse(data);
        const { type, sourceId, label, description, method, url, topic } =
          dropData;

        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = reactFlowInstanceRef.current?.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        if (!position) return;

        // Create new node based on data source type with pre-configured settings
        const nodeId = `${type}-${sourceId}-${Date.now()}`;
        const newNode = {
          id: nodeId,
          type,
          position,
          data: {
            id: nodeId,
            type,
            label,
            description,
            ...(type === "api" && {
              apiConfig: {
                method: method || "GET",
                url: url || "",
              },
            }),
            ...(type === "websocket" && {
              wsConfig: {
                url: url || "",
                status: "disconnected" as const,
                topic,
              },
            }),
          },
        };

        setNodes([...storeNodes, newNode]);
      } catch (error) {
        console.error("Failed to parse drop data:", error);
      }
    },
    [storeNodes, setNodes]
  );

  // Handle mode switching: clear graph when switching modes
  useEffect(() => {
    // Reset graph store when mode changes to avoid showing stale graphs from previous mode
    resetGraph();
  }, [mode, resetGraph]);

  // Memoize formula lookup to avoid re-calculating
  const selectedFormula = useMemo(() => {
    return formulaDefinitions.find((f) => f.id === selectedFormulaId);
  }, [formulaDefinitions, selectedFormulaId]);

  // Generate graph when formula is selected
  useEffect(() => {
    if (!selectedFormula) {
      // When no formula is selected, ensure graph is cleared
      resetGraph();
      return;
    }

    generateFormulaGraph(selectedFormula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      // fit view after layout updates
      // defer to next frame to ensure ReactFlow has received new nodes/edges
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    });
  }, [selectedFormula, setNodes, setEdges, resetGraph]);

  // helper to read by dot path - memoized to prevent re-creation
  const getByPath = useCallback((obj: unknown, path: string) => {
    if (obj == null || typeof obj !== "object") return undefined;
    return path.split(".").reduce<unknown>((acc, key) => {
      if (
        acc &&
        typeof acc === "object" &&
        key in (acc as Record<string, unknown>)
      ) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }, []);

  // Update node values when inputs or results change
  useEffect(() => {
    const prev = useGraphStore.getState().nodes;
    let hasChange = false;
    const next = prev.map((node) => {
      // Update input nodes with current input values
      if (node.type === "input" && node.id.startsWith("input-")) {
        const inputKey = node.id.replace("input-", "");
        const newValue = getByPath(currentInputs, inputKey);
        if (node.data?.value !== newValue) {
          hasChange = true;
          return {
            ...node,
            data: {
              ...node.data,
              value: newValue,
            },
          };
        }
        return node;
      }

      // Update output nodes with result values
      if (node.type === "output" && tsResult?.outputs) {
        const outputKey = node.id.replace("output-", "");
        const newValue = tsResult.outputs[outputKey];
        if (node.data?.value !== newValue) {
          hasChange = true;
          return {
            ...node,
            data: {
              ...node.data,
              value: newValue,
            },
          };
        }
        return node;
      }

      return node;
    });
    if (hasChange) {
      setNodes(next);
    }
  }, [currentInputs, tsResult, setNodes, getByPath]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const current = useGraphStore.getState().nodes;
      const next = applyNodeChanges(changes, current);
      setNodes(next);
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const current = useGraphStore.getState().edges;
      const next = applyEdgeChanges(changes, current);
      setEdges(next);
    },
    [setEdges]
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
        nodesConnectable={false}
        connectOnClick={false}
        edgesUpdatable={false}
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
