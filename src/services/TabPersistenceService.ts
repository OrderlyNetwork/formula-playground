import { db, type TabFormulaState } from "@/lib/dexie";
import type { CellValue, RowDef, ColumnDef } from "@/types/spreadsheet";
import type { CalculationResults } from "@/store/spreadsheetStore";
import type { GridStore } from "@/store/spreadsheet";

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
   * Removes non-serializable render functions and other JSX components
   */
  private sanitizeColumnsForStorage(columns: ColumnDef[]): ColumnDef[] {
    return columns.map(column => {
      const sanitizedColumn = { ...column };

      // Remove non-serializable properties
      if (sanitizedColumn.render && typeof sanitizedColumn.render === 'function') {
        sanitizedColumn.render = undefined;
      }

      // Remove any other non-serializable properties
      Object.keys(sanitizedColumn).forEach(key => {
        const value = sanitizedColumn[key as keyof ColumnDef];
        if (typeof value === 'function') {
          // Type-safe way to remove non-serializable function properties
          const columnRecord = sanitizedColumn as Record<string, unknown>;
          delete columnRecord[key];
        }
      });

      return sanitizedColumn;
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
      const cellDataObj: Record<string, CellValue> = {};
      data.cellData.forEach((value, key) => {
        cellDataObj[key] = value;
      });

      // Sanitize columns to remove non-serializable functions
      const sanitizedColumns = this.sanitizeColumnsForStorage(data.columns);

      const tabState: TabFormulaState = {
        id: formulaId,
        formulaId,
        label,
        type,
        cellData: cellDataObj,
        rows: data.rows,
        columns: sanitizedColumns,
        calculationResults: data.calculationResults,
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
   * Re-attaches render functions that were removed for storage
   */
  private restoreColumnsFromStorage(columns: ColumnDef[]): ColumnDef[] {
    return columns.map(column => {
      const restoredColumn = { ...column };

      // Note: Render functions will be re-attached by the spreadsheet component
      // when columns are loaded, since JSX cannot be used in .ts files
      // The ResultCell render function is defined in spreadsheetUtils.tsx

      return restoredColumn;
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
      const cellData = new Map<string, CellValue>();
      Object.entries(state.cellData).forEach(([key, value]) => {
        cellData.set(key, value);
      });

      // Restore column render functions
      const restoredColumns = this.restoreColumnsFromStorage(state.columns || []);

      const inMemoryData: InMemoryTabData = {
        formulaId,
        cellData,
        rows: state.rows,
        columns: restoredColumns,
        calculationResults: state.calculationResults,
        lastAccessTime: Date.now(),
        isDirty: false,
      };

      // Add to cache and manage LRU
      this.activeTabsCache.set(formulaId, inMemoryData);
      this.manageLRUCache();

      console.log(`✅ Tab state restored from IndexedDB: ${formulaId}`);

      return {
        cellData,
        rows: state.rows,
        columns: restoredColumns,
        calculationResults: state.calculationResults,
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
}

// Export singleton instance
export const tabPersistenceService = TabPersistenceService.getInstance();
