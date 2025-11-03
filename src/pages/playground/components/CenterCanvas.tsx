import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import type {
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  Connection,
} from "reactflow";
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
import { useFormulaStore } from "@/store/formulaStore";
import {
  generateFormulaGraph,
  applyELKLayout,
  type NodeDimensionsMap,
} from "@/modules/formula-graph";
import { runnerManager } from "@/modules/formula-graph/services/runnerManager";

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

  // Store measured node dimensions for dynamic layout recalculation
  const [nodeDimensionsMap, setNodeDimensionsMap] = useState<NodeDimensionsMap>(
    new Map()
  );
  const nodeDimensionsMapRef = useRef<NodeDimensionsMap>(new Map());
  const layoutRecalculationTimeoutRef = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    nodeDimensionsMapRef.current = nodeDimensionsMap;
  }, [nodeDimensionsMap]);

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
      setNodeDimensionsMap(new Map());
      return;
    }

    generateFormulaGraph(selectedFormula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      // Reset dimensions map when generating new graph
      setNodeDimensionsMap(new Map());
      // fit view after layout updates
      // defer to next frame to ensure ReactFlow has received new nodes/edges
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    });
  }, [selectedFormula, setNodes, setEdges, resetGraph]);

  /**
   * Recalculate layout when node dimensions change
   */
  useEffect(() => {
    const handleNodeDimensionsChanged = (
      event: CustomEvent<{
        nodeId: string;
        width: number;
        height: number;
      }>
    ) => {
      const { nodeId, width, height } = event.detail;

      // Update dimensions map
      setNodeDimensionsMap((prev) => {
        const updated = new Map(prev);
        updated.set(nodeId, { width, height });
        return updated;
      });

      // Debounce layout recalculation to avoid excessive recalculations
      if (layoutRecalculationTimeoutRef.current) {
        clearTimeout(layoutRecalculationTimeoutRef.current);
      }

      layoutRecalculationTimeoutRef.current = window.setTimeout(async () => {
        const currentNodes = useGraphStore.getState().nodes;
        const currentEdges = useGraphStore.getState().edges;

        // Only recalculate if we have measured dimensions for at least some nodes
        if (currentNodes.length > 0) {
          // Use current dimensions map from ref (includes latest updates)
          const currentDimensions = new Map(nodeDimensionsMapRef.current);
          currentDimensions.set(nodeId, { width, height });

          // Recalculate layout with measured dimensions
          const { nodes: layoutedNodes } = await applyELKLayout(
            currentNodes,
            currentEdges,
            currentDimensions
          );

          setNodes(layoutedNodes);

          // Fit view after layout update
          requestAnimationFrame(() => {
            reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
          });
        }
      }, 300); // 300ms debounce
    };

    window.addEventListener(
      "node-dimensions-changed",
      handleNodeDimensionsChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "node-dimensions-changed",
        handleNodeDimensionsChanged as EventListener
      );
      if (layoutRecalculationTimeoutRef.current) {
        clearTimeout(layoutRecalculationTimeoutRef.current);
      }
    };
  }, [setNodes]);

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
    const currentNodes = useGraphStore.getState().nodes;
    const currentEdges = useGraphStore.getState().edges;
    let hasChange = false;
    const next = currentNodes.map((node) => {
      // Update input nodes with current input values
      // But skip if the node has an incoming connection from API/WebSocket
      if (node.type === "input" && node.id.startsWith("input-")) {
        const hasIncomingConnection = currentEdges.some(
          (edge) =>
            edge.target === node.id &&
            (edge.source.startsWith("api-") ||
              edge.source.startsWith("websocket-"))
        );

        // Only update from currentInputs if there's no external connection
        if (!hasIncomingConnection) {
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
        } else {
          // If connected, update from source node value
          const sourceEdge = currentEdges.find(
            (edge) => edge.target === node.id
          );
          if (sourceEdge) {
            const sourceNode = currentNodes.find(
              (n) => n.id === sourceEdge.source
            );
            if (sourceNode?.data?.value !== undefined) {
              // Extract value based on sourceHandle (field path) if present
              let newValue = sourceNode.data.value;
              if (sourceEdge.sourceHandle && sourceNode.type === "api") {
                // For API nodes, extract field value using path
                const extractedValue = getByPath(
                  sourceNode.data.value,
                  sourceEdge.sourceHandle
                );
                if (extractedValue !== undefined) {
                  newValue = extractedValue;
                }
              }

              if (node.data?.value !== newValue) {
                hasChange = true;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    value: newValue ?? null,
                  },
                };
              }
            }
          }
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
  }, [currentInputs, tsResult, setNodes, getByPath, storeNodes, storeEdges]);

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

      // 当边变化时，更新受影响节点的依赖关系
      const affectedNodes = new Set<string>();
      changes.forEach((change) => {
        if ("id" in change && "source" in change && "target" in change) {
          // 边的添加或删除会影响 source 和 target 节点的依赖关系
          const edge =
            current.find((e) => e.id === change.id) ||
            next.find((e) => e.id === change.id);
          if (edge) {
            affectedNodes.add(edge.source);
            affectedNodes.add(edge.target);
          }
        }
      });

      // 更新受影响节点的依赖关系
      affectedNodes.forEach((nodeId) => {
        runnerManager.updateNodeDependencies(nodeId);
      });
    },
    [setEdges]
  );

  /**
   * Handle connection creation - validates and creates edges between nodes
   * Only allows API/WebSocket nodes to connect to InputNode
   * Enforces single connection rule for InputNode: removes existing connections before creating new ones
   * Supports field path extraction from sourceHandle for API nodes
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle } = connection;
      if (!source || !target) return;

      const sourceNode = storeNodes.find((n) => n.id === source);
      const targetNode = storeNodes.find((n) => n.id === target);

      // Validate connection: only allow API/WebSocket nodes to connect to InputNode
      if (
        sourceNode &&
        targetNode &&
        (sourceNode.type === "api" || sourceNode.type === "websocket") &&
        targetNode.type === "input"
      ) {
        // Check if target InputNode already has existing connections
        const existingConnections = storeEdges.filter(
          (edge) => edge.target === target
        );

        let updatedEdges = [...storeEdges];

        // Remove existing connections to this InputNode (enforce single connection rule)
        if (existingConnections.length > 0) {
          updatedEdges = storeEdges.filter((edge) => edge.target !== target);
          console.log(
            `Removed ${existingConnections.length} existing connection(s) from InputNode ${target}`
          );
        }

        // Create new edge with sourceHandle if present
        const newEdge = {
          id: `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ""}`,
          source,
          target,
          sourceHandle: sourceHandle || undefined,
          animated: true,
        };

        // Add the new edge to the updated edges list
        updatedEdges = [...updatedEdges, newEdge];
        setEdges(updatedEdges);

        // Update InputNode value if source node has a value
        if (sourceNode.data?.value !== undefined && targetNode) {
          const inputKey = targetNode.id.replace("input-", "");
          const { updateInput, updateInputAt } = useFormulaStore.getState();
          const fn = targetNode.id.includes(".") ? updateInputAt : updateInput;

          // Extract value based on sourceHandle (field path) if present
          let valueToSet = sourceNode.data.value;
          if (sourceHandle && sourceNode.type === "api") {
            // For API nodes, extract field value using path
            const extractedValue = getByPath(
              sourceNode.data.value,
              sourceHandle
            );
            if (extractedValue !== undefined) {
              valueToSet = extractedValue;
            } else {
              valueToSet = null;
            }
          }

          fn(inputKey, valueToSet);
        }
      }
    },
    [storeNodes, storeEdges, setEdges, getByPath]
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
