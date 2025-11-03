import { useCallback } from "react";
import type { ReactFlowInstance } from "reactflow";
import { useGraphStore } from "@/store/graphStore";

/**
 * Hook to handle drag and drop functionality for creating nodes from data sources
 * @param reactFlowInstanceRef - Reference to ReactFlow instance for position projection
 * @returns Drag and drop event handlers
 */
export function useGraphDragDrop(
  reactFlowInstanceRef: React.RefObject<ReactFlowInstance | null>
) {
  const { nodes: storeNodes, setNodes } = useGraphStore();

  /**
   * Handle drag over event to allow dropping
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Handle drop event to create new node from data source
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      try {
        const dropData = JSON.parse(data);
        const { type, sourceId, label, description, method, url, topic } =
          dropData;

        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = reactFlowInstanceRef.current?.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        if (!position) return;

        // Create new node based on data source type with pre-configured settings
        const nodeId = `${type}-${sourceId}-${Date.now()}`;
        const newNode = {
          id: nodeId,
          type,
          position,
          data: {
            id: nodeId,
            type,
            label,
            description,
            ...(type === "api" && {
              apiConfig: {
                method: method || "GET",
                url: url || "",
              },
            }),
            ...(type === "websocket" && {
              wsConfig: {
                url: url || "",
                status: "disconnected" as const,
                topic,
              },
            }),
          },
        };

        setNodes([...storeNodes, newNode]);
      } catch (error) {
        console.error("Failed to parse drop data:", error);
      }
    },
    [storeNodes, setNodes, reactFlowInstanceRef]
  );

  return { onDragOver, onDrop };
}

