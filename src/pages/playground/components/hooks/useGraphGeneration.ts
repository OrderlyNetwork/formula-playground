import { useEffect, useRef } from "react";
import type { ReactFlowInstance } from "reactflow";
import { generateFormulaGraph } from "@/modules/formula-graph";
import { useGraphStore } from "@/store/graphStore";
import { useAppStore } from "@/store/appStore";
import type { FormulaDefinition } from "@/types/formula";
import type { NodeDimensionsMap } from "@/modules/formula-graph";

/**
 * Hook to handle graph generation when formula is selected
 * @param selectedFormula - Currently selected formula definition
 * @param reactFlowInstanceRef - Reference to ReactFlow instance for fitting view
 * @param setNodeDimensionsMap - Setter for node dimensions map to reset when graph changes
 */
export function useGraphGeneration(
  selectedFormula: FormulaDefinition | undefined,
  reactFlowInstanceRef: React.RefObject<ReactFlowInstance | null>,
  setNodeDimensionsMap: React.Dispatch<React.SetStateAction<NodeDimensionsMap>>
) {
  const { mode } = useAppStore();
  const { setNodes, setEdges, resetGraph } = useGraphStore();

  // Handle mode switching: clear graph when switching modes
  useEffect(() => {
    // Reset graph store when mode changes to avoid showing stale graphs from previous mode
    resetGraph();
  }, [mode, resetGraph]);

  // Generate graph when formula is selected
  useEffect(() => {
    if (!selectedFormula) {
      // When no formula is selected, ensure graph is cleared
      resetGraph();
      setNodeDimensionsMap(new Map());
      return;
    }

    generateFormulaGraph(selectedFormula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      // Reset dimensions map when generating new graph
      setNodeDimensionsMap(new Map());
      // fit view after layout updates
      // defer to next frame to ensure ReactFlow has received new nodes/edges
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    });
  }, [
    selectedFormula,
    setNodes,
    setEdges,
    resetGraph,
    reactFlowInstanceRef,
    setNodeDimensionsMap,
  ]);
}

