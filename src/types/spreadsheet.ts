import React from "react";

export type CellValue = string | number | null;

export type ColumnType = "text" | "number" | "custom";

export interface ColumnDef {
  id: string;
  title: string;
  width: number;
  type: ColumnType;
  locked?: boolean; // Cannot be deleted
  editable?: boolean; // If false, is a computed column
  render?: (value: CellValue) => React.ReactNode; // Custom renderer function
  sticky?: "left" | "right"; // Fixed position
}

export interface RowDef {
  id: string;
}

// Event types for the store
export type StoreListener = (value: CellValue) => void;
