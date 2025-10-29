import Dexie, { type Table } from "dexie";
import type { RunRecord } from "../types/history";

/**
 * IndexedDB database for Formula Playground
 */
export class FormulaPlaygroundDB extends Dexie {
  runRecords!: Table<RunRecord, string>;

  constructor() {
    super("FormulaPlaygroundDB");

    this.version(1).stores({
      runRecords:
        "id, timestamp, formulaId, engine, sdkVersion, formulaVersion",
    });
  }
}

// Create a singleton instance
export const db = new FormulaPlaygroundDB();
