import React, { useState, useMemo } from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { ColumnDef } from "@/types/spreadsheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { sanitizeJsonStringify } from "@/utils/sanitization";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArrayCellProps {
  rowId: string;
  column: ColumnDef;
  onCellClick?: (rowId: string, colId: string) => void;
}

export const ArrayCell: React.FC<ArrayCellProps> = ({
  rowId,
  column,
  onCellClick,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [editValue, setEditValue] = useState("");

  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);
  const formulaId = currentFormula?.id || "default";
  const getTabGridStore = useSpreadsheetStore((state) => state.getTabGridStore);

  const gridStore = getTabGridStore(formulaId);
  const cellValue = gridStore?.getValue(rowId, column.id);

  const { displayText, arrayData, isValidArray } = useMemo(() => {
    // Try to parse if it's a string
    let parsedValue = cellValue;
    if (typeof cellValue === "string" && cellValue.startsWith("[")) {
      try {
        parsedValue = JSON.parse(cellValue);
      } catch {
        // If parsing fails, treat as non-array
        parsedValue = cellValue;
      }
    }

    if (Array.isArray(parsedValue)) {
      return {
        displayText: `${column.title || column.id} (${parsedValue.length})`,
        arrayData: parsedValue,
        isValidArray: true,
      };
    }
    return {
      displayText: "",
      arrayData: [],
      isValidArray: true,
    };
  }, [cellValue, column.title, column.id]);

  // console.log("arrayData", arrayData, isValidArray);

  const handleClick = () => {
    if (isValidArray) {
      setEditValue(sanitizeJsonStringify(arrayData, null, 2));
      setIsPopoverOpen(true);
    } else {
      onCellClick?.(rowId, column.id);
    }
  };

  const handleSave = () => {
    if (!gridStore) return;

    try {
      const parsedValue = JSON.parse(editValue);
      if (Array.isArray(parsedValue)) {
        // Convert array to JSON string for storage (CellValue type constraint)
        gridStore.setValue(rowId, column.id, JSON.stringify(parsedValue));
        setIsPopoverOpen(false);
      } else {
        alert("Invalid array format. Please enter a valid JSON array.");
      }
    } catch {
      alert("Invalid JSON format. Please check your input.");
    }
  };

  const handleCancel = () => {
    setIsPopoverOpen(false);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            `w-full h-full px-2 flex items-center text-sm cursor-pointer relative group/array-cell`
          )}
          onClick={handleClick}
          tabIndex={0}
          data-popover-open={isPopoverOpen ? "true" : undefined}
          title={
            isValidArray
              ? `Click to edit array (${arrayData.length} items)`
              : "No array data"
          }
        >
          {displayText}

          <Maximize2
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/array-cell:opacity-100 transition-opacity"
          />
        </div>
      </PopoverTrigger>

      {isValidArray && (
        <PopoverContent className="w-96" align="start" side="bottom">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-gray-700">
                Edit Array Data
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Row: {rowId} | Column: {column.title || column.id}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Array Content (JSON format):
              </label>
              <Textarea
                value={editValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditValue(e.target.value)
                }
                className="font-mono text-sm min-h-[200px] max-h-[400px]"
                placeholder='["item1", "item2", ...]'
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};
