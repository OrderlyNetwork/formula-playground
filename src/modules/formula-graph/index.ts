import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk.bundled.js";
import type { FormulaDefinition } from "../../types/formula";
import type { FormulaNode, FormulaEdge } from "../../types/formula";

const elk = new ELK();

/**
 * Generate React Flow nodes and edges from a FormulaDefinition
 */
export async function generateFormulaGraph(
  formula: FormulaDefinition
): Promise<{ nodes: FormulaNode[]; edges: FormulaEdge[] }> {
  const nodes: FormulaNode[] = [];
  const edges: FormulaEdge[] = [];

  // Create input nodes
  formula.inputs.forEach((input) => {
    nodes.push({
      id: `input-${input.key}`,
      type: "input",
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        id: input.key,
        type: "input",
        label: input.key,
        value: input.default,
        inputType: input.type,
        unit: input.unit,
        description: input.description,
      },
    });

    // Create edge from input to formula
    edges.push({
      id: `e-input-${input.key}-formula`,
      source: `input-${input.key}`,
      target: "formula",
      targetHandle: input.key,
      animated: true,
    });
  });

  // Create formula node
  nodes.push({
    id: "formula",
    type: "formula",
    position: { x: 0, y: 0 }, // Will be set by layout
    data: {
      id: formula.id,
      type: "formula",
      label: formula.name,
      description: formula.description,
      inputs: formula.inputs,
    },
  });

  // Create output nodes
  formula.outputs.forEach((output) => {
    nodes.push({
      id: `output-${output.key}`,
      type: "output",
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        id: output.key,
        type: "output",
        label: output.key,
        unit: output.unit,
        description: output.description,
      },
    });

    // Create edge from formula to output
    edges.push({
      id: `e-formula-output-${output.key}`,
      source: "formula",
      target: `output-${output.key}`,
      animated: true,
    });
  });

  // Apply ELK layout
  const layoutedGraph = await applyELKLayout(nodes, edges);

  return layoutedGraph;
}

/**
 * Apply ELK.js automatic layout to the graph
 */
async function applyELKLayout(
  nodes: FormulaNode[],
  edges: FormulaEdge[]
): Promise<{ nodes: FormulaNode[]; edges: FormulaEdge[] }> {
  const elkNodes: ElkNode["children"] = nodes.map((node) => ({
    id: node.id,
    width: node.type === "formula" ? 220 : 180,
    height:
      node.type === "formula"
        ? Math.max(100, 80 + (node.data.inputs?.length ?? 0) * 24)
        : 80,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
    },
    children: elkNodes,
    edges: elkEdges,
  };

  const layout = await elk.layout(graph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const elkNode = layout.children?.find((n) => n.id === node.id);
    if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
      return {
        ...node,
        position: { x: elkNode.x, y: elkNode.y },
      };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Update node data in the graph (e.g., after formula execution)
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
