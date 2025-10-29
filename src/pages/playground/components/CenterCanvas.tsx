import { useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import type { NodeChange, EdgeChange, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

import { InputNode } from "../../../modules/formula-graph/nodes/InputNode";
import { FormulaNode } from "../../../modules/formula-graph/nodes/FormulaNode";
import { OutputNode } from "../../../modules/formula-graph/nodes/OutputNode";
import { ObjectNode } from "../../../modules/formula-graph/nodes/ObjectNode";
import { useFormulaStore } from "../../../store/formulaStore";
import { useGraphStore } from "../../../store/graphStore";
import { generateFormulaGraph } from "../../../modules/formula-graph";

const nodeTypes = {
  input: InputNode,
  formula: FormulaNode,
  output: OutputNode,
  object: ObjectNode,
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

  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Generate graph when formula is selected
  useEffect(() => {
    const formula = formulaDefinitions.find((f) => f.id === selectedFormulaId);
    if (!formula) return;

    generateFormulaGraph(formula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      // fit view after layout updates
      // defer to next frame to ensure ReactFlow has received new nodes/edges
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    });
  }, [selectedFormulaId, formulaDefinitions, setNodes, setEdges]);

  // helper to read by dot path
  function getByPath(obj: unknown, path: string) {
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

  // Update node values when inputs or results change
  useEffect(() => {
    const prev = useGraphStore.getState().nodes;
    let hasChange = false;
    const next = prev.map((node) => {
      // Update input nodes with current input values
      if (node.type === "input" && node.id.startsWith("input-")) {
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
  }, [currentInputs, tsResult, setNodes]);

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
    },
    [setEdges]
  );

  if (!selectedFormulaId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a formula to visualize</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <ReactFlow
        nodes={storeNodes}
        edges={storeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance as ReactFlowInstance;
        }}
        nodesConnectable={false}
        connectOnClick={false}
        edgesUpdatable={false}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        {/* <MiniMap /> */}
      </ReactFlow>
    </div>
  );
}
