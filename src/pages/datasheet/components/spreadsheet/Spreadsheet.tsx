import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { GridStore } from "@/store/spreadsheet";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import type { RowDef } from "@/types/spreadsheet";
import SpreadsheetToolbar from "./SpreadsheetToolbar";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SpreadsheetRow from "./SpreadsheetRow";
import { generateColumnsFromFormula } from "./spreadsheetUtils";
import { dataSheetCalculator } from "@/modules/formula-datasheet/services/dataSheetCalculator";
import { dataSheetStateTracker } from "@/modules/formula-datasheet/services/dataSheetStateTracker";
import {
  reconstructFormulaInputs,
  validateRow,
} from "@/utils/formulaTableUtils";

/**
 * Minimum number of rows to display in spreadsheet
 */
const MIN_ROWS = 50;

/**
 * Props interface for Spreadsheet component
 */
interface SpreadsheetProps {
  flattenedPaths?: FlattenedPath[];
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ flattenedPaths }) => {
  // Separate state and actions using selectors to avoid unnecessary re-renders
  const columns = useSpreadsheetStore((state) => state.columns);
  const rows = useSpreadsheetStore((state) => state.rows);
  const selection = useSpreadsheetStore((state) => state.selection);
  const isColumnsReady = useSpreadsheetStore((state) => state.isColumnsReady);
  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);

  // Get actions separately (they're stable and won't cause re-renders)
  const setColumns = useSpreadsheetStore((state) => state.setColumns);
  const setRows = useSpreadsheetStore((state) => state.setRows);
  const setIsColumnsReady = useSpreadsheetStore(
    (state) => state.setIsColumnsReady
  );
  const setRowResult = useSpreadsheetStore((state) => state.setRowResult);
  const addColumnAction = useSpreadsheetStore((state) => state.addColumn);
  const deleteColumnAction = useSpreadsheetStore((state) => state.deleteColumn);
  const toggleRowSelection = useSpreadsheetStore(
    (state) => state.toggleRowSelection
  );
  const toggleColumnSelection = useSpreadsheetStore(
    (state) => state.toggleColumnSelection
  );
  const updateSelectionOnCellClick = useSpreadsheetStore(
    (state) => state.updateSelectionOnCellClick
  );

  // Local state for row IDs is now managed by Zustand store

  // Convert rows from store to rowIds array for rendering
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  // GridStore for data calculation (stable ref)
  const storeRef = useRef<GridStore | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Handle row calculation when cell changes
   * Callback passed to GridStore to trigger formula execution
   * Gets all data directly from GridStore (single source of truth for input data)
   */
  const handleCalculateRow = useCallback(
    async (rowId: string, colId: string) => {
      console.log(
        "------->>>handleCalculateRow--------",
        rowId,
        colId,
        currentFormula
      );
      // Guard: Check if formula exists
      if (!currentFormula) {
        console.warn("No formula available for calculation");
        return;
      }

      // Guard: Check if GridStore exists
      if (!storeRef.current) {
        console.warn("GridStore not initialized");
        return;
      }

      // Guard: Check if row exists in GridStore
      if (!storeRef.current.hasRow(rowId)) {
        console.warn(`Row ${rowId} not found in GridStore`);
        return;
      }

      const calcStartTime = Date.now();

      try {
        // Read current data directly from GridStore (the single source of truth for input data)
        // This method automatically filters to only editable columns
        const currentRowData = storeRef.current.getRowData(rowId);

        // Validate the row data
        const validation = validateRow(
          { id: rowId, data: currentRowData },
          currentFormula
        );

        // Only calculate if row is valid
        if (!validation.isValid) {
          console.log(
            `Row ${rowId} validation failed:`,
            validation.errors.join(", ")
          );
          // Update calculation result with validation error (using map-based store)
          setRowResult(rowId, {
            isValid: false,
            error: validation.errors.join(", "),
            result: undefined,
          });
          return;
        }

        // Reconstruct formula inputs for tracking
        const inputs = reconstructFormulaInputs(currentRowData, currentFormula);

        // Execute formula calculation with fresh data from GridStore
        const result = await dataSheetCalculator.calculateRow(
          currentFormula,
          currentRowData
        );

        // Update calculation result in SpreadsheetStore (map-based: key -> result)
        // Note: Input data is in GridStore, Zustand store only stores calculation results
        setRowResult(rowId, {
          isValid: true,
          result: result.result,
          executionTime: result.executionTime,
          error: result.error,
        });

        // Record calculation event for debugging
        dataSheetStateTracker.recordCalculation(currentFormula.id, {
          timestamp: calcStartTime,
          rowId,
          formulaId: currentFormula.id,
          inputs,
          success: result.success,
          result: result.result,
          executionTime: result.executionTime,
          error: result.error,
          trigger: "cell-update",
        });

        console.log(
          `✓ Calculated row ${rowId} (triggered by ${colId}):`,
          result
        );
      } catch (error) {
        console.error(`Error calculating row ${rowId}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Update calculation result with error
        setRowResult(rowId, {
          isValid: false,
          error: errorMessage,
        });

        // Record failed calculation
        // Get row data from GridStore for tracking
        const rowData = storeRef.current!.getRowData(rowId);
        const inputs = reconstructFormulaInputs(rowData, currentFormula);
        dataSheetStateTracker.recordCalculation(currentFormula.id, {
          timestamp: calcStartTime,
          rowId,
          formulaId: currentFormula.id,
          inputs,
          success: false,
          error: errorMessage,
          trigger: "cell-update",
        });
      }
    },
    [currentFormula, setRowResult]
  );

  /**
   * Generate row definitions with minimum row count
   * Ensures at least MIN_ROWS rows exist for UI display
   */
  const generateRows = useCallback(
    (count: number, formulaId?: string): RowDef[] => {
      const rows: RowDef[] = [];
      const baseId = formulaId || "row";
      const targetCount = Math.max(count, MIN_ROWS);

      for (let i = 0; i < targetCount; i++) {
        rows.push({ id: `${baseId}_${i}` });
      }
      return rows;
    },
    []
  );

  // Initialize GridStore and Zustand store in useEffect to avoid state updates during render
  useEffect(() => {
    if (!isInitializedRef.current) {
      const initialColumns = flattenedPaths
        ? generateColumnsFromFormula(flattenedPaths)
        : [];

      // Generate initial rows
      const initialRows = generateRows(0, currentFormula?.id);

      // Initialize GridStore with calculation callback
      if (!storeRef.current) {
        storeRef.current = new GridStore(
          initialRows,
          initialColumns,
          handleCalculateRow
        );
      }

      // Initialize Zustand store
      setColumns(initialColumns);
      setRows(initialRows);
      setIsColumnsReady(flattenedPaths !== undefined);

      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - dependencies captured in closure

  // Sync columns when flattenedPaths changes
  useEffect(() => {
    if (!isInitializedRef.current) return; // Skip during initialization

    if (flattenedPaths !== undefined) {
      const newColumns =
        flattenedPaths.length > 0
          ? generateColumnsFromFormula(flattenedPaths)
          : [];
      setColumns(newColumns);
      setIsColumnsReady(true);
    }
  }, [flattenedPaths, setColumns, setIsColumnsReady]);

  // Sync GridStore when structure changes
  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.syncStructure(rows, columns);
    }
  }, [rows, columns]);

  // Track if initial data has been loaded to GridStore
  const lastSyncedFormulaRef = useRef<string | undefined>(undefined);

  // Initialize rows when formula changes
  useEffect(() => {
    if (!currentFormula) return;

    const currentFormulaId = currentFormula.id;

    // Check if this is a new formula (initial load or formula change)
    if (lastSyncedFormulaRef.current !== currentFormulaId) {
      console.log(
        "🔄 Formula changed: Generating new rows for formula:",
        currentFormulaId
      );
      lastSyncedFormulaRef.current = currentFormulaId;

      // Generate new rows for the new formula
      const newRows = generateRows(0, currentFormulaId);
      setRows(newRows);

      // Update GridStore with new row structure
      if (storeRef.current) {
        storeRef.current.syncStructure(newRows, columns);

        // Set index column values (silent mode)
        newRows.forEach((row, index) => {
          storeRef.current!.setValue(row.id, "index", String(index + 1), true);
        });
      }

      console.log(
        "✅ Rows initialized. GridStore is the single source of truth for input data."
      );
    }
  }, [currentFormula, columns, generateRows, setRows]);

  // --- Actions ---

  /**
   * Add a new row to the spreadsheet
   * Uses store's addRow method and syncs with GridStore
   */
  const addRow = useCallback(() => {
    const afterRowId = selection?.type === "row" ? selection.id : undefined;

    // Add row using store method with GridStore sync
    // Note: We need to call the store method directly with GridStore instance
    // since the action selector doesn't include the extra parameters
    const state = useSpreadsheetStore.getState();
    state.addRow(afterRowId, storeRef.current || undefined, columns);
  }, [selection, columns]);

  const addColumn = useCallback(() => {
    const afterColId = selection?.type === "column" ? selection.id : undefined;
    addColumnAction(afterColId);
  }, [selection, addColumnAction]);

  // --- Selection Handlers ---
  const handleRowHeaderClick = useCallback(
    (id: string) => {
      toggleRowSelection(id);
    },
    [toggleRowSelection]
  );

  const handleColHeaderClick = useCallback(
    (id: string) => {
      toggleColumnSelection(id);
    },
    [toggleColumnSelection]
  );

  // Handle click inside a cell: Clear selection if clicked outside current selection
  const handleCellClick = useCallback(
    (rowId: string, colId: string) => {
      updateSelectionOnCellClick(rowId, colId);
    },
    [updateSelectionOnCellClick]
  );

  // Pre-compute selection sets for O(1) lookup instead of O(n) checks
  const selectedRowIds = useMemo(() => {
    if (selection?.type === "row") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  const selectedColIds = useMemo(() => {
    if (selection?.type === "column") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  // Container ref for virtualizer
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual row scrolling (using rowIds from local state)
  const rowVirtualizer = useVirtualizer({
    count: rowIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Row height
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  // Show loading state until columns are determined
  if (!isColumnsReady) {
    return (
      <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Loading spreadsheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <SpreadsheetToolbar
        selection={selection}
        flattenedPaths={flattenedPaths}
        onAddRow={addRow}
        onAddColumn={addColumn}
      />

      {/* Grid Container with Virtual Scrolling */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative scrollbar-thin"
      >
        <div
          className="inline-block min-w-full"
          style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
        >
          {/* Header Row - Sticky */}
          <SpreadsheetHeader
            columns={columns}
            selectedColIds={selectedColIds}
            onColHeaderClick={handleColHeaderClick}
            onDeleteColumn={deleteColumnAction}
          />

          {/* Virtualized Data Rows */}
          <div
            style={{
              position: "relative",
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowId = rowIds[virtualRow.index];
              const isRowSelected = selectedRowIds.has(rowId);

              return (
                <SpreadsheetRow
                  key={rowId}
                  rowId={rowId}
                  rowIndex={virtualRow.index}
                  columns={columns}
                  store={storeRef.current!}
                  isRowSelected={isRowSelected}
                  selectedColIds={selectedColIds}
                  onRowHeaderClick={handleRowHeaderClick}
                  onCellClick={handleCellClick}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;
