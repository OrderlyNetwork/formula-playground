import type { ColumnDef, RowDef, CellValue } from "@/types/spreadsheet";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import type { TableRow } from "@/modules/formula-datasheet/types";

/**
 * Generate unique identifier for rows
 */
export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Generate columns from formula flattened paths
 */
export const generateColumnsFromFormula = (
  flattenedPaths: FlattenedPath[]
): ColumnDef[] => {
  const columns: ColumnDef[] = [];

  // Add columns from formula inputs
  flattenedPaths.forEach((path) => {
    const widthMap: Record<string, number> = {
      number: 200,
      string: 200,
      boolean: 100,
      object: 250,
    };

    const width = widthMap[path.factorType.baseType] || 150;

    columns.push({
      id: path.path,
      title: path.header,
      width,
      type: path.factorType.baseType === "number" ? "number" : "text",
      locked: true,
      editable: true,
    });
  });

  // Add Result column (sticky right)
  columns.push({
    id: "result",
    title: "Result",
    width: 150,
    type: "custom",
    locked: true,
    editable: false,
    sticky: "right",
    render: (val: CellValue) => {
      const strVal = String(val || "");

      // Check if it's an error
      if (strVal.startsWith("Error:")) {
        return (
          <div className="text-red-600 text-xs px-2 truncate">{strVal}</div>
        );
      }

      // Display result
      if (strVal && strVal !== "") {
        return (
          <div className="text-gray-900 text-sm px-2 font-mono text-right truncate">
            {strVal}
          </div>
        );
      }

      return <div className="text-gray-400 text-sm px-2">-</div>;
    },
  });

  return columns;
};

/**
 * Generate rows with minimum 50 entries
 * If formulaRows provided, use their IDs; otherwise generate new IDs
 * Always ensures at least 50 rows exist
 */
export const generateRows = (formulaRows?: TableRow[]): RowDef[] => {
  const rows: RowDef[] = [];

  // First, add formula rows if provided
  if (formulaRows && formulaRows.length > 0) {
    formulaRows.forEach((row) => {
      rows.push({ id: row.id });
    });
  }

  // Then pad to minimum 50 rows
  while (rows.length < 50) {
    rows.push({ id: generateId() });
  }

  return rows;
};

/**
 * Helper function to convert FormulaScalar to CellValue
 */
export const toCellValue = (value: unknown): CellValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return String(value);
  // For objects and arrays, convert to JSON string
  return JSON.stringify(value);
};

/**
 * Get sticky style for columns
 */
export const getStickyStyle = (
  col: ColumnDef,
  isHeader: boolean
): { style: React.CSSProperties; className: string } => {
  if (!col.sticky) return { style: {}, className: "" };

  const style: React.CSSProperties = { position: "sticky" };
  let className = isHeader ? "z-30" : "z-20"; // Headers higher than body

  if (col.sticky === "right") {
    style.right = 0;
    className +=
      " border-l border-grid-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]";
  } else if (col.sticky === "left") {
    style.left = 40;
    className +=
      " border-r border-grid-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]";
  }

  return { style, className };
};

