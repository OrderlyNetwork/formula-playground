import React from "react";
import type { GridStore } from "@/store/spreadsheet";

export type CellValue = string | number | null;

export type ColumnType = "text" | "number" | "custom" | "result";

export interface ColumnDef {
  id: string;
  title: string;
  width: number;
  type: ColumnType;
  locked?: boolean; // Cannot be deleted
  editable?: boolean; // If false, is a computed column
  /**
   * Custom renderer function
   * @param rowId - Row identifier for data lookup
   * @param column - Column definition
   * @param store - GridStore for accessing cell values
   * @returns React node to render in cell
   */
  render?: (rowId: string, column: ColumnDef, store: GridStore) => React.ReactNode;
  sticky?: "left" | "right"; // Fixed position
}

export interface RowDef {
  id: string;
}

// Event types for the store
export type StoreListener = (value: CellValue) => void;
