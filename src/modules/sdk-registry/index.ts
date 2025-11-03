import type { SDKAdapter } from "../../types/executor";

/**
 * SDKAdapterRegistry - Manages SDK adapters for different execution engines
 */
export class SDKAdapterRegistry {
  private adapters: Map<string, SDKAdapter>;

  constructor() {
    this.adapters = new Map();
  }

  /**
   * Register an SDK adapter
   */
  register(adapter: SDKAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get an SDK adapter by ID
   */
  getAdapter(id: "ts" | "rust" | "local"): SDKAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): SDKAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Check if an adapter is registered
   */
  hasAdapter(id: string): boolean {
    return this.adapters.has(id);
  }
}

// Create a singleton instance
export const sdkRegistry = new SDKAdapterRegistry();
