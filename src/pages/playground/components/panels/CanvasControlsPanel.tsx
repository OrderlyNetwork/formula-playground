import { useCallback } from "react";
import { Panel } from "reactflow";
import { useCanvasStore } from "@/store/canvasStore";
import { useGraphStore } from "@/store/graphStore";
import { useHistoryStore } from "@/store/historyStore";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/common/Button";
import { Camera, Save } from "lucide-react";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Canvas controls panel component
 * Provides canvas mode toggle and save snapshot functionality
 */
export function CanvasControlsPanel() {
  const { mode: canvasMode, toggleMode, formulaParams } = useCanvasStore();
  const { nodes: storeNodes, edges: storeEdges } = useGraphStore();
  const { saveCanvasSnapshot } = useHistoryStore();

  /**
   * Handle save canvas snapshot button click
   * Collects current canvas state and saves it to history
   */
  const handleSaveSnapshot = useCallback(async () => {
    try {
      await saveCanvasSnapshot(
        storeNodes,
        storeEdges,
        formulaParams,
        canvasMode
      );
    } catch (error) {
      console.error("Failed to save canvas snapshot:", error);
    }
  }, [storeNodes, storeEdges, formulaParams, canvasMode, saveCanvasSnapshot]);

  return (
    <Panel position="top-right">
      <div className="flex gap-2">
        {/* Canvas mode toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  checked={canvasMode === "multi"}
                  onCheckedChange={toggleMode}
                  aria-label={`Switch to ${
                    canvasMode === "single" ? "multi" : "single"
                  } formula mode`}
                />
                <span className="text-xs text-gray-700">Composite</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="text-xs">
                {canvasMode === "single"
                  ? "Single formula mode: selecting a formula from the list replaces the current formula on the canvas."
                  : "Composite formula mode: selecting a formula from the list appends it to the canvas, allowing each formula's output to serve as another formula's input."}
              </p>
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Save snapshot button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSnapshot}
                className="flex items-center gap-1.5"
              >
                <Camera size={16} />
                <span className="text-xs">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <p className="text-xs">
                Save current canvas state (nodes, edges, and formula parameters)
                to history
              </p>
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Panel>
  );
}
