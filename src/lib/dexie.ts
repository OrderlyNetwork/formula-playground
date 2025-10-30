import Dexie, { type Table } from "dexie";
import type { RunRecord } from "../types/history";
import type { FormulaDefinition, CompiledFormula } from "../types/formula";

/**
 * IndexedDB database for Formula Playground
 */
export class FormulaPlaygroundDB extends Dexie {
  runRecords!: Table<RunRecord, string>;
  formulas!: Table<FormulaDefinition, string>;
  compiledFormulas!: Table<CompiledFormula, string>;

  constructor() {
    super("FormulaPlaygroundDB");

    // v1: runRecords only
    // v2: add formulas table for storing parsed FormulaDefinition
    // v3: add compiledFormulas table for storing jsDelivr executables
    this.version(3).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
      formulas: "id, name, version, githubUrl", // Metadata from GitHub
      compiledFormulas: "id, formulaId, version, jsdelivrUrl, timestamp", // Executables from jsDelivr
    });
  }
}

// Create a singleton instance
export const db = new FormulaPlaygroundDB();
