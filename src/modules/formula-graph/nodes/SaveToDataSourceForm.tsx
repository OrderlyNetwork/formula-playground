import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X } from "lucide-react";
import { useDataSourceStore } from "@/store/dataSourceStore";

interface SaveToDataSourceFormProps {
  /** The value to save to data source */
  value: unknown;
  /** Optional unit for the value */
  unit?: string;
  /** Optional description for the value */
  description?: string;
  /** The node ID associated with this save operation */
  nodeId: string;
}

/**
 * SaveToDataSourceForm - Form component for saving output values to data sources
 * Extracted as a separate component to improve performance by isolating state changes
 */
export const SaveToDataSourceForm = memo(function SaveToDataSourceForm({
  value,
  unit,
  description,
  nodeId,
}: SaveToDataSourceFormProps) {
  const { saveDataSource } = useDataSourceStore();

  // State for save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSavingMode, setIsSavingMode] = useState(false);

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

    if (value === undefined) {
      return; // Don't save if value is undefined
    }

    setIsSaving(true);
    try {
      await saveDataSource(saveName.trim(), value, unit, description, nodeId);
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
  );
});

