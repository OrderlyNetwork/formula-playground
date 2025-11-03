import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk.bundled.js";
import type { FormulaDefinition, FormulaScalar } from "../../types/formula";
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
    // Check if this is an array type input
    if (input.factorType?.array === true) {
      // Array input: create an ArrayNode
      const defaultArrayValue = Array.isArray(input.default) 
        ? input.default 
        : input.default !== undefined && input.default !== null
        ? [input.default]
        : [];
      
      nodes.push({
        id: `array-${input.key}`,
        type: "array",
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          id: input.key,
          type: "array",
          label: input.key,
          value: defaultArrayValue,
          inputType: input.type,
          unit: input.unit,
          description: input.description,
          factorType: input.factorType,
        },
      });

      // Create edge from array to formula
      // Animation will be enabled when auto calculation is turned on
      edges.push({
        id: `e-array-${input.key}-formula`,
        source: `array-${input.key}`,
        target: "formula",
        targetHandle: input.key,
        animated: false,
      });
    } else if (input.type !== "object") {
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
      // Animation will be enabled when auto calculation is turned on
      edges.push({
        id: `e-input-${input.key}-formula`,
        source: `input-${input.key}`,
        target: "formula",
        targetHandle: input.key,
        animated: false,
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
            default: p.default as unknown as FormulaScalar,
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
            value: p.default as unknown as FormulaScalar,
            inputType: p.type,
            unit: p.unit,
            description: p.description,
            factorType: p.factorType,
          },
        });
        // Animation will be enabled when auto calculation is turned on
        edges.push({
          id: `e-input-${input.key}.${p.key}-object-${input.key}`,
          source: `input-${input.key}.${p.key}`,
          target: `object-${input.key}`,
          targetHandle: p.key,
          animated: false,
        });
      }

      // Object node connects to the formula handle of the object parameter
      // Animation will be enabled when auto calculation is turned on
      edges.push({
        id: `e-object-${input.key}-formula`,
        source: `object-${input.key}`,
        target: "formula",
        targetHandle: input.key,
        animated: false,
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
    // Animation will be enabled when auto calculation is turned on
    // 使用 sourceHandle 指定要传递的 output key，实现解耦
    edges.push({
      id: `e-formula-output-${output.key}`,
      source: "formula",
      target: `output-${output.key}`,
      sourceHandle: output.key, // 指定要传递的 output key（解耦方式）
      animated: false,
    });
  });

  // Apply ELK layout
  const layoutedGraph = await applyELKLayout(nodes, edges);

  return layoutedGraph;
}

/**
 * Node dimensions map for dynamic layout calculation
 */
export type NodeDimensionsMap = Map<string, { width: number; height: number }>;

/**
 * Apply ELK.js automatic layout to the graph
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param dimensionsMap - Optional map of measured node dimensions (nodeId -> {width, height})
 *                        If provided, uses measured dimensions; otherwise falls back to estimated dimensions
 */
export async function applyELKLayout(
  nodes: FormulaNode[],
  edges: FormulaEdge[],
  dimensionsMap?: NodeDimensionsMap
): Promise<{ nodes: FormulaNode[]; edges: FormulaEdge[] }> {
  const elkNodes: ElkNode["children"] = nodes.map((node) => {
    // Check if we have measured dimensions for this node
    const measuredDimensions = dimensionsMap?.get(node.id);

    if (measuredDimensions) {
      // Use measured dimensions if available
      return {
        id: node.id,
        width: measuredDimensions.width,
        height: measuredDimensions.height,
      };
    }

    // Fall back to estimated dimensions
    const isBoxWithHandles = node.type === "formula" || node.type === "object";
    const baseHeight = node.type === "formula" ? 100 : 80;
    const handles = node.data.inputs?.length ?? 0;
    const handleHeight = isBoxWithHandles
      ? Math.max(1, handles) * 24 + (node.type === "formula" ? 80 : 40)
      : 0;

    // Calculate dimensions based on node type
    let width: number;
    let height: number;

    if (isBoxWithHandles) {
      width = 220;
      height = Math.max(baseHeight, handleHeight);
    } else if (node.type === "array") {
      // ArrayNode has table UI, needs more space
      // Base width: 400-600px (min-w-[400px] max-w-[600px])
      // Height depends on array length: header (~60px) + table rows (~35px each) + add button (~30px)
      const arrayLength = Array.isArray(node.data?.value) ? node.data.value.length : 0;
      width = 500; // Default width for ArrayNode
      height = 60 + Math.max(1, arrayLength) * 35 + 30; // Header + rows + button
    } else if (node.type === "input") {
      // InputNode actual width is 220px (w-[220px] in component)
      // Height needs to account for: padding (py-3 = 24px), label (~20px),
      // input field (~32px), description (~16px if present), connection info (~32px if present)
      // Base height: ~100px, with description/connection: up to ~140px
      width = 220;
      // Use a safer height that accounts for description and connection info
      height = node.data.description ? 140 : 120;
    } else {
      // OutputNode or other types
      width = 180;
      height = 100; // OutputNode can have description and diff info
    }

    return {
      id: node.id,
      width,
      height,
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
      "elk.spacing.nodeNode": "30", // Increased vertical spacing between nodes in same layer
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.layered.spacing.edgeNodeBetweenLayers": "50", // Additional spacing for edge-node interactions
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
