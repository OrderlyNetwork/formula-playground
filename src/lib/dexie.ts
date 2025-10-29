import Dexie, { type Table } from "dexie";
import type { RunRecord } from "../types/history";
import type { FormulaDefinition } from "../types/formula";

/**
 * IndexedDB database for Formula Playground
 */
export class FormulaPlaygroundDB extends Dexie {
  runRecords!: Table<RunRecord, string>;
  formulas!: Table<FormulaDefinition, string>;

  constructor() {
    super("FormulaPlaygroundDB");

    // v1: runRecords only
    // v2: add formulas table for storing parsed FormulaDefinition
    this.version(2).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
      formulas: "id, name, version", // primary key id; indexes on name, version
    });
  }
}

// Create a singleton instance
export const db = new FormulaPlaygroundDB();
