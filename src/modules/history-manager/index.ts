import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/dexie";
import type { RunRecord } from "../../types/history";

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
