import { Handle, Position } from "reactflow";
import { Fragment, memo, useMemo, useState, useCallback } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { getConnectionConfigFromFactorType } from "../utils/nodeTypes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

interface ObjectNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

const HEADER_HEIGHT = 44;
const HANDLE_GAP = 24;
const HEADER_TO_FIRST_HANDLE_GAP = 12;
const BOTTOM_PADDING = 12;

export const ObjectNode = memo(function ObjectNode({
  id,
  data,
  selected,
}: ObjectNodeProps) {
  // Collapse/expand state management
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Access graph store to manage connected nodes and edges visibility
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes,
    setEdges,
  } = useGraphStore();

  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;

  // Find all edges connected to this ObjectNode (incoming edges)
  const connectedEdges = useMemo(() => {
    return storeEdges.filter((edge) => edge.target === id);
  }, [storeEdges, id]);

  // Find all source nodes connected to this ObjectNode
  const connectedSourceNodeIds = useMemo(() => {
    return new Set(connectedEdges.map((edge) => edge.source));
  }, [connectedEdges]);

  /**
   * Handle collapse/expand toggle and update visibility of connected nodes and edges
   */
  const handleToggleCollapse = useCallback(
    (newCollapsedState: boolean) => {
      setIsCollapsed(newCollapsedState);

      // Update visibility of connected nodes and edges
      if (connectedEdges.length === 0) return;

      // Update edges: set hidden property based on collapse state
      const updatedEdges = storeEdges.map((edge) => {
        if (edge.target === id) {
          return { ...edge, hidden: newCollapsedState };
        }
        return edge;
      });

      // Update nodes: set hidden property for connected source nodes
      const updatedNodes = storeNodes.map((node) => {
        if (connectedSourceNodeIds.has(node.id)) {
          return { ...node, hidden: newCollapsedState };
        }
        return node;
      });

      setEdges(updatedEdges);
      setNodes(updatedNodes);
    },
    [
      id,
      connectedEdges,
      connectedSourceNodeIds,
      storeEdges,
      storeNodes,
      setEdges,
      setNodes,
    ]
  );

  // Dynamic height calculation based on collapse state
  const containerMinHeight = isCollapsed
    ? HEADER_HEIGHT + BOTTOM_PADDING
    : HEADER_HEIGHT +
      HEADER_TO_FIRST_HANDLE_GAP +
      Math.max(1, handleCount) * HANDLE_GAP +
      BOTTOM_PADDING;

  // Generate dynamic connection configuration for each property
  const propertyConfigs = useMemo(() => {
    const configs = new Map<
      string,
      { acceptedTypes: string[]; allowArray: boolean }
    >();

    inputs.forEach((input) => {
      const config = getConnectionConfigFromFactorType(
        input.factorType || {
          baseType: input.type,
          nullable: true,
        }
      );
      configs.set(input.key, {
        acceptedTypes: config.acceptedTypes,
        allowArray: config.allowArray || false,
      });
    });

    return configs;
  }, [inputs]);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 bg-white shadow-sm min-w-[240px] relative",
        "border-sky-500",
        data.isError && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-sky-600 shadow-lg ring-2 ring-sky-200"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      <div className="font-semibold text-gray-900 mb-1 flex items-center justify-between gap-2">
        <span>Object: {data.label}</span>
        {handleCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCollapse(!isCollapsed);
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
            title={isCollapsed ? "展开" : "折叠"}
            aria-label={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>
      {data.description && (
        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {inputs.map((input, index) => {
        const config = propertyConfigs.get(input.key);
        const acceptedTypesText = config
          ? `Accepts: ${config.acceptedTypes.join(", ")}${
              config.allowArray ? " (or arrays)" : ""
            }`
          : `Accepts: ${input.type}`;

        return (
          <Fragment key={input.key}>
            <Handle
              id={input.key}
              type="target"
              position={Position.Left}
              className={cn(
                "w-3 h-3 bg-sky-500",
                isCollapsed && "opacity-0 pointer-events-none"
              )}
              style={{
                top:
                  HEADER_HEIGHT +
                  6 +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  index * HANDLE_GAP,
              }}
              title={`${input.key}: ${acceptedTypesText}`}
            />
            <span
              className={cn(
                "absolute text-[10px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-1 py-0.5",
                isCollapsed && "hidden"
              )}
              style={{
                top:
                  HEADER_HEIGHT -
                  4 +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  index * HANDLE_GAP,
                left: 16,
              }}
              title={`${input.key}: ${input.type}${
                input.unit ? ` (${input.unit})` : ""
              }`}
            >
              {input.key}
              {input.unit && (
                <span className="text-[8px] ml-1">({input.unit})</span>
              )}
            </span>
          </Fragment>
        );
      })}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-sky-500"
      />
    </div>
  );
});
