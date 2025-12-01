import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import LZString from "lz-string";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { db } from "@/lib/dexie";
import type { CellValue } from "@/types/spreadsheet";

export type DataSource = "url" | "indexeddb" | "none";

export interface DataConflictInfo {
  urlData: Record<string, Record<string, CellValue>>;
  dbData: Record<string, Record<string, CellValue>>;
  urlDataCount: number;
  dbDataCount: number;
}

/**
 * Fast hash function for cell data (FNV-1a algorithm)
 * Much faster than JSON.stringify for large objects
 */
function hashCellData(data: Record<string, Record<string, CellValue>>): string {
  let hash = 2166136261; // FNV offset basis

  // Sort keys for consistent hashing
  const sortedRowIds = Object.keys(data).sort();

  for (const rowId of sortedRowIds) {
    const row = data[rowId];
    const sortedColIds = Object.keys(row).sort();

    // Hash row ID
    for (let i = 0; i < rowId.length; i++) {
      hash ^= rowId.charCodeAt(i);
      hash = Math.imul(hash, 16777619); // FNV prime
    }

    // Hash each cell
    for (const colId of sortedColIds) {
      const value = row[colId];
      const str = String(value ?? ""); // Convert to string, handle null/undefined

      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
    }
  }

  // Convert to hex string
  return (hash >>> 0).toString(36);
}

/**
 * Deep compare two cell data objects to check if they have the same content
 * Uses a hybrid strategy for optimal performance:
 * 1. Quick hash comparison (O(n)) - fast path for identical data
 * 2. Structural check (row/column counts) - fast rejection
 * 3. Full deep comparison - only when hash matches but structure differs (rare)
 *
 * @param data1 - First data object
 * @param data2 - Second data object
 * @returns true if the data is identical, false otherwise
 */
