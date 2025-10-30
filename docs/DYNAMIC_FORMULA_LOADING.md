# Dynamic Formula Loading Guide

## Overview

The Formula Playground now supports a **dual-source architecture** for formula management:

1. **GitHub Source** - For metadata extraction, visualization, and documentation
2. **jsDelivr CDN** - For executable JavaScript code used in actual computation

This separation allows you to:
- View and understand formula logic from TypeScript source on GitHub
- Execute formulas using optimized, pre-built JavaScript from CDN
- Manage versions independently for source vs execution
- Cache compiled functions locally for performance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GitHub Import              Formula Settings                 │
│  (Metadata)                 (jsDelivr Config)                │
│       │                           │                           │
│       v                           v                           │
│  ┌─────────┐               ┌──────────┐                      │
│  │ Parser  │               │ Sandbox  │                      │
│  └────┬────┘               └────┬─────┘                      │
│       │                         │                             │
│       v                         v                             │
│  ┌──────────────────────────────────────┐                    │
│  │         IndexedDB Storage            │                    │
│  │  ┌──────────┐    ┌────────────────┐ │                    │
│  │  │ formulas │    │ compiledFormulas│ │                    │
│  │  │(metadata)│    │   (executable)  │ │                    │
│  │  └──────────┘    └────────────────┘ │                    │
│  └──────────────────────────────────────┘                    │
│                                                               │
│  Formula Execution                                            │
│  TSAdapter → Sandbox → jsDelivr (if enabled) → Execute       │
│           ↓                                                   │
│        Hardcoded Fallback (if jsDelivr fails)                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Import Formula from GitHub

1. Click the import button in the Formulas panel
2. Enter GitHub URL(s), one per line:
   ```
   https://github.com/owner/repo/blob/main/src/formulas.ts
   ```
3. The parser will extract metadata (name, inputs, outputs, description)
4. Source code is stored for display purposes

### 2. Configure jsDelivr Execution (Optional)

If you want to use CDN-hosted executable code:

1. Select a formula from the list
2. Open formula settings (gear icon or edit button)
3. Enter jsDelivr URL:
   ```
   https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/dist/formulas.js
   ```
4. Specify the function name (e.g., `calculateFundingFee`)
5. Enable jsDelivr execution
6. Save settings

### 3. Execute Formula

- When jsDelivr is enabled: Loads from CDN, caches locally
- When jsDelivr is disabled: Uses hardcoded implementation (if available)
- If loading fails: Automatically falls back to hardcoded

## JSDoc Integration

You can auto-configure jsDelivr during GitHub import using JSDoc tags:

```typescript
/**
 * @formulaId funding_fee
 * @name Funding Fee Calculation
 * @description Calculates funding fee for perpetual contracts
 * @jsdelivr https://cdn.jsdelivr.net/gh/orderly/formula-sdk@v1.2.0/dist/formulas.js#calculateFundingFee
 * @param {number} positionSize - Position size @unit USD @default 1000
 * @param {number} fundingRate - Funding rate @unit % @default 0.0001
 * @returns {number} Calculated funding fee @unit USD
 */
export function calculateFundingFee(
  positionSize: number,
  fundingRate: number
): number {
  return positionSize * fundingRate;
}
```

The `@jsdelivr` tag format:
- `URL#functionName` - Full format with explicit function name
- `URL` - URL only (uses the actual function name as default)

## How It Works

### GitHub Import Flow

1. User provides GitHub URL(s)
2. `github-ast-worker` fetches TypeScript source
3. `FormulaParser` extracts metadata using `ts-morph`:
   - Formula ID, name, version
   - Inputs/outputs with types
   - JSDoc descriptions
   - Optional `@jsdelivr` tag
4. `FormulaDefinition` stored in IndexedDB `formulas` table
5. Source code saved for display in UI

### jsDelivr Execution Flow

1. User executes formula
2. `TSAdapter` checks if `jsdelivrInfo.enabled` is true
3. If yes, `RuntimeSandbox` loads function:
   - Check memory cache (fastest)
   - Check IndexedDB cache (fast)
   - Fetch from jsDelivr CDN (slow)
4. Compile in isolated sandbox with restricted globals
5. Cache compiled function
6. Execute with user inputs
7. If fails, fallback to hardcoded implementation

### Security: Sandbox Isolation

Loaded code runs in a restricted environment:

**Allowed Globals:**
- Math, Number, Date, Object, Array, String, Boolean, JSON
- parseInt, parseFloat, isNaN, isFinite

**Blocked Globals:**
- window, document, fetch, XMLHttpRequest
- localStorage, sessionStorage, indexedDB
- eval, Function, setTimeout, setInterval

This prevents malicious code from:
- Accessing user data
- Making network requests
- Executing arbitrary code
- Persisting data

## Caching Strategy

### Three-Level Cache

1. **Memory Cache** - In-memory Map (fastest)
   - Cleared on page reload
   - Instant access

2. **IndexedDB Cache** - Persistent storage (fast)
   - Survives page reloads
   - Version-tracked
   - Auto-cleanup of old versions

3. **jsDelivr CDN** - Network fetch (slow)
   - Only when cache miss
   - Integrity verified via hash

