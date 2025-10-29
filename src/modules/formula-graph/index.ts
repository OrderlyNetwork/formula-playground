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
    if (input.type !== "object") {
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
          factorType: input.factorType,
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
    } else {
      // Object input: create an object node and child input nodes
      const props = input.factorType?.properties ?? [];
      nodes.push({
        id: `object-${input.key}`,
        type: "object",
        position: { x: 0, y: 0 },
        data: {
          id: input.key,
          type: "object",
          label: input.key,
          description: input.description,
          inputs: props.map((p) => ({
            key: p.key,
            type: p.type,
            factorType: p.factorType,
            unit: p.unit,
            default: p.default,
            description: p.description,
          })),
        },
      });

      // Child input nodes connect into the object node by handle id = property key
      for (const p of props) {
        nodes.push({
          id: `input-${input.key}.${p.key}`,
          type: "input",
          position: { x: 0, y: 0 },
          data: {
            id: `${input.key}.${p.key}`,
            type: "input",
            label: `${p.key}`,
            value: p.default,
            inputType: p.type,
            unit: p.unit,
            description: p.description,
            factorType: p.factorType,
          },
        });
        edges.push({
          id: `e-input-${input.key}.${p.key}-object-${input.key}`,
          source: `input-${input.key}.${p.key}`,
          target: `object-${input.key}`,
          targetHandle: p.key,
          animated: true,
        });
      }

      // Object node connects to the formula handle of the object parameter
      edges.push({
        id: `e-object-${input.key}-formula`,
        source: `object-${input.key}`,
        target: "formula",
        targetHandle: input.key,
        animated: true,
      });
    }
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
  const elkNodes: ElkNode["children"] = nodes.map((node) => {
    const isBoxWithHandles = node.type === "formula" || node.type === "object";
    const baseHeight = node.type === "formula" ? 100 : 80;
    const handles = node.data.inputs?.length ?? 0;
    const handleHeight = isBoxWithHandles
      ? Math.max(1, handles) * 24 + (node.type === "formula" ? 80 : 40)
      : 0;
    return {
      id: node.id,
      width: isBoxWithHandles ? 220 : 180,
      height: isBoxWithHandles ? Math.max(baseHeight, handleHeight) : 80,
    };
  });

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
