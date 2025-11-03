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
   * Helper function to merge source value into array
   * Handles arrays, single values, and objects
   */
  function mergeValueIntoArray(
    currentArray: unknown[],
    sourceValue: unknown
  ): unknown[] {
    const newArray = [...currentArray];
    
    if (Array.isArray(sourceValue)) {
      // If source is array, concatenate
      return [...newArray, ...sourceValue];
    } else if (sourceValue !== undefined && sourceValue !== null) {
      // Otherwise, append the value
      return [...newArray, sourceValue];
    }
    
    return newArray;
  }

  /**
   * Handle connection creation - validates and creates edges between nodes
   * - Allows API/WebSocket nodes to connect to InputNode (single connection)
   * - Allows InputNode/ObjectNode/ArrayNode to connect to ArrayNode (multiple connections)
   * Enforces single connection rule for InputNode: removes existing connections before creating new ones
   * Supports field path extraction from sourceHandle for API nodes
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle } = connection;
      if (!source || !target) return;

      const sourceNode = storeNodes.find((n) => n.id === source);
      const targetNode = storeNodes.find((n) => n.id === target);

      if (!sourceNode || !targetNode) return;

      // Handle connections to ArrayNode (supports multiple connections)
      if (
        targetNode.type === "array" &&
        (sourceNode.type === "input" ||
          sourceNode.type === "object" ||
          sourceNode.type === "array" ||
          sourceNode.type === "api" ||
          sourceNode.type === "websocket")
      ) {
        // Find the formula node that this ArrayNode connects to
        // Check if that formula node has auto calculation enabled
        const arrayNodeOutgoingEdges = storeEdges.filter(
          (edge) => edge.source === target
        );
        let isAutoRunning = false;

        for (const edge of arrayNodeOutgoingEdges) {
          const downstreamNode = storeNodes.find((n) => n.id === edge.target);
          if (downstreamNode?.type === "formula") {
            isAutoRunning =
              downstreamNode.data?.executionState?.isAutoRunning ?? false;
            break;
          }
        }

        // Create new edge (multiple connections allowed, don't remove existing ones)
        const newEdge = {
          id: `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ""}`,
          source,
          target,
          sourceHandle: sourceHandle || undefined,
          animated: isAutoRunning,
        };

        const updatedEdges = [...storeEdges, newEdge];
        setEdges(updatedEdges);

        // Merge source value into ArrayNode's array
        if (sourceNode.data?.value !== undefined) {
          const arrayKey = targetNode.id.replace("array-", "");
          const { updateInput } = useFormulaStore.getState();

          // Extract value based on sourceHandle (field path) if present
          let sourceValue = sourceNode.data.value;
          if (sourceHandle && sourceNode.type === "api") {
            const extractedValue = getByPath(
              sourceNode.data.value,
              sourceHandle
            );
            if (extractedValue !== undefined) {
              sourceValue = extractedValue;
            }
          }

          // Get current array value from ArrayNode
          const currentArrayValue = Array.isArray(targetNode.data?.value)
            ? targetNode.data.value
            : [];

          // Merge the new value into the array
          const mergedArray = mergeValueIntoArray(currentArrayValue, sourceValue);
          updateInput(arrayKey, mergedArray);
        }

        return;
      }

      // Validate connection: only allow API/WebSocket nodes to connect to InputNode
      if (
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
      const currentNodes = useGraphStore.getState().nodes;
      const next = applyEdgeChanges(changes, current);
      setEdges(next);

      // 检测删除连接到 ArrayNode 的边，并清除 ArrayNode 的数据
      changes.forEach((change) => {
        if (change.type === "remove") {
          const removedEdge = current.find((e) => e.id === change.id);
          if (removedEdge) {
            const targetNode = currentNodes.find((n) => n.id === removedEdge.target);
            
            // 如果删除的是连接到 ArrayNode 的边
            if (targetNode?.type === "array") {
              // 检查是否还有其他连接到这个 ArrayNode 的边
              const remainingEdges = next.filter(
                (edge) => edge.target === removedEdge.target
              );
              
              // 如果没有其他连接了，清除 ArrayNode 的数据
              if (remainingEdges.length === 0) {
                const arrayKey = targetNode.id.replace("array-", "");
                const { updateInput } = useFormulaStore.getState();
                updateInput(arrayKey, []);
              }
            }
          }
        }
      });

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
