import React from "react";
import { db, type TabFormulaState } from "@/lib/dexie";
import type { CellValue, RowDef, ColumnDef } from "@/types/spreadsheet";
import type { CalculationResults } from "@/store/spreadsheetStore";
import type { GridStore } from "@/store/spreadsheet";
import { Decimal } from "@orderly.network/utils";

/**
 * Check if a value is a Decimal instance or similar non-serializable numeric wrapper
 * Decimal instances have toString and toNumber methods and are not plain objects
 */
function isDecimalInstance(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;

  // Check for Decimal-like objects (from decimal.js-light, @orderly.network/utils, etc.)
  // They typically have toString, toNumber methods and constructor names like "Decimal", "Decimal2", etc.
  const obj = value as Record<string, unknown>;
  const hasDecimalMethods =
    typeof obj.toString === "function" && typeof obj.toNumber === "function";

  if (!hasDecimalMethods) return false;

  // Check constructor name (Decimal, Decimal2, etc.)
  const constructorName = obj.constructor?.name || "";
  if (/^Decimal\d*$/i.test(constructorName)) {
    return true;
  }

  // Fallback: check if it looks like a Decimal by checking for common methods
  // Decimal instances typically have methods like: mul, add, sub, div, etc.
  const hasDecimalOperations =
    typeof obj.mul === "function" ||
    typeof obj.add === "function" ||
    typeof obj.sub === "function" ||
    typeof obj.div === "function";

  return hasDecimalOperations;
}

/**
 * Serialize a value for IndexedDB storage
 * Converts Decimal instances and other non-serializable objects to serializable formats
 */
function serializeForIndexedDB(value: unknown): unknown {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitives (string, number, boolean) - return as-is
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // Handle functions - skip them (they cannot be serialized)
  if (typeof value === "function") {
    return undefined; // Functions cannot be stored in IndexedDB
  }

  // Handle Date objects - convert to ISO string
  if (value instanceof Date) {
    return {
      __type: "Date",
      __value: value.toISOString(),
    };
  }

  // Handle Decimal instances - convert to string
  if (isDecimalInstance(value)) {
    const decimal = value as { toString: () => string };
    return {
      __type: "Decimal",
      __value: decimal.toString(),
    };
  }

  // Handle arrays - recursively serialize each element
  if (Array.isArray(value)) {
    return value
      .map(serializeForIndexedDB)
      .filter((item) => item !== undefined);
  }

  // Handle plain objects - recursively serialize each property
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const serialized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const serializedValue = serializeForIndexedDB(obj[key]);
        // Only include non-undefined values
        if (serializedValue !== undefined) {
          serialized[key] = serializedValue;
        }
      }
    }
    return serialized;
  }

  // For any other type, try to convert to string as fallback
  try {
    return String(value);
  } catch {
    // If conversion fails, return undefined (skip it)
    return undefined;
  }
}

/**
 * Deserialize a value from IndexedDB storage
 * Converts serialized Decimal objects back to Decimal instances
 */
function deserializeFromIndexedDB(value: unknown): unknown {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitives (string, number, boolean) - return as-is
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // Handle serialized Decimal objects
  if (
    typeof value === "object" &&
    value !== null &&
    "__type" in value &&
    "__value" in value
  ) {
    const serialized = value as { __type: string; __value: unknown };
    if (serialized.__type === "Decimal") {
      // Convert back to Decimal instance
      try {
        return new Decimal(serialized.__value as string | number);
      } catch (error) {
        console.warn("Failed to deserialize Decimal:", error);
        // Fallback to string value
        return serialized.__value;
      }
    }
    if (serialized.__type === "Date") {
      // Convert back to Date instance
      return new Date(serialized.__value as string);
    }
  }

  // Handle arrays - recursively deserialize each element
  if (Array.isArray(value)) {
    return value.map(deserializeFromIndexedDB);
  }

  // Handle plain objects - recursively deserialize each property
  if (typeof value === "object" && value.constructor === Object) {
    const obj = value as Record<string, unknown>;
    const deserialized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        deserialized[key] = deserializeFromIndexedDB(obj[key]);
      }
    }
    return deserialized;
  }

  // For any other type, return as-is
  return value;
}

/**
 * Serializable column definition (excludes non-serializable fields)
 */
