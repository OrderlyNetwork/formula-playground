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
   * Generic singleton getter using a factory function
   * Extracts common singleton pattern to eliminate code duplication
   * 
   * @param getter - Function to get current instance reference
   * @param setter - Function to set instance reference
   * @param factory - Factory function to create new instance if needed
   * @returns Singleton instance
   */
  private static getOrCreateSingleton<T>(
    getter: () => T | null,
    setter: (instance: T) => void,
    factory: () => T
  ): T {
    let instance = getter();
    if (!instance) {
      instance = factory();
      setter(instance);
    }
    return instance;
  }

  /**
   * Get or create the FormulaParser singleton instance
   */
  static getParser(): FormulaParser {
    return this.getOrCreateSingleton(
      () => this.parserInstance,
      (instance) => { this.parserInstance = instance; },
      () => new FormulaParser()
    );
  }

  /**
   * Get or create the FormulaExecutor singleton instance
   */
  static getExecutor(): FormulaExecutor {
    return this.getOrCreateSingleton(
      () => this.executorInstance,
      (instance) => { this.executorInstance = instance; },
      () => new FormulaExecutor()
    );
  }

  /**
   * Get the history manager singleton instance
   */
  static getHistoryManager() {
    return this.historyManagerInstance;
  }

  /**
   * Reset all service instances (useful for testing)
   * Properly cleans up resources before resetting references
   */
  static reset(): void {
    // Clean up FormulaExecutor's Worker resources before resetting
    // This prevents resource leaks and ensures proper cleanup
    if (this.executorInstance) {
      this.executorInstance.destroy();
    }

    // Reset instance references
    this.parserInstance = null;
    this.executorInstance = null;

    // Note: historyManager is a global singleton that doesn't need reset
    // If reset is needed in the future, add cleanup logic here
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