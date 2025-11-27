# Tab Persistence Integration Guide

## Quick Integration Steps

### Step 1: Update Spreadsheet Component

Add the useTabPersistence hook to your Spreadsheet component:

```typescript
// In src/pages/datasheet/components/spreadsheet/Spreadsheet.tsx
import { useTabPersistence } from "@/pages/datasheet/hooks/useTabPersistence";

const Spreadsheet: React.FC<SpreadsheetProps> = ({ flattenedPaths }) => {
  // ... existing code ...

  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);

  // Add tab persistence integration
  useTabPersistence(currentFormula?.id, storeRef.current);

  // ... rest of component ...
};
```

That's it! The hook automatically handles:

- Saving tab state on edits (debounced)
- Loading tab state on tab switch
- Marking tabs as dirty/clean
- Setting loading states

### Step 2: Verify TabBar Integration

The TabBar is already updated and will show:

- 🔵 Loading spinner when restoring tab state
- 🟠 Orange dot when tab has unsaved changes

### Step 3: Test the Integration

1. **Create a tab**: Open a formula
2. **Edit some cells**: Should see orange dot appear
3. **Wait 500ms**: Orange dot should disappear (auto-saved)
4. **Switch tabs**: Should see loading spinner briefly
5. **Refresh browser**: All tabs and their data should restore

### Optional: Access Tab Persistence Methods

If you need manual control:

```typescript
const { saveTabState, loadTabState } = useTabPersistence(
  currentFormula?.id,
  storeRef.current
);

// Manual save
await saveTabState();

// Manual load (usually not needed - automatic)
await loadTabState(formulaId);
```

### Optional: Monitor Tab States

```typescript
import { useFormulaTabStore } from "@/store/formulaTabStore";

// Get all tabs with their states
const tabs = useFormulaTabStore((state) => state.tabs);

tabs.forEach((tab) => {
  console.log(tab.id, {
    isLoading: tab.isLoading,
    isDirty: tab.isDirty,
  });
});
```

### Optional: Access Persistence Service Directly

```typescript
import { tabPersistenceService } from "@/services/TabPersistenceService";

// Check cache stats
const stats = tabPersistenceService.getCacheStats();
console.log("Active tabs in cache:", stats.activeTabs);
console.log("Dirty tabs:", stats.dirtyTabs);

// Check if tab has saved state
const hasSaved = await tabPersistenceService.hasTabState(formulaId);

// Delete tab state
await tabPersistenceService.deleteTabState(formulaId);
```

## Configuration

All configuration is in `TabPersistenceService.ts`:

```typescript
const CONFIG = {
  MAX_ACTIVE_TABS: 5, // Tabs kept in memory
  DEBOUNCE_DELAY: 500, // ms for edit debounce
  FORCE_SAVE_INTERVAL: 5000, // ms for force save
  TAB_SWITCH_DEBOUNCE: 200, // ms for tab switching
  RESTORE_TIMEOUT: 5000, // ms for restoration timeout
  SCHEMA_VERSION: "1.0.0", // Schema version
};
```

## Debugging

Enable detailed logging:

```typescript
// In browser console
localStorage.setItem("debug", "tab-persistence:*");

// You'll see:
// ✅ Tab state persisted to IndexedDB: formula-123
// ✅ Tab state restored from IndexedDB: formula-123
// 🗑️ Tab evicted from cache: formula-456
// Tab already open, activating: formula-789
```

## Common Issues

### Tab state not saving

- Check browser console for errors
- Verify GridStore is initialized (`storeRef.current !== null`)
- Ensure formulaId is defined

### Tab state not loading

- Check IndexedDB (Chrome DevTools > Application > IndexedDB)
- Verify `tabFormulaStates` table exists
- Check for validation errors in console

### Performance issues

- Reduce MAX_ACTIVE_TABS if memory is constrained
- Increase DEBOUNCE_DELAY if saves are too frequent
- Check cache stats with `getCacheStats()`

## Migration Notes

Since this is a new implementation (no legacy data), no migration is needed. Existing functionality continues to work:

- Global `rows` and `calculationResults` still available
- Old components don't need updates
- New per-tab features opt-in via hooks

## Next Steps

After integration:

1. Test all tab operations thoroughly
2. Monitor IndexedDB growth
3. Consider adding toast notifications
4. Add manual save button/shortcut if desired
5. Implement tab export/import if needed
