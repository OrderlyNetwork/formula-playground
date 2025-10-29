import { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { InputNode } from "../../../modules/formula-graph/nodes/InputNode";
import { FormulaNode } from "../../../modules/formula-graph/nodes/FormulaNode";
import { OutputNode } from "../../../modules/formula-graph/nodes/OutputNode";
import { useFormulaStore } from "../../../store/formulaStore";
import { useGraphStore } from "../../../store/graphStore";
import { generateFormulaGraph } from "../../../modules/formula-graph";

const nodeTypes = {
  input: InputNode,
  formula: FormulaNode,
  output: OutputNode,
};

export function CenterCanvas() {
  const { formulaDefinitions, selectedFormulaId, currentInputs, tsResult } =
    useFormulaStore();
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes,
    setEdges,
  } = useGraphStore();

  const [nodes, setNodesState, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(storeEdges);

  // Generate graph when formula is selected
  useEffect(() => {
    const formula = formulaDefinitions.find((f) => f.id === selectedFormulaId);
    if (!formula) return;

    generateFormulaGraph(formula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      setNodesState(nodes);
      setEdgesState(edges);
    });
  }, [
    selectedFormulaId,
    formulaDefinitions,
    setNodes,
    setEdges,
    setNodesState,
    setEdgesState,
  ]);

  // Update node values when inputs or results change
  useEffect(() => {
    setNodesState((nds) =>
      nds.map((node) => {
        // Update input nodes with current input values
        if (node.type === "input" && node.id.startsWith("input-")) {
          const inputKey = node.id.replace("input-", "");
          return {
            ...node,
            data: {
              ...node.data,
              value: currentInputs[inputKey],
            },
          };
        }

        // Update output nodes with result values
        if (node.type === "output" && tsResult?.outputs) {
          const outputKey = node.id.replace("output-", "");
          return {
            ...node,
            data: {
              ...node.data,
              value: tsResult.outputs[outputKey],
            },
          };
        }

        return node;
      })
    );
  }, [currentInputs, tsResult, setNodesState]);

  if (!selectedFormulaId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a formula to visualize</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        {/* <MiniMap /> */}
      </ReactFlow>
    </div>
  );
}
