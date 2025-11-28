import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useMemo } from "react";

/**
 * ColInfo Component
 *
 * Displays information about the currently active/editing column
 * Shows: column title, type, and ID
 */
export const ColInfo = () => {
  // Get active cell from store
  const activeCell = useSpreadsheetStore((state) => state.activeCell);
  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);

  // Get columns for the current tab
  const columns = useSpreadsheetStore((state) => {
    if (!currentFormula?.id) return state.columns;
    return state.tabColumns[currentFormula.id] || state.columns;
  });

  // Find the active column definition
  const activeColumn = useMemo(() => {
    if (!activeCell?.colId) return null;
    return columns.find((col) => col.id === activeCell.colId) || null;
  }, [activeCell, columns]);

  /**
   * Recursively find the parameter definition from formula inputs
   * based on activeColumn.id path (e.g., "inputs.symbol" or "side")
   */
  const currentFormulaParameter = useMemo(() => {
    if (!currentFormula || !activeColumn) return null;

    const inputs = currentFormula.inputs;
    if (!inputs) return null;

    // Parse the column id path (e.g., "inputs.symbol" -> ["inputs", "symbol"])
    const paths = activeColumn.id.split(".");

    /**
     * Recursively search for parameter definition in nested structure
     * @param params - Array of parameter definitions to search
     * @param pathIndex - Current index in the path array
     * @returns The found parameter definition or null
     */
    const findParameter = (params: any[], pathIndex: number): any => {
      if (pathIndex >= paths.length) return null;

      const currentKey = paths[pathIndex];

      // Find the parameter with matching key
      const param = params.find((p) => p.key === currentKey);
      if (!param) return null;

      // If this is the last key in the path, return the parameter
      if (pathIndex === paths.length - 1) {
        return param;
      }

      // If there are more keys in the path, recurse into properties
      const properties = param.factorType?.properties;
      if (!properties || !Array.isArray(properties)) return null;

      return findParameter(properties, pathIndex + 1);
    };

    return findParameter(inputs, 0);
  }, [currentFormula, activeColumn]);

  /**
   * Extract the description from the found parameter definition
   */
  const fieldDescription = useMemo(() => {
    if (!currentFormulaParameter) return null;
    return currentFormulaParameter.description || null;
  }, [currentFormulaParameter]);

  // If no active cell or column, show placeholder
  if (!activeCell || !activeColumn) {
    return (
      <div className="text-xs text-gray-400 h-full flex items-center px-3 bg-gray-50 border-gray-200">
        <span className="italic">No cell selected</span>
      </div>
    );
  }

  // Display column information
  return (
    <div className="text-xs text-gray-500 h-full flex items-center px-3 bg-gray-50 border-gray-200 gap-2">
      {/* Column Title */}
      <div className="">{activeColumn.title || "Untitled"}</div>

      {/* Column Type */}
      {activeColumn.type && (
        <div className="bg-gray-100 rounded-md px-2 py-0.5">
          {currentFormulaParameter?.type}
        </div>
      )}

      {/* Field Description */}
      {fieldDescription && (
        <div className="">
          {/* <span className="font-semibold text-gray-600">Description:</span> */}
          <span className=" text-xs">{fieldDescription}</span>
        </div>
      )}

      {/* Editable Status */}
      {activeColumn.editable === false && (
        <div className="flex items-center">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            Read-only
          </span>
        </div>
      )}
    </div>
  );
};
