import type { ColumnDef, RowDef, CellValue } from "@/types/spreadsheet";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import type { TableRow } from "@/modules/formula-datasheet/types";
import type { GridStore } from "@/store/spreadsheet";
import ResultCell from "./ResultCell";

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

    // Use wider column for arrays
    const baseWidth = widthMap[path.factorType.baseType] || 150;
    const width = path.factorType.array ? 300 : baseWidth;

    // Map base types to column types
    let columnType: "text" | "number" | "array" = "text";
    if (path.factorType.array) {
      columnType = "array";
    }

    columns.push({
      id: path.path,
      title: path.header,
      width,
      type: columnType,
      locked: true,
      editable: true,
    });
  });

  // Add Result column (sticky right)
  // Uses type="result" to trigger ResultCell renderer in Cell container
  columns.push({
    id: "result",
    title: "Result",
    width: 150,
    type: "result" as const,
    locked: true,
    editable: false,
    sticky: "right",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render: (rowId: string, column: ColumnDef, _: GridStore) => {
      return <ResultCell rowId={rowId} column={column} />;
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
  // For objects and arrays, convert to JSON string with cleanup
  const jsonString = JSON.stringify(value);
  // Clean up common over-escaped Unicode sequences
  return jsonString
    .replace(/\\u0022/g, '"')
    .replace(/\\u0027/g, "'")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&");
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
