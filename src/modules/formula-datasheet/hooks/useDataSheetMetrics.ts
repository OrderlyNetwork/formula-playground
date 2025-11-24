/**
 * Hook for calculating and updating data sheet metrics
 * Tracks execution times and updates the calculation status store
 */

import { useMemo, useEffect, useRef } from "react";
import { useCalculationStatusStore } from "@/store/calculationStatusStore";
import type { FormulaDefinition } from "@/types/formula";
import type { TableRow, MetricsData } from "../types";

interface UseDataSheetMetricsOptions {
  formula?: FormulaDefinition;
  rows: TableRow[];
}

/**
 * Custom hook to calculate and update execution metrics
 */
export function useDataSheetMetrics({
  formula,
  rows,
}: UseDataSheetMetricsOptions) {
  const updateMetrics = useCalculationStatusStore(
    (state) => state.updateMetrics
  );

  // Calculate metrics data
  const metricsData = useMemo<MetricsData | null>(() => {
    if (!formula || rows.length === 0) return null;

    const calculatedRows = rows.filter(
      (row) => row._executionTime !== undefined
    );
    const totalTime = calculatedRows.reduce(
      (sum, row) => sum + (row._executionTime || 0),
      0
    );
    const averageTime =
      calculatedRows.length > 0 ? totalTime / calculatedRows.length : 0;

    return {
      totalTime,
      averageTime,
      calculatedRows: calculatedRows.length,
      totalRows: rows.length,
    };
  }, [formula, rows]);

  // Track previous metrics to avoid redundant updates
  const prevMetricsRef = useRef<string>("");

  useEffect(() => {
    if (!formula || !metricsData) return;

    const metricsStr = JSON.stringify(metricsData);
    if (metricsStr === prevMetricsRef.current) return;

    prevMetricsRef.current = metricsStr;
    updateMetrics(formula.id, metricsData);
  }, [formula, metricsData, updateMetrics]);

  return { metricsData };
}

