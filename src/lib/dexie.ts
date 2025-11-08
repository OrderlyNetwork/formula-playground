import Dexie, { type Table } from "dexie";
import type { RunRecord } from "../types/history";
import type { FormulaDefinition, CompiledFormula, SharedCodeEntry, FormulaReference, UserDataSource } from "../types/formula";

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

  constructor() {
    super("FormulaPlaygroundDB");

    // v1: runRecords only
    // v2: add formulas table for storing parsed FormulaDefinition
    // v3: add compiledFormulas table for storing jsDelivr executables
    // v4: add sharedCode and formulaReferences tables for optimized storage
    // v5: add userDataSources table for storing user-saved output values
    this.version(5).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
      formulas: "id, name, version, githubUrl", // Metadata from GitHub
      compiledFormulas: "id, formulaId, version, jsdelivrUrl, timestamp", // Executables from jsDelivr (legacy)
      sharedCode: "id, url, version, timestamp", // Shared code entries (new storage strategy)
      formulaReferences: "id, formulaId, version, sharedCodeId, timestamp", // Formula references to shared code
      userDataSources: "id, name, timestamp, sourceNodeId", // User-defined data sources from OutputNode
    });
  }
}

// Create a singleton instance
export const db = new FormulaPlaygroundDB();
