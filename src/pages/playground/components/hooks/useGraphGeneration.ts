import { useEffect, useRef } from "react";
import type { ReactFlowInstance } from "reactflow";
import { generateFormulaGraph, applyELKLayout } from "@/modules/formula-graph";
import type { NodeDimensionsMap } from "@/modules/formula-graph";
import { useGraphStore } from "@/store/graphStore";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import type { FormulaDefinition, FormulaNode, FormulaEdge } from "@/types/formula";

/**
 * Prefix node IDs with formula ID to avoid conflicts when multiple formulas are on canvas
 * @param nodes - Graph nodes to prefix
 * @param edges - Graph edges to prefix
 * @param formulaId - Formula ID to use as prefix
 * @returns Prefixed nodes and edges
 */
function prefixNodeIds(
  nodes: FormulaNode[],
  edges: FormulaEdge[],
  formulaId: string
): { nodes: FormulaNode[]; edges: FormulaEdge[] } {
  const prefix = `${formulaId}-`;
  
  // Prefix all node IDs
  const prefixedNodes = nodes.map((node) => ({
    ...node,
    id: `${prefix}${node.id}`,
  }));

  // Prefix all edge source and target IDs
  const prefixedEdges = edges.map((edge) => ({
    ...edge,
    id: `${prefix}${edge.id}`,
    source: `${prefix}${edge.source}`,
    target: `${prefix}${edge.target}`,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));

  return { nodes: prefixedNodes, edges: prefixedEdges };
}

/**
 * Hook to handle graph generation when formula is selected
 * Only recalculates ELK layout and calls fitView when formula ID changes.
 * Supports both single formula mode (replace) and multi formula mode (append).
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
  setNodeDimensionsMap: React.Dispatch<React.SetStateAction<NodeDimensionsMap>>,
  formulaDefinitions?: FormulaDefinition[]
) {
  const { mode } = useAppStore();
  const { setNodes, setEdges, resetGraph } = useGraphStore();
  const { mode: canvasMode, replaceCanvasFormula, addFormulaToCanvas, canvasFormulaIds } = useCanvasStore();

  // Handle mode switching: clear graph when switching modes
  useEffect(() => {
    // Reset graph store when mode changes to avoid showing stale graphs from previous mode
    resetGraph();
    // Clear canvas formula IDs when switching app modes
    useCanvasStore.getState().clearCanvas();
  }, [mode, resetGraph]);

  /**
   * Generate graph for a single formula and merge with existing graph
   * Used both for selected formula changes and for restoring multiple formulas from URL
   */
  const generateAndMergeGraph = async (
    formulaId: string,
    formula: FormulaDefinition,
    isInitialLoad = false
  ) => {
    const { nodes, edges } = await generateFormulaGraph(formula);
    
    if (canvasMode === "single") {
      // Single mode: replace entire graph
      replaceCanvasFormula(formulaId);
      setNodes(nodes);
      setEdges(edges);
      setNodeDimensionsMap(new Map());
      // Fit view after layout updates
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
      });
    } else {
      // Multi mode: append formula to canvas
      const currentCanvasFormulaIds = useCanvasStore.getState().canvasFormulaIds;
      
      // Check if formula is already on canvas (skip if already processed)
      if (!currentCanvasFormulaIds.includes(formulaId)) {
        addFormulaToCanvas(formulaId);
      }
      
      // Check if graph nodes for this formula already exist
      const { nodes: currentNodes } = useGraphStore.getState();
      const formulaPrefix = `${formulaId}-`;
      const hasFormulaNodes = currentNodes.some((node) => node.id.startsWith(formulaPrefix));
      
      // Only generate graph if nodes don't exist yet
      if (!hasFormulaNodes || isInitialLoad) {
        // Prefix node IDs to avoid conflicts
        const { nodes: prefixedNodes, edges: prefixedEdges } = prefixNodeIds(
          nodes,
          edges,
          formulaId
        );

        // Get current nodes and edges from store (to ensure we have latest state)
        const { nodes: currentNodes, edges: currentEdges } = useGraphStore.getState();
        
        // Merge with existing nodes and edges
        const mergedNodes = [...currentNodes, ...prefixedNodes];
        const mergedEdges = [...currentEdges, ...prefixedEdges];

        // Recalculate layout for the entire merged graph
        applyELKLayout(mergedNodes, mergedEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setNodeDimensionsMap(new Map());
          // Fit view after layout updates
          requestAnimationFrame(() => {
            reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
          });
        });
      }
    }
  };

  // Generate graph when formula ID changes (not when formula object reference changes)
  // This ensures layout is only calculated once per formula switch, not on every render
  useEffect(() => {
    if (!selectedFormulaId || !selectedFormula) {
      // When no formula is selected, ensure graph is cleared (only in single mode)
      if (canvasMode === "single") {
        resetGraph();
        setNodeDimensionsMap(new Map());
      }
      return;
    }

    // Generate graph for selected formula
    generateAndMergeGraph(selectedFormulaId, selectedFormula, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedFormulaId, // Only depend on ID to ensure layout is calculated once per formula switch
    canvasMode, // Re-run when canvas mode changes
    // Note: selectedFormula, currentNodes, currentEdges, canvasFormulaIds are used inside but not in deps
    // to avoid re-runs when object references change
    // setNodes, setEdges, resetGraph, reactFlowInstanceRef, setNodeDimensionsMap are stable refs
  ]);

  /**
   * Handle multi-formula mode restoration from URL
   * When canvasFormulaIds changes and we're in multi mode, generate graphs for all formulas
   * This is especially important when restoring from URL
   */
  useEffect(() => {
    if (canvasMode !== "multi" || !formulaDefinitions || canvasFormulaIds.length === 0) {
      return;
    }

    // Check which formulas on canvas don't have graph nodes yet
    const { nodes: currentNodes } = useGraphStore.getState();
    const formulasToGenerate: Array<{ id: string; formula: FormulaDefinition }> = [];

    for (const formulaId of canvasFormulaIds) {
      const formulaPrefix = `${formulaId}-`;
      const hasFormulaNodes = currentNodes.some((node) => node.id.startsWith(formulaPrefix));
      
      if (!hasFormulaNodes) {
        const formula = formulaDefinitions.find((f) => f.id === formulaId);
        if (formula) {
          formulasToGenerate.push({ id: formulaId, formula });
        }
      }
    }

    // Generate graphs for all formulas that don't have nodes yet
    if (formulasToGenerate.length > 0) {
      console.log("[useGraphGeneration] Generating graphs for formulas from canvas", {
        formulasToGenerate: formulasToGenerate.map((f) => f.id),
      });

      // Generate graphs sequentially to avoid race conditions
      const generateSequentially = async () => {
        for (const { id, formula } of formulasToGenerate) {
          await generateAndMergeGraph(id, formula, true);
        }
      };

      generateSequentially();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasFormulaIds, canvasMode, formulaDefinitions]);
}

