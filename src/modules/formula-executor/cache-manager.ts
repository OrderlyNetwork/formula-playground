/**
 * Cache Manager for Compiled Formulas
 * Manages IndexedDB storage for dynamically loaded jsDelivr executables
 */

import { db } from "../../lib/dexie";
import type { CompiledFormula } from "../../types/formula";

/**
 * @description Manages IndexedDB cache for compiled formulas with version tracking
 */
export class CacheManager {
  /**
   * @description Get a compiled formula from cache by ID and version
   */
  async getCompiled(
    formulaId: string,
    version: string
  ): Promise<CompiledFormula | null> {
    const id = `${formulaId}:${version}`;
    return (await db.compiledFormulas.get(id)) || null;
  }

  /**
   * @description Save a compiled formula to cache
   */
  async saveCompiled(compiled: CompiledFormula): Promise<void> {
    await db.compiledFormulas.put(compiled);
  }

  /**
   * @description Get all versions of a formula, sorted by timestamp
   */
  async getAllVersions(formulaId: string): Promise<CompiledFormula[]> {
    return await db.compiledFormulas
      .where("formulaId")
      .equals(formulaId)
      .sortBy("timestamp");
  }

  /**
   * @description Clear old versions of a formula, keeping only the latest N versions
   * @param formulaId - Formula ID to clean
   * @param keepLatest - Number of latest versions to keep (default: 3)
   */
  async clearOldVersions(
    formulaId: string,
    keepLatest: number = 3
  ): Promise<void> {
    const versions = await this.getAllVersions(formulaId);
    if (versions.length <= keepLatest) return;

    const toDelete = versions.slice(0, versions.length - keepLatest);
    await db.compiledFormulas.bulkDelete(toDelete.map((v) => v.id));
  }

  /**
   * @description Clear all compiled formulas from cache
   */
  async clearAll(): Promise<void> {
    await db.compiledFormulas.clear();
  }

  /**
   * @description Get cache statistics
   */
  async getStats(): Promise<{ totalCount: number; totalSize: number }> {
    const all = await db.compiledFormulas.toArray();
    const totalCount = all.length;
    const totalSize = all.reduce((sum, formula) => {
      return sum + (formula.compiledCode?.length || 0);
    }, 0);

    return { totalCount, totalSize };
  }

  /**
   * @description Check if a specific version exists in cache
   */
  async hasVersion(formulaId: string, version: string): Promise<boolean> {
    const compiled = await this.getCompiled(formulaId, version);
    return compiled !== null;
  }

  /**
   * @description Get the latest cached version of a formula
   */
  async getLatestVersion(
    formulaId: string
  ): Promise<CompiledFormula | null> {
    const versions = await this.getAllVersions(formulaId);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }
}