type SerializableColumnDef = Omit<ColumnDef, "render"> & {
  // Store metadata about which columns need render functions restored
  _hasRenderFunction?: boolean;
};

/**
 * Configuration for TabPersistenceService
 */
const CONFIG = {
  MAX_ACTIVE_TABS: 5, // Maximum tabs to keep in memory
  DEBOUNCE_DELAY: 500, // ms - debounce delay for saves during editing
  FORCE_SAVE_INTERVAL: 5000, // ms - force save interval for dirty tabs
  TAB_SWITCH_DEBOUNCE: 200, // ms - debounce delay for tab switching
  RESTORE_TIMEOUT: 5000, // ms - timeout for state restoration
  SCHEMA_VERSION: "1.0.0", // Current schema version
};

/**
 * In-memory tab data for fast access
 */
interface InMemoryTabData {
  formulaId: string;
  cellData: Map<string, CellValue>;
  rows: RowDef[];
  columns: ColumnDef[];
  calculationResults: CalculationResults;
  lastAccessTime: number;
  isDirty: boolean;
}

/**
 * Service for managing per-tab formula state persistence
 * Handles LRU cache, debounced saves, and state recovery
 */
export class TabPersistenceService {
  private static instance: TabPersistenceService;

  // LRU cache for active tabs
  private activeTabsCache: Map<string, InMemoryTabData> = new Map();

  // Debounce timers for saves
  private saveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Force save timers for dirty tabs
  private forceSaveTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Tab switch debounce timer
  private tabSwitchTimer: ReturnType<typeof setTimeout> | null = null;

  // Pending tab switch
  private pendingTabSwitch: string | null = null;

  private constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TabPersistenceService {
    if (!TabPersistenceService.instance) {
      TabPersistenceService.instance = new TabPersistenceService();
    }
    return TabPersistenceService.instance;
  }

  /**
   * Save tab state to IndexedDB with debouncing
   * @param formulaId - Formula ID (tab identifier)
   * @param gridStore - GridStore instance with cell data
   * @param rows - Row definitions
   * @param columns - Column definitions
   * @param calculationResults - Calculation results
   * @param label - Tab label
   * @param type - Tab type
   */
  public async saveTabState(
    formulaId: string,
    gridStore: GridStore,
    rows: RowDef[],
    columns: ColumnDef[],
    calculationResults: CalculationResults,
    label: string,
    type: "code" | "grid"
  ): Promise<void> {
    // Update in-memory cache
    const cellData = this.extractCellDataFromGridStore(gridStore, rows);

    const inMemoryData: InMemoryTabData = {
      formulaId,
      cellData,
      rows: [...rows],
      columns: [...columns],
      calculationResults: { ...calculationResults },
      lastAccessTime: Date.now(),
      isDirty: true,
    };

    this.activeTabsCache.set(formulaId, inMemoryData);

    // Clear existing debounce timer
    if (this.saveTimers.has(formulaId)) {
      clearTimeout(this.saveTimers.get(formulaId)!);
    }

    // Set debounced save
    const timer = setTimeout(() => {
      this.persistToIndexedDB(formulaId, label, type);
      this.saveTimers.delete(formulaId);
    }, CONFIG.DEBOUNCE_DELAY);

    this.saveTimers.set(formulaId, timer);

    // Setup force save timer if not exists
    if (!this.forceSaveTimers.has(formulaId)) {
      const forceTimer = setTimeout(() => {
        const data = this.activeTabsCache.get(formulaId);
        if (data && data.isDirty) {
          this.persistToIndexedDB(formulaId, label, type);
        }
        this.forceSaveTimers.delete(formulaId);
      }, CONFIG.FORCE_SAVE_INTERVAL);

      this.forceSaveTimers.set(formulaId, forceTimer);
    }
  }

  /**
   * Extract cell data from GridStore
   */
  private extractCellDataFromGridStore(
    gridStore: GridStore,
    rows: RowDef[]
  ): Map<string, CellValue> {
    const cellData = new Map<string, CellValue>();

    // Get all cell values from GridStore
    // We need to access the private data map - use a helper method in GridStore
    // For now, we'll reconstruct from getRowData
    rows.forEach((row) => {
      const rowData = gridStore.getRowData(row.id);
      Object.entries(rowData).forEach(([colId, value]) => {
        const key = `${row.id}:${colId}`;
        cellData.set(key, value);
      });
    });

    return cellData;
  }

