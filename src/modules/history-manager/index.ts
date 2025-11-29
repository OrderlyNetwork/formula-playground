import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/dexie";
import type { RunRecord, DatasheetSnapshot } from "../../types/history";

/**
 * HistoryManager - Manages formula execution history using IndexedDB
 */
export class HistoryManager {
  /**
   * Add a new run record to history
   */
  async addRecord(
    record: Omit<RunRecord, "id" | "timestamp">
  ): Promise<string> {
    const fullRecord: RunRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...record,
    };

    await db.runRecords.add(fullRecord);
    return fullRecord.id;
  }

  /**
   * Get all run records
   */
  async getAllRecords(): Promise<RunRecord[]> {
    return db.runRecords.orderBy("timestamp").reverse().toArray();
  }

  /**
   * Get run records by formula ID
   */
  async getRecordsByFormulaId(formulaId: string): Promise<RunRecord[]> {
    return db.runRecords
      .where("formulaId")
      .equals(formulaId)
      .reverse()
      .sortBy("timestamp");
  }

  /**
   * Get a single run record by ID
   */
  async getRecordById(id: string): Promise<RunRecord | undefined> {
    return db.runRecords.get(id);
  }

  /**
   * Delete a run record by ID
   */
  async deleteRecord(id: string): Promise<void> {
    await db.runRecords.delete(id);
  }

  /**
   * Clear all run records
   */
  async clearAllRecords(): Promise<void> {
    await db.runRecords.clear();
  }

  /**
   * Get records with pagination
   */
  async getRecordsPaginated(
    page: number = 1,
    limit: number = 50
  ): Promise<{ records: RunRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const total = await db.runRecords.count();
    const records = await db.runRecords
      .orderBy("timestamp")
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();

    return { records, total };
  }

  /**
   * Clean up old records (keep only recent N records or N days)
   */
  async cleanupOldRecords(
    maxRecords: number = 1000,
    maxDays: number = 30
  ): Promise<number> {
    const cutoffTimestamp = Date.now() - maxDays * 24 * 60 * 60 * 1000;

    // Get all records ordered by timestamp
    const allRecords = await db.runRecords
      .orderBy("timestamp")
      .reverse()
      .toArray();

    const recordsToDelete: string[] = [];

    // Delete records beyond max count
    if (allRecords.length > maxRecords) {
      const excessRecords = allRecords.slice(maxRecords);
      recordsToDelete.push(...excessRecords.map((r) => r.id));
    }

    // Delete records older than cutoff
    const oldRecords = await db.runRecords
      .where("timestamp")
      .below(cutoffTimestamp)
      .toArray();
    recordsToDelete.push(...oldRecords.map((r) => r.id));

    // Remove duplicates
    const uniqueToDelete = Array.from(new Set(recordsToDelete));

    // Delete records
    await db.runRecords.bulkDelete(uniqueToDelete);

    return uniqueToDelete.length;
  }

  /**
   * Export records to JSON
   */
  async exportToJSON(): Promise<string> {
    const records = await this.getAllRecords();
    return JSON.stringify(records, null, 2);
  }

  /**
   * Import records from JSON
   */
  async importFromJSON(jsonString: string): Promise<number> {
    try {
      const records: RunRecord[] = JSON.parse(jsonString);
      await db.runRecords.bulkAdd(records);
      return records.length;
    } catch (error) {
      throw new Error(`Failed to import records: ${error}`);
    }
  }
}

// Create a singleton instance
export const historyManager = new HistoryManager();

/**
 * DatasheetSnapshotManager - Manages datasheet snapshots using IndexedDB
 */
export class DatasheetSnapshotManager {
  /**
   * Add a new datasheet snapshot
   */
  async addSnapshot(
    snapshot: Omit<DatasheetSnapshot, "id" | "timestamp">
  ): Promise<string> {
    const fullSnapshot: DatasheetSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...snapshot,
    };

    await db.datasheetSnapshots.add(fullSnapshot);
    return fullSnapshot.id;
  }

  /**
   * Get all datasheet snapshots
   */
  async getAllSnapshots(): Promise<DatasheetSnapshot[]> {
    return db.datasheetSnapshots.orderBy("timestamp").reverse().toArray();
  }

  /**
   * Get a single datasheet snapshot by ID
   */
  async getSnapshotById(id: string): Promise<DatasheetSnapshot | undefined> {
    return db.datasheetSnapshots.get(id);
  }

  /**
   * Update a datasheet snapshot's name by ID
   */
  async updateSnapshotName(id: string, name: string): Promise<void> {
    await db.datasheetSnapshots.update(id, { name });
  }

  /**
   * Delete a datasheet snapshot by ID
   */
  async deleteSnapshot(id: string): Promise<void> {
    await db.datasheetSnapshots.delete(id);
  }

  /**
   * Clear all datasheet snapshots
   */
  async clearAllSnapshots(): Promise<void> {
    await db.datasheetSnapshots.clear();
  }

  /**
   * Get snapshots with pagination
   */
  async getSnapshotsPaginated(
    page: number = 1,
    limit: number = 50
  ): Promise<{ snapshots: DatasheetSnapshot[]; total: number }> {
    const offset = (page - 1) * limit;
    const total = await db.datasheetSnapshots.count();
    const snapshots = await db.datasheetSnapshots
      .orderBy("timestamp")
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();

    return { snapshots, total };
  }

  /**
   * Clean up old snapshots (keep only recent N snapshots or N days)
   */
  async cleanupOldSnapshots(
    maxSnapshots: number = 1000,
    maxDays: number = 30
  ): Promise<number> {
    const cutoffTimestamp = Date.now() - maxDays * 24 * 60 * 60 * 1000;

    // Get all snapshots ordered by timestamp
    const allSnapshots = await db.datasheetSnapshots
      .orderBy("timestamp")
      .reverse()
      .toArray();

    const snapshotsToDelete: string[] = [];

    // Delete snapshots beyond max count
    if (allSnapshots.length > maxSnapshots) {
      const excessSnapshots = allSnapshots.slice(maxSnapshots);
      snapshotsToDelete.push(...excessSnapshots.map((s) => s.id));
    }

    // Delete snapshots older than cutoff
    const oldSnapshots = await db.datasheetSnapshots
      .where("timestamp")
      .below(cutoffTimestamp)
      .toArray();
    snapshotsToDelete.push(...oldSnapshots.map((s) => s.id));

    // Remove duplicates
    const uniqueToDelete = Array.from(new Set(snapshotsToDelete));

    // Delete snapshots
    await db.datasheetSnapshots.bulkDelete(uniqueToDelete);

    return uniqueToDelete.length;
  }

  /**
   * Export snapshots to JSON
   */
  async exportToJSON(): Promise<string> {
    const snapshots = await this.getAllSnapshots();
    return JSON.stringify(snapshots, null, 2);
  }

  /**
   * Import snapshots from JSON
   */
  async importFromJSON(jsonString: string): Promise<number> {
    try {
      const snapshots: DatasheetSnapshot[] = JSON.parse(jsonString);
      await db.datasheetSnapshots.bulkAdd(snapshots);
      return snapshots.length;
    } catch (error) {
      throw new Error(`Failed to import snapshots: ${error}`);
    }
  }
}

// Create a singleton instance
export const datasheetSnapshotManager = new DatasheetSnapshotManager();
