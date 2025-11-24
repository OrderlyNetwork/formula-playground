/**
 * Hook for managing stable row IDs across formula switches
 * Ensures the same rowId is reused when switching back to a formula
 */

import { useCallback, useRef } from "react";

/**
 * Custom hook to manage stable row IDs per formula
 * @returns Function to get or create a stable row ID
 */
export function useStableRowIds() {
  // Store stable row IDs per formula to maintain consistency across formula switches
  // Key: formulaId, Value: array of stable row IDs
  const formulaRowIdsRef = useRef<Map<string, string[]>>(new Map());

  /**
   * Get or create a stable row ID for a formula and row index
   * This ensures the same rowId is reused when switching back to a formula
   */
  const getStableRowId = useCallback(
    (formulaId: string, rowIndex: number): string => {
      if (!formulaRowIdsRef.current.has(formulaId)) {
        formulaRowIdsRef.current.set(formulaId, []);
      }

      const rowIds = formulaRowIdsRef.current.get(formulaId)!;

      // If we don't have a rowId for this index yet, create one
      if (!rowIds[rowIndex]) {
        rowIds[rowIndex] = `row-${formulaId}-${rowIndex}`;
      }

      return rowIds[rowIndex];
    },
    []
  );

  return { getStableRowId };
}