### Cache Management

- Old versions auto-deleted (keeps latest 3)
- Corruption detected via hash verification
- Manual clear via `CacheManager.clearAll()`
- Per-formula version tracking

## Data Models

### FormulaDefinition

```typescript
interface FormulaDefinition {
  id: string;
  name: string;
  version: string;
  // ... inputs, outputs, etc ...
  
  // GitHub metadata (for display)
  sourceCode?: string;
  githubInfo?: {
    owner: string;
    repo: string;
    ref: string;
    path: string;
    url: string;
  };
  
  // jsDelivr execution (separate)
  jsdelivrInfo?: {
    url: string;
    functionName: string;
    version: string;
    enabled: boolean;
  };
}
```

### CompiledFormula

```typescript
interface CompiledFormula {
  id: string;              // `${formulaId}:${version}`
  formulaId: string;
  version: string;
  jsdelivrUrl: string;
  compiledCode: string;    // Cached for integrity check
  functionName: string;
  timestamp: number;
  hash: string;            // For integrity verification
}
```

## API Reference

### CacheManager

```typescript
const cacheManager = new CacheManager();

// Get cached compiled formula
await cacheManager.getCompiled(formulaId, version);

// Save compiled formula
await cacheManager.saveCompiled(compiledFormula);

// Get all versions
await cacheManager.getAllVersions(formulaId);

// Clear old versions (keep latest 3)
await cacheManager.clearOldVersions(formulaId);

// Get cache statistics
await cacheManager.getStats();
```

### TypeScriptRuntimeSandbox

```typescript
const sandbox = new TypeScriptRuntimeSandbox(cacheManager);

// Load function from jsDelivr
const func = await sandbox.loadFromJsDelivr(
  'https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/dist/formulas.js',
  'calculateFundingFee',
  'funding_fee',
  'v1.0.0'
);

// Execute
const result = func(1000, 0.0001);

// Clear memory cache
sandbox.clearMemoryCache();
```

## Best Practices

### For SDK Developers

1. **Add JSDoc tags** to auto-configure jsDelivr:
   ```typescript
   /**
    * @jsdelivr https://cdn.jsdelivr.net/gh/org/repo@v1.0.0/dist/formulas.js#funcName
    */
   ```

2. **Use semantic versioning** in URLs:
   ```
   @v1.0.0  ✓ Specific version (recommended)
   @main    ⚠ Latest from branch (unstable)
   @latest  ⚠ Latest release (may break)
   ```

3. **Build for CDN**:
   - Bundle to single file
   - Export named functions
   - No external dependencies (or bundle them)
   - Minify for faster loading

### For Users

1. **Test before enabling**:
   - Import from GitHub first
   - Verify metadata looks correct
   - Configure jsDelivr URL
   - Test with known inputs before enabling

2. **Version management**:
   - Match GitHub version with jsDelivr version when possible
   - Update both when upgrading
   - Keep old versions cached for rollback

3. **Performance**:
   - First execution is slow (network fetch)
   - Subsequent executions are fast (cached)
   - Clear cache if formulas misbehave

## Troubleshooting

### "Failed to fetch from jsDelivr"

**Causes:**
- Invalid URL
- Network issues
- CORS problems
- Version doesn't exist

**Solutions:**
1. Check URL in browser manually
2. Verify version exists on GitHub
3. Use jsDelivr purge API if cached incorrectly
4. Fallback to hardcoded implementation

### "Function not found in loaded code"

**Causes:**
- Wrong function name
- Function not exported
- Build error in source

**Solutions:**
1. Inspect the actual JS file on jsDelivr
2. Verify function name matches exactly
3. Check if function is exported
4. Rebuild and republish

### "Cache integrity check failed"

**Causes:**
- Corrupted cache
- File modified after caching
- Hash collision (rare)

**Solutions:**
1. Clear cache: `cacheManager.clearAll()`
2. Will auto-refetch from jsDelivr
3. Re-save with new hash

### Formulas not appearing after import

**Causes:**
- Parse error
- Invalid JSDoc format
- Network timeout

**Solutions:**
1. Check browser console for errors
2. Verify GitHub URL is accessible
3. Ensure JSDoc tags are properly formatted
4. Try importing single file first

## Future Enhancements

- [ ] UI indicator showing jsDelivr vs hardcoded execution
- [ ] Version comparison tool (GitHub vs jsDelivr)
- [ ] Batch jsDelivr configuration
- [ ] Cache warming (preload popular formulas)
- [ ] Subresource Integrity (SRI) verification
- [ ] Alternative CDN support (unpkg, etc.)
- [ ] Local file import option
- [ ] Formula marketplace

## Security Considerations

1. **Sandbox limitations**:
   - Cannot prevent infinite loops
   - Cannot limit memory usage
   - Cannot prevent CPU-intensive operations

2. **Trust model**:
   - Only load from trusted sources
   - Verify URLs before enabling
   - Review code on GitHub before importing

3. **Recommended practices**:
   - Pin specific versions (not `@latest`)
   - Use organizations you trust
   - Test in safe environment first
   - Monitor execution time/results

## License

This feature is part of Formula Playground, subject to project license.

