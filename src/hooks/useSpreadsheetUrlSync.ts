import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import {
  dataFlowManager,
  type DataConflictInfo,
  type ConflictResolution,
} from "@/modules/formula-datasheet/services/DataFlowManager";

export type { DataConflictInfo };

/**
 * Hook to sync spreadsheet data with URL query parameters
 * Delegates logic to DataFlowManager
 */
export function useSpreadsheetUrlSync(
  formulaId: string,
  onConflict?: (
    conflictInfo: DataConflictInfo
  ) => Promise<ConflictResolution>
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const gridStore = useSpreadsheetStore((state) =>
    state.getTabGridStore(formulaId)
  );
  
  // Register handlers
  useEffect(() => {
    dataFlowManager.registerUrlUpdateHandler((params) => {
      setSearchParams(params, { replace: true });
    });

    if (onConflict) {
      dataFlowManager.registerConflictHandler(onConflict);
    }
  }, [setSearchParams, onConflict]);

  // Initialize data flow
  useEffect(() => {
    if (!gridStore) return;

    const compressedData = searchParams.get("data");
    dataFlowManager.initialize(formulaId, compressedData);
    
  }, [gridStore, formulaId]); // Intentionally not including searchParams to avoid loops

  // Subscribe to GridStore changes
  useEffect(() => {
    if (!gridStore) return;

    const handleGlobalChange = () => {
      const allData = gridStore.getAllData();
      dataFlowManager.handleStoreUpdate(formulaId, allData);
    };

    // Debounce the update
    const debounce = (fn: () => void, ms: number) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, ms);
      };
    };

    const debouncedHandler = debounce(handleGlobalChange, 500);
    const unsubscribe = gridStore.subscribeToGlobalChanges(debouncedHandler);

    return () => {
      unsubscribe();
    };
  }, [gridStore, formulaId]);
}