function isSameData(
  data1: Record<string, Record<string, CellValue>>,
  data2: Record<string, Record<string, CellValue>>
): boolean {
  // Strategy 1: Quick hash comparison (fastest for large identical datasets)
  // This is O(n) but with low constant factor, much faster than deep comparison
  const hash1 = hashCellData(data1);
  const hash2 = hashCellData(data2);

  if (hash1 !== hash2) {
    // Different hashes = definitely different data
    return false;
  }

  // Hash collision is extremely rare, but we do a quick structural check
  // to be absolutely certain (this is very fast)

  // Strategy 2: Quick structural check
  const rows1 = Object.keys(data1);
  const rows2 = Object.keys(data2);

  if (rows1.length !== rows2.length) {
    return false;
  }

  // Strategy 3: Full deep comparison (only when hashes match)
  // This happens rarely (only when data is actually the same or hash collision)
  for (const rowId of rows1) {
    const row1 = data1[rowId];
    const row2 = data2[rowId];

    // If row doesn't exist in data2
    if (!row2) {
      return false;
    }

    // Compare columns in this row
    const cols1 = Object.keys(row1);
    const cols2 = Object.keys(row2);

    if (cols1.length !== cols2.length) {
      return false;
    }

    // Compare each cell value
    for (const colId of cols1) {
      const value1 = row1[colId];
      const value2 = row2[colId];

      // Handle null and undefined as equivalent
      if (
        (value1 === null || value1 === undefined) &&
        (value2 === null || value2 === undefined)
      ) {
        continue;
      }

      // Strict equality check for other values
      if (value1 !== value2) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Hook to sync spreadsheet data with URL query parameters
 * Uses lz-string to compress data and stores it in the 'data' query parameter
 * Handles conflicts between URL data and IndexedDB data
 *
 * Conflict resolution strategy:
 * - When both URL and IndexedDB have data, compares the content deeply
 * - If content is identical (page refresh scenario), uses data without showing conflict dialog
 * - If content differs (real conflict), shows conflict dialog for user to choose resolution
 */
export function useSpreadsheetUrlSync(
  formulaId: string,
  onConflict?: (
    conflictInfo: DataConflictInfo
  ) => Promise<"merge" | "replace-url" | "replace-db" | "cancel">
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const gridStore = useSpreadsheetStore((state) =>
    state.getTabGridStore(formulaId)
  );
  const isRestoringRef = useRef(false);
  const lastDataRef = useRef<string>("");
  const hasRestoredDataRef = useRef(false); // Use ref instead of state to avoid triggering useEffect
  const initialUrlDataRef = useRef<string | null>(null); // Track initial URL data to prevent re-processing

  // 1. Clean up URL data when formulaId changes
  useEffect(() => {
    // When switching to a new formula, clear the data parameter
    // to prevent applying wrong formula's data
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        const urlFormulaId = newParams.get("formulaId");

        // If URL has a different formulaId, clear the data
        if (urlFormulaId && urlFormulaId !== formulaId) {
          newParams.delete("data");
          lastDataRef.current = "";
        }

        // Always update formulaId in URL
        newParams.set("formulaId", formulaId);
        return newParams;
      },
      { replace: true }
    );

    // Reset restoration flag and initial URL tracking when formula changes
    hasRestoredDataRef.current = false;
    initialUrlDataRef.current = null;
  }, [formulaId, setSearchParams]);

  // 2. Restore data from URL and/or IndexedDB on mount or when formula changes
  // Note: We intentionally don't include searchParams in dependencies to avoid re-running
  // when URL is updated by user edits. We only restore on initial mount or formula change.
  useEffect(() => {
    if (!gridStore) {
      console.log("⏸️ Restore skipped: no gridStore");
      return;
    }

    if (hasRestoredDataRef.current) {
      console.log("⏸️ Restore skipped: data already restored");
      return;
    }

    const restoreData = async () => {
      const urlFormulaId = searchParams.get("formulaId");
      const compressedData = searchParams.get("data");

      // Capture initial URL data on first run to prevent re-processing user edits
      if (initialUrlDataRef.current === null) {
        initialUrlDataRef.current = compressedData || "";
        console.log(
          "🔍 Initial URL data captured:",
          compressedData ? "has data" : "empty"
        );
      }

      // Parse URL data if available
      // Only restore initial URL data, not data from subsequent user edits
      let urlData: Record<string, Record<string, CellValue>> | null = null;
      if (
        compressedData &&
        compressedData === initialUrlDataRef.current && // Only process initial URL data
        (!urlFormulaId || urlFormulaId === formulaId)
      ) {
        try {
          const jsonString =
            LZString.decompressFromEncodedURIComponent(compressedData);
          if (jsonString) {
            urlData = JSON.parse(jsonString);
          }
        } catch (error) {
          console.error("Failed to parse URL data:", error);
        }
      }

      // Load IndexedDB data if available
      let dbData: Record<string, Record<string, CellValue>> | null = null;
      try {
        const tabState = await db.tabFormulaStates.get(formulaId);
        if (tabState && tabState.cellData) {
          // Convert flat cellData to nested structure
          dbData = {};
          Object.entries(tabState.cellData).forEach(([key, value]) => {
            const [rowId, colId] = key.split(":");
            if (rowId && colId) {
              if (!dbData![rowId]) {
                dbData![rowId] = {};
              }
              dbData![rowId][colId] = value;
            }
          });
        }
      } catch (error) {
        console.error("Failed to load IndexedDB data:", error);
      }

      // Count non-empty cells
      const countCells = (
        data: Record<string, Record<string, CellValue>> | null
      ): number => {
        if (!data) return 0;
        return Object.values(data).reduce(
          (sum, row) => sum + Object.keys(row).length,
          0
        );
      };

      const urlDataCount = countCells(urlData);
      const dbDataCount = countCells(dbData);

      // Determine what to do based on available data
      let finalData: Record<string, Record<string, CellValue>> | null = null;

      if (urlDataCount > 0 && dbDataCount > 0) {
        // Potential CONFLICT: Both sources have data
        // First, check if the data is actually the same (page refresh scenario)
        const dataIsIdentical = isSameData(urlData!, dbData!);

        if (dataIsIdentical) {
          // Same data - this is a page refresh, not a real conflict
          // Just use the data without showing conflict dialog
          console.log(
            "📋 URL data matches IndexedDB data (page refresh detected)"
          );
          finalData = urlData; // or dbData, they are the same
        } else {
          // Different data - this is a REAL conflict
          console.log(
            "⚠️ Data conflict detected: URL and IndexedDB data differ"
          );

          if (onConflict) {
            const resolution = await onConflict({
              urlData: urlData!,
              dbData: dbData!,
              urlDataCount,
              dbDataCount,
            });

            switch (resolution) {
              case "merge":
                // Merge: DB data first, then URL data (URL takes priority)
                finalData = { ...dbData };
                Object.entries(urlData!).forEach(([rowId, rowData]) => {
                  if (!finalData![rowId]) {
                    finalData![rowId] = {};
                  }
                  Object.assign(finalData![rowId], rowData);
                });
                break;
              case "replace-url":
                finalData = urlData;
                break;
              case "replace-db":
                finalData = dbData;
                break;
              case "cancel":
                // Use DB data as default
                finalData = dbData;
                break;
            }
          } else {
            // No conflict handler, default to URL data
            finalData = urlData;
          }
        }
      } else if (urlDataCount > 0) {
        // Only URL data
        finalData = urlData;
      } else if (dbDataCount > 0) {
        // Only IndexedDB data
        finalData = dbData;
      }

      // Apply the final data to GridStore
      if (finalData) {
        isRestoringRef.current = true;

        // Use silent mode (true) to prevent triggering change notifications during restore
        Object.entries(finalData).forEach(([rowId, rowData]) => {
          if (typeof rowData === "object" && rowData !== null) {
            Object.entries(rowData).forEach(([colId, value]) => {
              gridStore.setValue(rowId, colId, value, true);
            });
          }
        });

        if (compressedData) {
          lastDataRef.current = compressedData;
        }

        // Reset restoring flag synchronously after all values are set
        isRestoringRef.current = false;
      }

      // Mark as restored using ref to avoid triggering useEffect re-run
      hasRestoredDataRef.current = true;
      console.log("✅ Data restoration completed");
    };

    restoreData();
  }, [gridStore, formulaId, onConflict]);

  // 3. Subscribe to GridStore changes and update URL
  useEffect(() => {
    if (!gridStore) return;

    const handleGlobalChange = () => {
      if (isRestoringRef.current) {
        console.log("⏸️ URL update skipped: currently restoring data");
        return;
      }

      // Get all data from store
      const allData = gridStore.getAllData();

      // If no data, remove param
      if (Object.keys(allData).length === 0) {
        if (lastDataRef.current !== "") {
          console.log("🔄 Clearing URL data (no spreadsheet data)");
          setSearchParams(
            (prev) => {
              const newParams = new URLSearchParams(prev);
              newParams.delete("data");
              return newParams;
            },
            { replace: true }
          );
          lastDataRef.current = "";
        }
        return;
      }

      // Compress data
      const jsonString = JSON.stringify(allData);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);

      // Only update if changed
      if (compressed !== lastDataRef.current) {
        console.log("🔄 Updating URL with new spreadsheet data");
        lastDataRef.current = compressed;
        setSearchParams(
          (prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set("formulaId", formulaId);
            newParams.set("data", compressed);
            return newParams;
          },
          { replace: true }
        );
      }
    };

    // Debounce the update to avoid excessive URL updates
    const debounce = (fn: () => void, ms: number) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, ms);
      };
    };

    const debouncedHandler = debounce(handleGlobalChange, 500);

    // Subscribe to global changes
    const unsubscribe = gridStore.subscribeToGlobalChanges(debouncedHandler);

    return () => {
      unsubscribe();
    };
  }, [gridStore, setSearchParams, formulaId]);
}
