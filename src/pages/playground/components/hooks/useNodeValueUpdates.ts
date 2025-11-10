import { useEffect, useCallback } from "react";
import { useGraphStore } from "@/store/graphStore";
import { useFormulaStore } from "@/store/formulaStore";
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
    const { updateInput } = useFormulaStore.getState();

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

      // Update ArrayNode values
      // If ArrayNode has incoming connections, merge all source values into array
      // Otherwise, update from currentInputs (manual edits)
      if (node.type === "array" && node.id.startsWith("array-")) {
        const incomingEdges = currentEdges.filter(
          (edge) => edge.target === node.id
        );

        /**
         * Normalize array value: filter out empty strings and invalid items
         * Ensure proper type conversion based on factorType
         */
        const normalizeArrayValue = (value: unknown[]): unknown[] => {
          if (!Array.isArray(value)) {
            return [];
          }

          const factorType = node.data?.factorType;
          const isObjectArray = factorType?.properties && factorType.properties.length > 0;
          const properties = factorType?.properties ?? [];
          const baseElementType = node.data?.inputType || factorType?.baseType || "string";

          const normalized: unknown[] = [];

          for (const item of value) {
            // Skip empty strings and null values for non-nullable types
            if (item === "" || (item === null && !factorType?.nullable)) {
              continue;
            }

            if (isObjectArray) {
              // For object arrays, validate and normalize each property
              if (typeof item !== "object" || item === null || Array.isArray(item)) {
                continue;
              }

              const normalizedObj: Record<string, unknown> = {};
              let hasValidProperties = false;

              for (const prop of properties) {
                const propValue = (item as Record<string, unknown>)[prop.key];
                
                // Normalize property value based on its type
                let normalizedPropValue: unknown;
                if (propValue === undefined || propValue === null) {
                  if (prop.default !== undefined) {
                    normalizedPropValue = prop.default;
                  } else {
                    switch (prop.factorType.baseType) {
                      case "number":
                        normalizedPropValue = prop.factorType.nullable ? null : 0;
                        break;
                      case "boolean":
                        normalizedPropValue = false;
                        break;
                      case "string":
                        normalizedPropValue = prop.factorType.nullable ? null : "";
                        break;
                      default:
                        normalizedPropValue = prop.factorType.nullable ? null : "";
                    }
                  }
                } else {
                  // Convert to proper type
                  switch (prop.factorType.baseType) {
                    case "number":
                      if (typeof propValue === "string" && propValue === "") {
                        normalizedPropValue = prop.factorType.nullable ? null : 0;
                      } else {
                        const num = Number(propValue);
                        normalizedPropValue = isNaN(num) ? (prop.factorType.nullable ? null : 0) : num;
                      }
                      break;
                    case "boolean":
                      normalizedPropValue = Boolean(propValue);
                      break;
                    case "string":
                      normalizedPropValue = String(propValue);
                      break;
                    default:
                      normalizedPropValue = propValue;
                  }
                }

                // Skip if property is empty string and not nullable
                if (normalizedPropValue === "" && !prop.factorType.nullable) {
                  continue;
                }

                normalizedObj[prop.key] = normalizedPropValue;
                if (normalizedPropValue !== null && normalizedPropValue !== "") {
                  hasValidProperties = true;
                }
              }

              // Only add object if it has at least one valid property
              if (hasValidProperties || Object.keys(normalizedObj).length > 0) {
                normalized.push(normalizedObj);
              }
            } else {
              // For primitive arrays, normalize based on baseElementType
              let normalizedItem: unknown;
              
              if (item === null && !factorType?.nullable) {
                continue;
              }

              switch (baseElementType) {
                case "number":
                  if (typeof item === "string" && item === "") {
                    normalizedItem = factorType?.nullable ? null : 0;
                  } else {
                    const num = Number(item);
                    normalizedItem = isNaN(num) ? (factorType?.nullable ? null : 0) : num;
                  }
                  break;
                case "boolean":
                  normalizedItem = Boolean(item);
                  break;
                case "string":
                  normalizedItem = String(item);
                  break;
                default:
                  normalizedItem = item;
              }

              // Skip empty strings for non-nullable types
              if (normalizedItem === "" && !factorType?.nullable) {
                continue;
              }

              normalized.push(normalizedItem);
            }
          }

          return normalized;
        };

        if (incomingEdges.length > 0) {
          // Merge values from all connected sources
          const mergedArray: unknown[] = [];
          
          for (const edge of incomingEdges) {
            const sourceNode = currentNodes.find(
              (n) => n.id === edge.source
            );
            
            if (sourceNode?.data?.value !== undefined) {
              let sourceValue = sourceNode.data.value;
              
              // Extract value based on sourceHandle (field path) if present
              if (edge.sourceHandle && sourceNode.type === "api") {
                const extractedValue = getByPathMemoized(
                  sourceNode.data.value,
                  edge.sourceHandle
                );
                if (extractedValue !== undefined) {
                  sourceValue = extractedValue;
                }
              }

              // Merge source value into array
              if (Array.isArray(sourceValue)) {
                mergedArray.push(...sourceValue);
              } else if (sourceValue !== undefined && sourceValue !== null) {
                mergedArray.push(sourceValue);
              }
            }
          }

          // Normalize the merged array
          const normalizedArray = normalizeArrayValue(mergedArray);

          // Only update if the normalized array is different
          const currentArray = Array.isArray(node.data?.value)
            ? node.data.value
            : [];
          
          // Simple comparison: check if arrays have different lengths or values
          const arraysEqual = 
            currentArray.length === normalizedArray.length &&
            currentArray.every((val, idx) => {
              const normalizedVal = normalizedArray[idx];
              // Deep comparison for objects
              if (typeof val === "object" && typeof normalizedVal === "object" && val !== null && normalizedVal !== null) {
                return JSON.stringify(val) === JSON.stringify(normalizedVal);
              }
              return val === normalizedVal;
            });

          if (!arraysEqual) {
            hasChange = true;
            // Also update the store to keep it in sync
            const arrayKey = node.id.replace("array-", "");
            updateInput(arrayKey, normalizedArray);
            return {
              ...node,
              data: {
                ...node.data,
                value: normalizedArray,
              },
            };
          }
        } else {
          // No incoming connections, update from currentInputs (manual edits)
          const arrayKey = node.id.replace("array-", "");
          const newValue = getByPathMemoized(currentInputs, arrayKey);
          
          // Ensure newValue is an array and normalize it
          const rawArrayValue = Array.isArray(newValue)
            ? newValue
            : newValue !== undefined && newValue !== null
            ? [newValue]
            : [];

          // Normalize the array value
          const normalizedArray = normalizeArrayValue(rawArrayValue);

          // If there are no connections and currentInputs is empty/undefined, ensure empty array
          if ((newValue === undefined || newValue === null || 
               (Array.isArray(newValue) && newValue.length === 0)) &&
              normalizedArray.length === 0) {
            // Ensure we have an empty array (not ["", ...])
            if (JSON.stringify(node.data?.value) !== JSON.stringify([])) {
              hasChange = true;
              updateInput(arrayKey, []);
              return {
                ...node,
                data: {
                  ...node.data,
                  value: [],
                },
              };
            }
          } else if (JSON.stringify(node.data?.value) !== JSON.stringify(normalizedArray)) {
            hasChange = true;
            updateInput(arrayKey, normalizedArray);
            return {
              ...node,
              data: {
                ...node.data,
                value: normalizedArray,
              },
            };
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
