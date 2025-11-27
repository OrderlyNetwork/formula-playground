import Dexie, { type Table } from "dexie";
import type { RunRecord, CanvasSnapshot } from "../types/history";
import type {
  FormulaDefinition,
  CompiledFormula,
  SharedCodeEntry,
  FormulaReference,
  UserDataSource,
} from "../types/formula";
import type { CellValue, RowDef } from "../types/spreadsheet";
import type { CalculationResults } from "../store/spreadsheetStore";

/**
 * Per-tab formula state stored in IndexedDB
 */
export interface TabFormulaState {
  id: string; // formulaId (primary key - one tab per formula)
  formulaId: string; // Same as id for consistency
  label: string; // Tab display name
  type: "code" | "grid"; // Tab type

  // Persistent data
  cellData: Record<string, CellValue>; // GridStore data as flat key-value (rowId:colId -> value)
  rows: RowDef[]; // Row structure from SpreadsheetStore
  calculationResults: CalculationResults; // Calculation results from SpreadsheetStore

  // Metadata
  timestamp: number; // Last modified timestamp
  lastAccessTime: number; // For LRU cache management
  isDirty: boolean; // Has unsaved changes
  version: string; // Schema version for future migrations
}

/**
 * IndexedDB database for Formula Playground
 */
export class FormulaPlaygroundDB extends Dexie {
  runRecords!: Table<RunRecord, string>;
  formulas!: Table<FormulaDefinition, string>;
  compiledFormulas!: Table<CompiledFormula, string>;
  sharedCode!: Table<SharedCodeEntry, string>;
  formulaReferences!: Table<FormulaReference, string>;
  userDataSources!: Table<UserDataSource, string>;
  canvasSnapshots!: Table<CanvasSnapshot, string>;
  tabFormulaStates!: Table<TabFormulaState, string>;

  constructor() {
    super("FormulaPlaygroundDB");

    // v1: runRecords only
    // v2: add formulas table for storing parsed FormulaDefinition
    // v3: add compiledFormulas table for storing jsDelivr executables
    // v4: add sharedCode and formulaReferences tables for optimized storage
    // v5: add userDataSources table for storing user-saved output values
    // v6: add canvasSnapshots table for storing manually saved canvas states
    this.version(6).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
      formulas: "id, name, version, githubUrl", // Metadata from GitHub
      compiledFormulas: "id, formulaId, version, jsdelivrUrl, timestamp", // Executables from jsDelivr (legacy)
      sharedCode: "id, url, version, timestamp", // Shared code entries (new storage strategy)
      formulaReferences: "id, formulaId, version, sharedCodeId, timestamp", // Formula references to shared code
      userDataSources: "id, name, timestamp, sourceNodeId", // User-defined data sources from OutputNode
      canvasSnapshots: "id, timestamp, name", // Canvas snapshots with timestamp and name indexes
    });

    // v7: add tabFormulaStates table for per-tab formula persistence
    this.version(7).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
      formulas: "id, name, version, githubUrl",
      compiledFormulas: "id, formulaId, version, jsdelivrUrl, timestamp",
      sharedCode: "id, url, version, timestamp",
      formulaReferences: "id, formulaId, version, sharedCodeId, timestamp",
      userDataSources: "id, name, timestamp, sourceNodeId",
      canvasSnapshots: "id, timestamp, name",
      tabFormulaStates: "id, formulaId, timestamp, lastAccessTime, isDirty", // Per-tab state with LRU indexes
    });
  }
}

// Create a singleton instance
export const db = new FormulaPlaygroundDB();
