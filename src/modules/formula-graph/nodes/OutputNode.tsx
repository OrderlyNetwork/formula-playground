import { Handle, Position } from "reactflow";
import { memo, useEffect, useMemo, useState } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graphStore";
import { useDataSourceStore } from "@/store/dataSourceStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X } from "lucide-react";

interface OutputNodeProps {
  id: string;
  data: FormulaNodeData;
}

/**
 * OutputNode - Custom React Flow node for formula outputs
 * Reactively listens to upstream node data changes and automatically updates
 */
export const OutputNode = memo(function OutputNode({
  id,
  data,
}: OutputNodeProps) {
  const { edges, nodes, updateNodeData } = useGraphStore();
  const { saveDataSource } = useDataSourceStore();

  // State for save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSavingMode, setIsSavingMode] = useState(false);

  // Find the upstream node connected to this OutputNode (via edge)
  const incomingEdge = useMemo(() => {
    if (!edges || !Array.isArray(edges)) return undefined;
    return edges.find((edge) => edge.target === id);
  }, [edges, id]);

  const sourceNode = useMemo(() => {
    if (!incomingEdge || !nodes || !Array.isArray(nodes)) return null;
    return nodes.find((n) => n.id === incomingEdge.source);
  }, [nodes, incomingEdge]);

  // Reactively listen to upstream node value changes
  useEffect(() => {
    if (!sourceNode || !incomingEdge) return;

    // If the upstream node is a FormulaNode, its value changes are automatically updated via notifyUpstreamNodeChange
    // This is mainly for handling other types of upstream nodes (if any in the future)
    if (sourceNode.type === "formula") {
      // FormulaNode value changes are already handled by runnerService, no additional processing needed here
      return;
    }

    // For other types of source nodes, get the value directly from their data.value
    const sourceValue = sourceNode.data?.value;
    if (sourceValue !== undefined && data.value !== sourceValue) {
      // If there's a sourceHandle, may need to extract a specific field from the object
      let valueToUse: unknown = sourceValue;
      if (
        incomingEdge.sourceHandle &&
        typeof sourceValue === "object" &&
        sourceValue !== null
      ) {
        const key = incomingEdge.sourceHandle;
        valueToUse = (sourceValue as Record<string, unknown>)[key];
      }

      if (data.value !== valueToUse) {
        updateNodeData(id, { value: valueToUse });
      }
    }
  }, [sourceNode, incomingEdge, data.value, id, updateNodeData]);

  /**
   * Handle save button click - toggle save mode
   */
  const handleSaveClick = () => {
    setIsSavingMode(true);
    setSaveName("");
  };

  /**
   * Handle cancel save
   */
  const handleCancelSave = () => {
    setIsSavingMode(false);
    setSaveName("");
  };

  /**
   * Handle confirm save - save the current value to data source
   */
  const handleConfirmSave = async () => {
    if (!saveName.trim()) {
      return; // Don't save if name is empty
    }

    if (data.value === undefined) {
      return; // Don't save if value is undefined
    }

    setIsSaving(true);
    try {
      await saveDataSource(
        saveName.trim(),
        data.value,
        data.unit,
        data.description,
        id
      );
      // Reset save mode after successful save
      setIsSavingMode(false);
      setSaveName("");
    } catch (error) {
      console.error("Failed to save data source:", error);
      // Keep save mode open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle Enter key press in save name input
   */
  const handleSaveNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && saveName.trim()) {
      handleConfirmSave();
    } else if (e.key === "Escape") {
      handleCancelSave();
    }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm w-[220px]",
        "border-green-400",
        data.isError && "border-red-500",
        data.diff !== undefined &&
          data.diff > 1e-10 &&
          "border-orange-500 shadow-lg"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex flex-col gap-1">
        <div className="font-medium text-gray-900">{data.label}</div>
        {data.value !== undefined && (
          <div className="text-sm text-gray-700 font-mono">
            {typeof data.value === "number"
              ? data.value.toFixed(8)
              : String(data.value)}
            {data.unit && (
              <span className="ml-1 text-xs text-gray-500">{data.unit}</span>
            )}
          </div>
        )}
        {data.diff !== undefined && data.diff > 0 && (
          <div className="text-xs text-orange-600 font-medium mt-1">
            Diff: {data.diff.toExponential(2)}
          </div>
        )}
        {data.description && (
          <div className="text-xs text-gray-500 mt-1 text-left">
            {data.description}
          </div>
        )}

        {/* Save to DataSource section */}
        {data.value !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            {!isSavingMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveClick}
                className="w-full h-7 text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                Save to Data Source
              </Button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Input
                  type="text"
                  placeholder="Enter data source name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={handleSaveNameKeyDown}
                  className="h-7 text-xs"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConfirmSave}
                    disabled={!saveName.trim() || isSaving}
                    className="flex-1 h-7 text-xs"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelSave}
                    disabled={isSaving}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
