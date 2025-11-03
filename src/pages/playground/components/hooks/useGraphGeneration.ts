import { useEffect, useRef } from "react";
import type { ReactFlowInstance } from "reactflow";
import { generateFormulaGraph } from "@/modules/formula-graph";
import { useGraphStore } from "@/store/graphStore";
import { useAppStore } from "@/store/appStore";
import type { FormulaDefinition } from "@/types/formula";
import type { NodeDimensionsMap } from "@/modules/formula-graph";

/**
 * Hook to handle graph generation when formula is selected
 * Only recalculates ELK layout and calls fitView when formula ID changes.
 * 
 * @param selectedFormula - Currently selected formula definition
 * @param selectedFormulaId - Currently selected formula ID (used as dependency to detect formula changes)
 * @param reactFlowInstanceRef - Reference to ReactFlow instance for fitting view
 * @param setNodeDimensionsMap - Setter for node dimensions map to reset when graph changes
 */
export function useGraphGeneration(
  selectedFormula: FormulaDefinition | undefined,
  selectedFormulaId: string | null,
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

  // Generate graph when formula ID changes (not when formula object reference changes)
  // This ensures layout is only calculated once per formula switch, not on every render
  useEffect(() => {
    if (!selectedFormulaId || !selectedFormula) {
      // When no formula is selected, ensure graph is cleared
      resetGraph();
      setNodeDimensionsMap(new Map());
      return;
    }

    // Generate graph with ELK layout calculation (only happens once per formula switch)
    generateFormulaGraph(selectedFormula).then(({ nodes, edges }) => {
      setNodes(nodes);
      setEdges(edges);
      // Reset dimensions map when generating new graph
      setNodeDimensionsMap(new Map());
      // Fit view after layout updates - only called when switching formulas
      // Defer to next frame to ensure ReactFlow has received new nodes/edges
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedFormulaId, // Only depend on ID to ensure layout is calculated once per formula switch
    // Note: selectedFormula is used inside but not in deps to avoid re-runs when object reference changes
    // setNodes, setEdges, resetGraph, reactFlowInstanceRef, setNodeDimensionsMap are stable refs
  ]);
}

