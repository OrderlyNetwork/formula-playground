import { useEffect, useCallback } from "react";
import { useGraphStore } from "@/store/graphStore";
import type { FormulaExecutionResult } from "@/types/executor";
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
 * Hook to update node values when inputs or results change
 * @param currentInputs - Current input values
 * @param tsResult - TypeScript execution result
 */
export function useNodeValueUpdates(
  currentInputs: Record<string, any>,
  tsResult: FormulaExecutionResult | null
) {
  const { setNodes } = useGraphStore();

  // helper to read by dot path - memoized to prevent re-creation
  const getByPathMemoized = useCallback(getByPath, []);

  // Update node values when inputs or results change
  useEffect(() => {
    const currentNodes = useGraphStore.getState().nodes;
    const currentEdges = useGraphStore.getState().edges;
    let hasChange = false;
    const inputNodesToNotify: Array<{ nodeId: string; value: unknown }> = [];

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
          const newValue = getByPathMemoized(currentInputs, inputKey);
          if (node.data?.value !== newValue) {
            hasChange = true;
            // 记录需要通知的 InputNode
            inputNodesToNotify.push({ nodeId: node.id, value: newValue });
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
                const extractedValue = getByPathMemoized(
                  sourceNode.data.value,
                  sourceEdge.sourceHandle
                );
                if (extractedValue !== undefined) {
                  newValue = extractedValue;
                }
              }

              if (node.data?.value !== newValue) {
                hasChange = true;
                // 记录需要通知的 InputNode
                inputNodesToNotify.push({ nodeId: node.id, value: newValue });
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

      // 在节点数据更新后，通知下游节点（FormulaNode）InputNode 的值已变化
      // 这会导致 FormulaNode 重新收集输入值并执行（如果启用了自动运行）
      inputNodesToNotify.forEach(({ nodeId, value }) => {
        setTimeout(() => {
          runnerManager.notifyNodeDataChange(nodeId, value);
        }, 0);
      });
    }
  }, [currentInputs, tsResult, setNodes, getByPathMemoized]);
}
