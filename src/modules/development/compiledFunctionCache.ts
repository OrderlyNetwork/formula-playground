/**
 * Compiled Function Cache
 *
 * Stores compiled functions for development mode to avoid recompiling
 * on every cell change. Functions are compiled once during parsing
 * and reused during execution.
 */

/**
 * A compiled executable function type
 */
type CompiledFunction = (...args: unknown[]) => unknown;

/**
 * Cache entry for a compiled function
 */
interface CompiledFunctionEntry {
  /** The executable function */
  func: CompiledFunction;
  /** When the function was compiled */
  timestamp: number;
  /** When the cache entry expires (optional TTL) */
  expiresAt?: number;
  /** Source code hash for cache invalidation */
  hash: string;
  /** Last access time for LRU eviction */
  lastAccessed: number;
  /** Access frequency for smarter eviction */
  accessCount: number;
}

/**
 * Configuration for cache management
 */
interface CacheConfig {
  /** Maximum number of entries in cache */
  maxSize: number;
  /** Default TTL in milliseconds (undefined = no expiration) */
  defaultTtl?: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Global cache for compiled functions with memory management
 * Key: formulaId
 * Value: Compiled function entry
 */
class CompiledFunctionCache {
  private cache: Map<string, CompiledFunctionEntry> = new Map();
  private config: CacheConfig = {
    maxSize: 100,
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanupTimer();
  }

  /**
   * Start the periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup timer (for cleanup)
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Evict least recently used entries if cache is at maximum size
   */
  private evictLRU(): void {
    if (this.cache.size < this.config.maxSize) {
      return;
    }

    // Sort entries by lastAccessed time (oldest first) and access frequency
    const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
      // Primary sort: last accessed time
      const timeDiff = a.lastAccessed - b.lastAccessed;
      if (timeDiff !== 0) return timeDiff;

      // Secondary sort: access count (less frequently accessed first)
      return a.accessCount - b.accessCount;
    });

    // Evict oldest entries to make room
    const toEvict = Math.ceil(this.config.maxSize * 0.2); // Evict 20% when full
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Store a compiled function in cache
   * @param formulaId - Formula identifier
   * @param func - Compiled executable function
   * @param sourceHash - Hash of the source code for validation
   * @param ttl - Optional custom TTL in milliseconds
   */
  set(
    formulaId: string,
    func: CompiledFunction,
    sourceHash: string,
    ttl?: number
  ): void {
    const now = Date.now();

    // Ensure we have space for the new entry
    this.evictLRU();

    this.cache.set(formulaId, {
      func,
      timestamp: now,
      expiresAt: ttl ? now + ttl : this.config.defaultTtl ? now + this.config.defaultTtl : undefined,
      hash: sourceHash,
      lastAccessed: now,
      accessCount: 0,
    });
  }

  /**
   * Get a compiled function from cache
   * @param formulaId - Formula identifier
   * @param sourceHash - Optional hash to validate cache entry
   * @returns Compiled function or undefined if not found or invalid
   */
  get(formulaId: string, sourceHash?: string): CompiledFunction | undefined {
    const entry = this.cache.get(formulaId);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt <= now) {
      // Entry expired, remove from cache
      this.cache.delete(formulaId);
      return undefined;
    }

    // If hash provided, validate it matches
    if (sourceHash && entry.hash !== sourceHash) {
      // Hash mismatch, invalidate cache
      this.cache.delete(formulaId);
      return undefined;
    }

    // Update access tracking for LRU
    entry.lastAccessed = now;
    entry.accessCount++;

    return entry.func;
  }

  /**
   * Check if a formula has a valid compiled function in cache
   * @param formulaId - Formula identifier
   * @returns True if cached function exists and is not expired
   */
  has(formulaId: string): boolean {
    const entry = this.cache.get(formulaId);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.cache.delete(formulaId);
      return false;
    }

    return true;
  }

  /**
   * Remove a formula's compiled function from cache
   * @param formulaId - Formula identifier
   */
  delete(formulaId: string): void {
    this.cache.delete(formulaId);
  }

  /**
   * Clear all compiled functions from cache and stop cleanup timer
   */
  clear(): void {
    this.stopCleanupTimer();
    this.cache.clear();
  }

  /**
   * Get comprehensive cache statistics for debugging
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      isExpired: entry.expiresAt ? entry.expiresAt <= now : false,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
      ageMinutes: Math.round((now - entry.timestamp) / 60000),
      lastAccessMinutes: Math.round((now - entry.lastAccessed) / 60000),
    }));

    const expiredCount = entries.filter(e => e.isExpired).length;
    const avgAccessCount = entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length)
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      defaultTtl: this.config.defaultTtl,
      cleanupInterval: this.config.cleanupInterval,
      expiredCount,
      avgAccessCount,
      entries,
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo() {
    const now = Date.now();
    let totalSize = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      // Rough estimation of memory usage per entry
      totalSize += 200; // Base object overhead + function reference
      if (entry.hash) totalSize += entry.hash.length * 2;

      if (entry.expiresAt && entry.expiresAt <= now) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      estimatedMemoryBytes: totalSize,
      estimatedMemoryKB: Math.round(totalSize / 1024 * 100) / 100,
      maxSize: this.config.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.config.maxSize) * 100),
    };
  }

  /**
   * Manually trigger cleanup of expired entries
   */
  cleanup(): void {
    this.cleanupExpiredEntries();
  }

  /**
   * Force eviction of least recently used entries (useful for memory pressure)
   * @param count - Number of entries to evict (default: 10% of cache)
   */
  forceEvict(count?: number): void {
    if (this.cache.size === 0) return;

    const toEvict = count ?? Math.ceil(this.cache.size * 0.1);

    // Sort by last accessed time and access frequency
    const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
      const timeDiff = a.lastAccessed - b.lastAccessed;
      if (timeDiff !== 0) return timeDiff;
      return a.accessCount - b.accessCount;
    });

    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }
  }

  /**
   * Update cache configuration
   * @param newConfig - Partial configuration to update
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const wasCleanupActive = !!this.cleanupTimer;

    if (wasCleanupActive) {
      this.stopCleanupTimer();
    }

    this.config = { ...this.config, ...newConfig };

    // Evict entries if new max size is smaller
    if (newConfig.maxSize && this.cache.size > newConfig.maxSize) {
      this.evictLRU();
    }

    if (wasCleanupActive) {
      this.startCleanupTimer();
    }
  }

  /**
   * Cleanup method to be called when the cache is no longer needed
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
  }
}

/**
 * Simple hash function for source code
 * @param str - String to hash
 * @returns Hash string
 */
export function hashSourceCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Export types and singleton instance
export type { CompiledFunction, CompiledFunctionEntry, CacheConfig };
export { CompiledFunctionCache };
export const compiledFunctionCache = new CompiledFunctionCache();
