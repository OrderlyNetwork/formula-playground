import { useEffect, useRef, useState } from "react";
import type { ReactFlowInstance } from "reactflow";
import { applyELKLayout, type NodeDimensionsMap } from "@/modules/formula-graph";
import { useGraphStore } from "@/store/graphStore";

/**
 * Hook to handle node dimensions changes and layout recalculation
 * @param reactFlowInstanceRef - Reference to ReactFlow instance for fitting view
 * @returns Node dimensions map state and setter
 */
export function useNodeDimensions(
  reactFlowInstanceRef: React.RefObject<ReactFlowInstance | null>
) {
  const { setNodes } = useGraphStore();
  const [nodeDimensionsMap, setNodeDimensionsMap] = useState<NodeDimensionsMap>(
    new Map()
  );
  const nodeDimensionsMapRef = useRef<NodeDimensionsMap>(new Map());
  const layoutRecalculationTimeoutRef = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    nodeDimensionsMapRef.current = nodeDimensionsMap;
  }, [nodeDimensionsMap]);

  /**
   * Recalculate layout when node dimensions change
   */
  useEffect(() => {
    const handleNodeDimensionsChanged = (
      event: CustomEvent<{
        nodeId: string;
        width: number;
        height: number;
      }>
    ) => {
      const { nodeId, width, height } = event.detail;

      // Update dimensions map
      setNodeDimensionsMap((prev) => {
        const updated = new Map(prev);
        updated.set(nodeId, { width, height });
        return updated;
      });

      // Debounce layout recalculation to avoid excessive recalculations
      if (layoutRecalculationTimeoutRef.current) {
        clearTimeout(layoutRecalculationTimeoutRef.current);
      }

      layoutRecalculationTimeoutRef.current = window.setTimeout(async () => {
        const currentNodes = useGraphStore.getState().nodes;
        const currentEdges = useGraphStore.getState().edges;

        // Only recalculate if we have measured dimensions for at least some nodes
        if (currentNodes.length > 0) {
          // Use current dimensions map from ref (includes latest updates)
          const currentDimensions = new Map(nodeDimensionsMapRef.current);
          currentDimensions.set(nodeId, { width, height });

          // Recalculate layout with measured dimensions
          const { nodes: layoutedNodes } = await applyELKLayout(
            currentNodes,
            currentEdges,
            currentDimensions
          );

          setNodes(layoutedNodes);

          // Fit view after layout update
          requestAnimationFrame(() => {
            reactFlowInstanceRef.current?.fitView?.({ padding: 0.2 });
          });
        }
      }, 300); // 300ms debounce
    };

    window.addEventListener(
      "node-dimensions-changed",
      handleNodeDimensionsChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "node-dimensions-changed",
        handleNodeDimensionsChanged as EventListener
      );
      if (layoutRecalculationTimeoutRef.current) {
        clearTimeout(layoutRecalculationTimeoutRef.current);
      }
    };
  }, [setNodes, reactFlowInstanceRef]);

  return { nodeDimensionsMap, setNodeDimensionsMap };
}