  /**
   * Sanitize column definitions for IndexedDB storage
   * Removes non-serializable render functions and tracks which columns had them
   */
  private sanitizeColumnsForStorage(
    columns: ColumnDef[]
  ): SerializableColumnDef[] {
    return columns.map((column) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitizedColumn: any = { ...column };

      // Track if this column had a render function
      const hasRenderFunction = typeof column.render === "function";
      if (hasRenderFunction) {
        sanitizedColumn._hasRenderFunction = true;
        // Remove the render function
        delete sanitizedColumn.render;
      }

      // Remove any other non-serializable function properties
      Object.keys(sanitizedColumn).forEach((key) => {
        const value = sanitizedColumn[key];
        if (typeof value === "function") {
          delete sanitizedColumn[key];
        }
      });

      return sanitizedColumn as SerializableColumnDef;
    });
  }

  /**
   * Persist tab state to IndexedDB
   */
  private async persistToIndexedDB(
    formulaId: string,
    label: string,
    type: "code" | "grid"
  ): Promise<void> {
    const data = this.activeTabsCache.get(formulaId);
    if (!data) return;

    try {
      // Convert Map to plain object for IndexedDB
      // Serialize cell values to handle any non-serializable objects (e.g., Decimal)
      const cellDataObj: Record<string, unknown> = {};
      data.cellData.forEach((value, key) => {
        cellDataObj[key] = serializeForIndexedDB(value);
      });

      // Sanitize columns to remove non-serializable functions
      const sanitizedColumns = this.sanitizeColumnsForStorage(data.columns);

      // Serialize calculation results to handle Decimal instances and other non-serializable objects
      const serializedCalculationResults = serializeForIndexedDB(
        data.calculationResults
      ) as CalculationResults;

      const tabState: TabFormulaState = {
        id: formulaId,
        formulaId,
        label,
        type,
        cellData: cellDataObj as Record<string, CellValue>,
        rows: data.rows,
        columns: sanitizedColumns,
        calculationResults: serializedCalculationResults,
        timestamp: Date.now(),
        lastAccessTime: data.lastAccessTime,
        isDirty: false,
        version: CONFIG.SCHEMA_VERSION,
      };

      await db.tabFormulaStates.put(tabState);

      // Mark as clean
      data.isDirty = false;

      console.log(`✅ Tab state persisted to IndexedDB: ${formulaId}`);
    } catch (error) {
      console.error(`Failed to persist tab state: ${formulaId}`, error);
    }
  }

  /**
   * Restore column definitions with render functions
   * Uses a callback to re-attach render functions based on column metadata
   * @param columns - Serialized columns from IndexedDB
   * @param renderFunctionProvider - Optional callback to provide render functions
   * @returns Restored columns with render functions
   */
  private restoreColumnsFromStorage(
    columns: (ColumnDef | SerializableColumnDef)[],
    renderFunctionProvider?: (
      column: ColumnDef
    ) => ColumnDef["render"] | undefined
  ): ColumnDef[] {
    return columns.map((column) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restoredColumn: any = { ...column };

      // Remove metadata flag
      delete restoredColumn._hasRenderFunction;

      // If a render function provider is given and column had a render function
      if (
        renderFunctionProvider &&
        (column as SerializableColumnDef)._hasRenderFunction
      ) {
        const renderFunc = renderFunctionProvider(restoredColumn as ColumnDef);
        if (renderFunc) {
          restoredColumn.render = renderFunc;
        }
      }

      return restoredColumn as ColumnDef;
    });
  }

  /**
   * Restore tab state from IndexedDB with debounced tab switching
   * @param formulaId - Formula ID to restore
   * @returns Restored state or null if failed
   */
  public async restoreTabState(formulaId: string): Promise<{
    cellData: Map<string, CellValue>;
    rows: RowDef[];
    columns: ColumnDef[];
    calculationResults: CalculationResults;
  } | null> {
    // Check in-memory cache first
    if (this.activeTabsCache.has(formulaId)) {
      const cached = this.activeTabsCache.get(formulaId)!;
      cached.lastAccessTime = Date.now();
      return {
        cellData: cached.cellData,
        rows: cached.rows,
        columns: cached.columns,
        calculationResults: cached.calculationResults,
      };
    }

    // Load from IndexedDB with timeout
    try {
      const state = await Promise.race([
        db.tabFormulaStates.get(formulaId),
        this.createTimeoutPromise(CONFIG.RESTORE_TIMEOUT),
      ]);

      if (!state) {
        console.warn(`No saved state found for tab: ${formulaId}`);
        return null;
      }

      // Validate state data
      if (!this.validateTabState(state)) {
        console.warn(`Invalid state data for tab: ${formulaId}`);
        return null;
      }

      // Convert to in-memory format
      // Deserialize cell data to handle serialized Decimal objects
      const cellData = new Map<string, CellValue>();
      Object.entries(state.cellData).forEach(([key, value]) => {
        const deserialized = deserializeFromIndexedDB(value);
        // Ensure the value is a valid CellValue type
        cellData.set(
          key,
          typeof deserialized === "string" ||
            typeof deserialized === "number" ||
            deserialized === null
            ? (deserialized as CellValue)
            : String(deserialized)
        );
      });

      // Restore column render functions
      const restoredColumns = this.restoreColumnsFromStorage(
        state.columns || []
      );

      // Deserialize calculation results to restore Decimal instances
      const deserializedCalculationResults = deserializeFromIndexedDB(
        state.calculationResults
      ) as CalculationResults;

      const inMemoryData: InMemoryTabData = {
        formulaId,
        cellData,
        rows: state.rows,
        columns: restoredColumns,
        calculationResults: deserializedCalculationResults,
        lastAccessTime: Date.now(),
        isDirty: false,
      };

      // Add to cache and manage LRU
      this.activeTabsCache.set(formulaId, inMemoryData);
      this.manageLRUCache();

      return {
        cellData,
        rows: state.rows,
        columns: restoredColumns,
        calculationResults: deserializedCalculationResults,
      };
    } catch (error) {
      if (error === "TIMEOUT") {
        console.error(`Tab state restoration timeout: ${formulaId}`);
      } else {
        console.error(`Failed to restore tab state: ${formulaId}`, error);
      }
      return null;
    }
  }

  /**
   * Restore tab state with debounced tab switching
   * Prevents rapid tab switches from triggering multiple restores
   */
  public restoreTabStateDebounced(
    formulaId: string,
    callback: (
      state: {
        cellData: Map<string, CellValue>;
        rows: RowDef[];
        columns: ColumnDef[];
        calculationResults: CalculationResults;
      } | null
    ) => void
  ): void {
    // Clear existing timer
    if (this.tabSwitchTimer) {
      clearTimeout(this.tabSwitchTimer);
    }

    // Set pending tab switch
    this.pendingTabSwitch = formulaId;

    // Debounce tab switch
    this.tabSwitchTimer = setTimeout(async () => {
      if (this.pendingTabSwitch === formulaId) {
        const state = await this.restoreTabState(formulaId);
        callback(state);
      }
      this.tabSwitchTimer = null;
      this.pendingTabSwitch = null;
    }, CONFIG.TAB_SWITCH_DEBOUNCE);
  }

  /**
   * Validate tab state data
   */
  private validateTabState(state: TabFormulaState): boolean {
    return !!(
      state &&
      state.formulaId &&
      state.cellData &&
      state.rows &&
      Array.isArray(state.rows) &&
      state.calculationResults &&
      typeof state.calculationResults === "object"
    );
  }

  /**
   * Create a timeout promise for restore operations
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject("TIMEOUT"), ms);
    });
  }

  /**
   * Manage LRU cache - evict oldest tabs when exceeding limit
   */
  private manageLRUCache(): void {
    if (this.activeTabsCache.size <= CONFIG.MAX_ACTIVE_TABS) {
      return;
    }

    // Sort by last access time
    const sorted = Array.from(this.activeTabsCache.entries()).sort(
      (a, b) => a[1].lastAccessTime - b[1].lastAccessTime
    );

    // Remove oldest tabs
    const toRemove = sorted.slice(
      0,
      this.activeTabsCache.size - CONFIG.MAX_ACTIVE_TABS
    );

    toRemove.forEach(([formulaId, data]) => {
      // Persist dirty tabs before removing from cache
      if (data.isDirty) {
        // Note: This should be handled by force save timer
        console.warn(`Evicting dirty tab from cache: ${formulaId}`);
      }

      this.activeTabsCache.delete(formulaId);

      // Clear timers
      if (this.saveTimers.has(formulaId)) {
        clearTimeout(this.saveTimers.get(formulaId)!);
        this.saveTimers.delete(formulaId);
      }

      if (this.forceSaveTimers.has(formulaId)) {
        clearTimeout(this.forceSaveTimers.get(formulaId)!);
        this.forceSaveTimers.delete(formulaId);
      }

      console.log(`🗑️ Tab evicted from cache: ${formulaId}`);
    });
  }

  /**
   * Delete tab state from IndexedDB and cache
   */
  public async deleteTabState(formulaId: string): Promise<void> {
    // Remove from cache
    this.activeTabsCache.delete(formulaId);

    // Clear timers
    if (this.saveTimers.has(formulaId)) {
      clearTimeout(this.saveTimers.get(formulaId)!);
      this.saveTimers.delete(formulaId);
    }

    if (this.forceSaveTimers.has(formulaId)) {
      clearTimeout(this.forceSaveTimers.get(formulaId)!);
      this.forceSaveTimers.delete(formulaId);
    }

    // Delete from IndexedDB
    try {
      await db.tabFormulaStates.delete(formulaId);
      console.log(`🗑️ Tab state deleted: ${formulaId}`);
    } catch (error) {
      console.error(`Failed to delete tab state: ${formulaId}`, error);
    }
  }

  /**
   * Check if tab has saved state
   */
  public async hasTabState(formulaId: string): Promise<boolean> {
    if (this.activeTabsCache.has(formulaId)) {
      return true;
    }

    try {
      const state = await db.tabFormulaStates.get(formulaId);
      return !!state;
    } catch (error) {
      console.error(`Failed to check tab state: ${formulaId}`, error);
      return false;
    }
  }

  /**
   * Force save all dirty tabs
   */
  public async saveAllDirtyTabs(): Promise<void> {
    const dirtyTabs = Array.from(this.activeTabsCache.entries()).filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, data]) => data.isDirty
    );

    await Promise.all(
      dirtyTabs.map(([formulaId]) => {
        // Get tab info - we need label and type
        // For now, use placeholder values
        return this.persistToIndexedDB(formulaId, formulaId, "grid");
      })
    );
  }

  /**
   * Start periodic cleanup of old tab states
   */
  private startPeriodicCleanup(): void {
    // Clean up old tabs every hour
    setInterval(async () => {
      try {
        const allStates = await db.tabFormulaStates.toArray();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const oldStates = allStates.filter(
          (state) => state.lastAccessTime < oneWeekAgo
        );

        if (oldStates.length > 0) {
          await Promise.all(
            oldStates.map((state) => db.tabFormulaStates.delete(state.id))
          );
          console.log(`🧹 Cleaned up ${oldStates.length} old tab states`);
        }
      } catch (error) {
        console.error("Failed to clean up old tab states", error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): {
    activeTabs: number;
    maxTabs: number;
    dirtyTabs: number;
  } {
    const dirtyCount = Array.from(this.activeTabsCache.values()).filter(
      (data) => data.isDirty
    ).length;

    return {
      activeTabs: this.activeTabsCache.size,
      maxTabs: CONFIG.MAX_ACTIVE_TABS,
      dirtyTabs: dirtyCount,
    };
  }

  /**
   * Create a default render function provider
   * This should be provided by the component layer where JSX is available
   * @example
   * ```tsx
   * const renderProvider = (column: ColumnDef) => {
   *   if (column.type === "result") {
   *     return (rowId, col, store) => <ResultCell rowId={rowId} column={col} />;
   *   }
   *   return undefined;
   * };
   * ```
   */
  public static createRenderFunctionProvider(
    renderMap: Record<
      string,
      (rowId: string, column: ColumnDef, store: GridStore) => React.ReactNode
    >
  ): (column: ColumnDef) => ColumnDef["render"] | undefined {
    return (column: ColumnDef) => {
      // Check by column type
      if (column.type && renderMap[column.type]) {
        return renderMap[column.type];
      }
      // Check by column id
      if (column.id && renderMap[column.id]) {
        return renderMap[column.id];
      }
      return undefined;
    };
  }
}

// Export singleton instance
export const tabPersistenceService = TabPersistenceService.getInstance();
