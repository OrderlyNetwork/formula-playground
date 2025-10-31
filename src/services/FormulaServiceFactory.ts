import { FormulaParser } from "../modules/formula-parser";
import { FormulaExecutor } from "../modules/formula-executor";
import { historyManager } from "../modules/history-manager";

/**
 * Service factory for managing singleton instances of formula-related services
 * Prevents multiple instantiations and provides centralized access
 */
export class FormulaServiceFactory {
  private static parserInstance: FormulaParser | null = null;
  private static executorInstance: FormulaExecutor | null = null;
  private static historyManagerInstance = historyManager;

  /**
   * Get or create the FormulaParser singleton instance
   */
  static getParser(): FormulaParser {
    if (!this.parserInstance) {
      this.parserInstance = new FormulaParser();
    }
    return this.parserInstance;
  }

  /**
   * Get or create the FormulaExecutor singleton instance
   */
  static getExecutor(): FormulaExecutor {
    if (!this.executorInstance) {
      this.executorInstance = new FormulaExecutor();
    }
    return this.executorInstance;
  }

  /**
   * Get the history manager singleton instance
   */
  static getHistoryManager() {
    return this.historyManagerInstance;
  }

  /**
   * Reset all service instances (useful for testing)
   */
  static reset(): void {
    this.parserInstance = null;
    this.executorInstance = null;
  }

  /**
   * Get all services as an object for convenience
   */
  static getAllServices() {
    return {
      parser: this.getParser(),
      executor: this.getExecutor(),
      historyManager: this.getHistoryManager(),
    };
  }
}