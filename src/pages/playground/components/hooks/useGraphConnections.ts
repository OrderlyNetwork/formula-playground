import { useCallback } from "react";
import type { Connection, EdgeChange } from "reactflow";
import { applyEdgeChanges } from "reactflow";
import { useGraphStore } from "@/store/graphStore";
import { useFormulaStore } from "@/store/formulaStore";
import { runnerManager } from "@/modules/formula-graph/services/runnerManager";

/**
 * Helper function to read value by dot path
 */
function getByPath(obj: unknown, path: string): unknown {
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
}

/**
 * Hook to handle graph connections (edges) changes and creation
 * @returns Connection and edge change handlers
 */
export function useGraphConnections() {
  const { nodes: storeNodes, edges: storeEdges, setEdges } = useGraphStore();

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

        // Find the formula node that this InputNode connects to
        // Check if that formula node has auto calculation enabled
        const inputNodeOutgoingEdges = storeEdges.filter(
          (edge) => edge.source === target
        );
        let isAutoRunning = false;

        // Find the formula node connected downstream
        for (const edge of inputNodeOutgoingEdges) {
          const downstreamNode = storeNodes.find((n) => n.id === edge.target);
          if (downstreamNode?.type === "formula") {
            // Check if this formula node has auto calculation enabled
            isAutoRunning =
              downstreamNode.data?.executionState?.isAutoRunning ?? false;
            break;
          }
        }

        // Create new edge with sourceHandle if present
        // Only enable animation when the downstream formula node has auto calculation enabled
        const newEdge = {
          id: `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ""}`,
          source,
          target,
          sourceHandle: sourceHandle || undefined,
          animated: isAutoRunning,
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
    [storeNodes, storeEdges, setEdges]
  );

  /**
   * Handle edge changes and update node dependencies
   */
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

  return { onConnect, onEdgesChange };
}
