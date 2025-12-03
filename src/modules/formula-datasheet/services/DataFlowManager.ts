import { db } from "@/lib/dexie";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { CellValue } from "@/types/spreadsheet";
import type { DatasheetSnapshot } from "@/types/history";
import LZString from "lz-string";

export type DataSource = "url" | "indexeddb" | "none";

export interface DataConflictInfo {
  urlData: Record<string, Record<string, CellValue>>;
  dbData: Record<string, Record<string, CellValue>>;
  urlDataCount: number;
  dbDataCount: number;
}

export type ConflictResolution = "merge" | "replace-url" | "replace-db" | "cancel";

class DataFlowManager {
  private static instance: DataFlowManager;
  private currentFormulaId: string | null = null;
  private isRestoring: boolean = false;
  
  // Callbacks
  private onUrlUpdate: ((params: URLSearchParams) => void) | null = null;
  private onConflictHandler: ((info: DataConflictInfo) => Promise<ConflictResolution>) | null = null;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new DataFlowManager();
    }
    return this.instance;
  }

  registerUrlUpdateHandler(handler: (params: URLSearchParams) => void) {
    this.onUrlUpdate = handler;
  }

  registerConflictHandler(handler: (info: DataConflictInfo) => Promise<ConflictResolution>) {
    this.onConflictHandler = handler;
  }

  /**
   * Initialize data flow for a formula
   * Handles loading from URL/DB and conflict resolution
   */
  async initialize(formulaId: string, compressedUrlData: string | null) {
    this.currentFormulaId = formulaId;
    this.isRestoring = true;

    try {
      // 1. Parse URL Data
      let urlData: Record<string, Record<string, CellValue>> | null = null;
      if (compressedUrlData) {
        try {
          const jsonString = LZString.decompressFromEncodedURIComponent(compressedUrlData);
          if (jsonString) {
            urlData = JSON.parse(jsonString);
          }
        } catch (error) {
          console.error("Failed to parse URL data:", error);
        }
      }

      // 2. Load DB Data
      let dbData: Record<string, Record<string, CellValue>> | null = null;
      try {
        const tabState = await db.tabFormulaStates.get(formulaId);
        if (tabState && tabState.cellData) {
          dbData = {};
          Object.entries(tabState.cellData).forEach(([key, value]) => {
            const [rowId, colId] = key.split(":");
            if (rowId && colId) {
              if (!dbData![rowId]) dbData![rowId] = {};
              dbData![rowId][colId] = value;
            }
          });
        }
      } catch (error) {
        console.error("Failed to load IndexedDB data:", error);
      }

      // 3. Determine Final Data
      const urlDataCount = this.countCells(urlData);
      const dbDataCount = this.countCells(dbData);
      let finalData: Record<string, Record<string, CellValue>> | null = null;

      if (urlDataCount > 0 && dbDataCount > 0) {
        // Both exist - check for conflict
        if (this.isSameData(urlData!, dbData!)) {
          console.log("📋 URL data matches IndexedDB data (page refresh detected)");
          finalData = urlData;
        } else {
          console.log("⚠️ Data conflict detected");
          if (this.onConflictHandler) {
            const resolution = await this.onConflictHandler({
              urlData: urlData!,
              dbData: dbData!,
              urlDataCount,
              dbDataCount,
            });
            finalData = this.resolveConflictData(resolution, urlData!, dbData!);
          } else {
            finalData = urlData; // Default to URL
          }
        }
      } else if (urlDataCount > 0) {
        finalData = urlData;
      } else if (dbDataCount > 0) {
        finalData = dbData;
      }

      // 4. Apply Data
      if (finalData) {
        this.applyDataToStore(formulaId, finalData);
        
        // If we used DB data (or merged), we might need to update URL
        // But we should check if URL needs update
        const newCompressed = this.compressData(finalData);
        if (newCompressed !== compressedUrlData) {
           this.triggerUrlUpdate(formulaId, newCompressed);
        }
      }

    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Restore data from a history snapshot
   * Handles restoring data for multiple formulas and updating the URL for the active one
   */
  async restoreFullSnapshot(snapshot: DatasheetSnapshot) {
    this.isRestoring = true;
    const warnings: string[] = [];

    try {
      const spreadsheetStore = useSpreadsheetStore.getState();
      
      // Iterate over all formulas in the snapshot
      for (const [formulaId, rowsData] of Object.entries(snapshot.data)) {
        if (typeof rowsData !== "object" || rowsData === null) continue;

        // 1. Get current rows/cols to validate structure
        const currentRows = spreadsheetStore.getTabRows(formulaId) || [];
        const currentColumns = spreadsheetStore.getTabColumns(formulaId) || [];

        if (currentRows.length === 0) {
          warnings.push(`Formula "${formulaId}" has no rows defined. Data not restored.`);
          continue;
        }

        // 2. Get or create GridStore
        let gridStore = spreadsheetStore.getTabGridStore(formulaId);
        if (!gridStore) {
          gridStore = spreadsheetStore.getOrCreateTabGridStore(
            formulaId,
            currentRows,
            currentColumns,
            async () => {}
          );
        } else {
          gridStore.syncStructure(currentRows, currentColumns);
        }

        // 3. Filter data that matches current structure
        const validData: Record<string, Record<string, CellValue>> = {};
        const unmappedRows = new Set<string>();
        const unmappedColumns = new Set<string>();

        Object.entries(rowsData).forEach(([snapshotRowId, colValues]) => {
           if (typeof colValues !== "object" || colValues === null) return;
           
           const rowExists = currentRows.some(r => r.id === snapshotRowId);
           if (!rowExists) {
             unmappedRows.add(snapshotRowId);
             return;
           }

           Object.entries(colValues).forEach(([colId, value]) => {
             const colExists = currentColumns.some(c => c.id === colId);
             if (!colExists) {
               unmappedColumns.add(colId);
               return;
             }

             if (!validData[snapshotRowId]) validData[snapshotRowId] = {};
             validData[snapshotRowId][colId] = value as CellValue;
           });
        });

        // Log warnings
        if (unmappedRows.size > 0) {
          warnings.push(`Formula "${formulaId}": ${unmappedRows.size} row(s) skipped`);
        }
        if (unmappedColumns.size > 0) {
          warnings.push(`Formula "${formulaId}": ${unmappedColumns.size} column(s) skipped`);
        }

        // 4. Apply valid data to store
        this.applyDataToStore(formulaId, validData, true);

        // 5. Update URL if this is the active formula (or if we should switch to it?)
        // If the snapshot has an activeFormulaId, we might want to prioritize that.
        // Or we just update the URL for the formula we just restored.
        // If we restore multiple formulas, we probably only want to update URL for the one the user is looking at,
        // OR if the snapshot implies a context switch.
        // For now, let's update URL for the formula being restored if it matches currentFormulaId
        if (formulaId === this.currentFormulaId) {
           const compressed = this.compressData(validData);
           this.triggerUrlUpdate(formulaId, compressed);
        }
      }

      return warnings;

    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Handle store updates to sync URL
   */
  handleStoreUpdate(formulaId: string, data: Record<string, Record<string, CellValue>>) {
    if (this.isRestoring) return;
    if (formulaId !== this.currentFormulaId) return;

    const compressed = this.compressData(data);
    this.triggerUrlUpdate(formulaId, compressed);
  }

  // --- Helper Methods ---

  private applyDataToStore(
    formulaId: string,
    data: Record<string, Record<string, CellValue>>,
    clearFirst: boolean = false
  ) {
    const gridStore = useSpreadsheetStore.getState().getTabGridStore(formulaId);
    if (!gridStore) return;

    if (clearFirst) {
      gridStore.clearAllData();
    }
    
    Object.entries(data).forEach(([rowId, rowData]) => {
      if (typeof rowData === "object" && rowData !== null) {
        Object.entries(rowData).forEach(([colId, value]) => {
          gridStore.setValue(rowId, colId, value, true); // true = silent
        });
      }
    });
    
    gridStore.notifyBatchUpdate();
  }

  private triggerUrlUpdate(formulaId: string, compressedData: string) {
    if (this.onUrlUpdate) {
      const params = new URLSearchParams();
      params.set("formulaId", formulaId);
      if (compressedData) {
        params.set("data", compressedData);
      }
      this.onUrlUpdate(params);
    }
  }

  private compressData(data: Record<string, Record<string, CellValue>>): string {
    if (!data || Object.keys(data).length === 0) return "";
    const jsonString = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(jsonString);
  }

  private resolveConflictData(
    resolution: ConflictResolution,
    urlData: Record<string, Record<string, CellValue>>,
    dbData: Record<string, Record<string, CellValue>>
  ): Record<string, Record<string, CellValue>> | null {
    switch (resolution) {
      case "merge":
        const merged = { ...dbData };
        Object.entries(urlData).forEach(([rowId, rowData]) => {
          if (!merged[rowId]) merged[rowId] = {};
          Object.assign(merged[rowId], rowData);
        });
        return merged;
      case "replace-url":
        return urlData;
      case "replace-db":
      case "cancel":
        return dbData;
      default:
        return dbData;
    }
  }

  private countCells(data: Record<string, Record<string, CellValue>> | null): number {
    if (!data) return 0;
    return Object.values(data).reduce((sum, row) => sum + Object.keys(row).length, 0);
  }

  // --- Hashing & Comparison (copied from useSpreadsheetUrlSync) ---
  
  private hashCellData(data: Record<string, Record<string, CellValue>>): string {
    let hash = 2166136261;
    const sortedRowIds = Object.keys(data).sort();
    for (const rowId of sortedRowIds) {
      const row = data[rowId];
      const sortedColIds = Object.keys(row).sort();
      for (let i = 0; i < rowId.length; i++) {
        hash ^= rowId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      for (const colId of sortedColIds) {
        const value = row[colId];
        const str = String(value ?? "");
        for (let i = 0; i < str.length; i++) {
          hash ^= str.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
      }
    }
    return (hash >>> 0).toString(36);
  }

  private isSameData(
    data1: Record<string, Record<string, CellValue>>,
    data2: Record<string, Record<string, CellValue>>
  ): boolean {
    const hash1 = this.hashCellData(data1);
    const hash2 = this.hashCellData(data2);
    if (hash1 !== hash2) return false;

    const rows1 = Object.keys(data1);
    const rows2 = Object.keys(data2);
    if (rows1.length !== rows2.length) return false;

    for (const rowId of rows1) {
      const row1 = data1[rowId];
      const row2 = data2[rowId];
      if (!row2) return false;
      const cols1 = Object.keys(row1);
      const cols2 = Object.keys(row2);
      if (cols1.length !== cols2.length) return false;
      for (const colId of cols1) {
        const value1 = row1[colId];
        const value2 = row2[colId];
        if ((value1 === null || value1 === undefined) && (value2 === null || value2 === undefined)) continue;
        if (value1 !== value2) return false;
      }
    }
    return true;
  }
}

export const dataFlowManager = DataFlowManager.getInstance();
