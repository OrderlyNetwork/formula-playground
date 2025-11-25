/**
 * Formula Graph Module
 *
 * Note: React Flow graph generation has been removed.
 * Only utility functions remain for compatibility.
 */

import type { FormulaNode } from "../../types/formula";

/**
 * Update node data in the graph (e.g., after formula execution)
 * Note: This function is kept for compatibility with graphStore,
 * but React Flow graph generation has been removed.
 *
 * @param nodes - Array of graph nodes
 * @param nodeId - ID of the node to update
 * @param data - Partial data to update on the node
 * @returns Updated array of nodes
 */
export function updateNodeData(
  nodes: FormulaNode[],
  nodeId: string,
  data: Partial<FormulaNode["data"]>
): FormulaNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: { ...node.data, ...data },
      };
    }
    return node;
  });
}
