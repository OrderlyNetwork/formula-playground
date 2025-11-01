import { db } from "@/lib/dexie";
import { sourceLoaderService } from "@/modules/source-loader";
import type { FormulaDefinition } from "@/types/formula";

interface LocalFileData {
  id: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
}

/**
 * Repository facade for formula data operations.
 * Centralizes DB reads/writes and import flows so UI layers stay thin.
 */
export const formulaRepository = {
  /** List all formulas from IndexedDB. */
  async list(): Promise<FormulaDefinition[]> {
    return db.formulas.toArray();
  },

  /**
   * Refresh Zustand store by reading all formulas once.
   * Returns the freshly loaded list for convenience.
   */
  async refreshStore(
    loadFormulas: (defs: FormulaDefinition[]) => Promise<void>
  ): Promise<FormulaDefinition[]> {
    const defs = await db.formulas.toArray();
    await loadFormulas(defs);
    return defs;
  },

  /**
   * Import formulas from GitHub via service and then refresh the store.
   */
  async importFromGithubAndRefresh(
    urls: string[],
    loadFormulas: (defs: FormulaDefinition[]) => Promise<void>
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    const res = await sourceLoaderService.importFromGitHub(urls);
    if (!res.success) return res;
    await this.refreshStore(loadFormulas);
    return res;
  },

  /**
   * Import formulas from local uploaded files via source loader and then refresh the store.
   */
  async importFromLocalFilesAndRefresh(
    files: LocalFileData[],
    loadFormulas: (defs: FormulaDefinition[]) => Promise<void>
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      // Convert local files to source format expected by sourceLoaderService
      const sources = files.map(file => ({
        path: file.name,
        content: file.content
      }));

      // Import using source loader service (it should handle local files)
      const res = await sourceLoaderService.importFromLocalFiles(sources, files);
      if (!res.success) return res;

      await this.refreshStore(loadFormulas);
      return res;
    } catch (error) {
      return {
        success: false,
        error: `Local import failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },

  /** Delete a formula and refresh the store. */
  async deleteAndRefresh(
    formulaId: string,
    loadFormulas: (defs: FormulaDefinition[]) => Promise<void>
  ): Promise<FormulaDefinition[]> {
    await db.formulas.delete(formulaId);
    return this.refreshStore(loadFormulas);
  },

  /** Clear all formula data and compiled cache, then empty the store. */
  async clearAllAndRefresh(
    loadFormulas: (defs: FormulaDefinition[]) => Promise<void>
  ): Promise<void> {
    await db.formulas.clear();
    await db.compiledFormulas.clear();
    await loadFormulas([]);
  },
};
