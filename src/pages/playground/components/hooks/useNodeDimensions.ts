import { useEffect, useState } from "react";
import type { ReactFlowInstance } from "reactflow";
import type { NodeDimensionsMap } from "@/modules/formula-graph";

/**
 * Hook to collect node dimensions without recalculating layout
 * Layout is only calculated once when switching formulas in useGraphGeneration hook.
 * This hook only collects dimensions for potential future use (e.g., improving initial layout).
 * 
 * @param reactFlowInstanceRef - Reference to ReactFlow instance (unused but kept for API consistency)
 * @returns Node dimensions map state and setter
 */
export function useNodeDimensions(
  reactFlowInstanceRef: React.RefObject<ReactFlowInstance | null>
) {
  const [nodeDimensionsMap, setNodeDimensionsMap] = useState<NodeDimensionsMap>(
    new Map()
  );

  /**
   * Collect node dimensions when they change, but don't recalculate layout
   * Layout recalculation is disabled to prevent fitView issues and unexpected view jumps.
   * Layout is only calculated once when switching formulas.
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

      // Only update dimensions map for potential future use
      // Do NOT recalculate layout here to avoid fitView issues
      setNodeDimensionsMap((prev) => {
        const updated = new Map(prev);
        updated.set(nodeId, { width, height });
        return updated;
      });
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
    };
  }, []);

  return { nodeDimensionsMap, setNodeDimensionsMap };
}

