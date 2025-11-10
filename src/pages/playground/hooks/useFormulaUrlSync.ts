import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useFormulaStore } from "@/store/formulaStore";
import { useGraphStore } from "@/store/graphStore";
import { useCanvasStore } from "@/store/canvasStore";

/**
 * Encodes an object to base64 URL-safe string
 * @param obj - Object to encode
 * @returns Base64 encoded string
 */
function encodeParams(obj: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(obj);
    // Use base64url encoding (URL-safe)
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch (error) {
    console.error("Failed to encode params:", error);
    return "";
  }
}

/**
 * Decodes a base64 URL-safe string to an object
 * @param encoded - Base64 encoded string
 * @returns Decoded object or null if decoding fails
 */
function decodeParams(encoded: string): Record<string, unknown> | null {
  try {
    // Restore base64url to standard base64
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to decode params:", error);
    return null;
  }
}

/**
 * Multi-formula URL data structure
 * Used when canvas mode is "multi" to store multiple formulas and their params
 */
interface MultiFormulaUrlData {
  formulas: Array<{
    id: string;
    params: Record<string, unknown>;
  }>;
}

/**
 * Hook to sync formula ID and parameters with URL
 * - When formula ID changes, updates URL path to /formula/:id
 * - When parameters change, updates URL search params with base64 encoded params
 * - When URL changes, decodes and applies params to store
 * - Prevents circular updates by tracking sync state
 * - Supports multi-formula mode: when canvas mode is "multi", stores all formulas in "formulas" param
 */
export function useFormulaUrlSync() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedFormulaId,
    currentInputs,
    selectFormula,
    setInputs,
    formulaDefinitions,
    loading,
  } = useFormulaStore();
  // Get store instance to access getState for latest values
  const store = useFormulaStore;
  // Get graph store to check if nodes are generated
  const { nodes: graphNodes } = useGraphStore();
  // Get canvas store for multi-formula mode
  const {
    mode: canvasMode,
    canvasFormulaIds,
    formulaParams,
    setFormulaParams,
  } = useCanvasStore();

  // Track if we're currently syncing from URL to prevent circular updates
  const isSyncingFromUrlRef = useRef(false);
  // Track last synced inputs to avoid unnecessary URL updates
  const lastSyncedInputsRef = useRef<Record<string, unknown>>({});
  // Track last synced formula ID
  const lastSyncedFormulaIdRef = useRef<string | null>(null);
  // Track if this is the initial mount to handle URL restoration
  const isInitialMountRef = useRef(true);
  // Track pending params restoration (waiting for nodes to be generated)
  const pendingParamsRestoreRef = useRef<Record<string, unknown> | null>(null);

  /**
   * Update URL with current formula ID and parameters
   * Uses replace to avoid adding history entries
   * Supports both single and multi formula modes
   */
  const updateUrl = useCallback(
    (formulaId: string | null, inputs: Record<string, unknown>) => {
      if (isSyncingFromUrlRef.current) {
        // Don't update URL if we're currently syncing from URL
        return;
      }

      // Multi-formula mode: store all formulas in "formulas" param
      if (canvasMode === "multi" && canvasFormulaIds.length > 0) {
        // Build multi-formula data structure
        const multiFormulaData: MultiFormulaUrlData = {
          formulas: canvasFormulaIds.map((id) => ({
            id,
            params: formulaParams[id] || {},
          })),
        };

        const encodedFormulas = encodeParams(
          multiFormulaData as Record<string, unknown>
        );

        // Use the first formula ID as the main path (or current selectedFormulaId if available)
        const mainFormulaId = formulaId || canvasFormulaIds[0] || params.id;

        if (mainFormulaId) {
          const newSearchParams: Record<string, string> = {};
          if (encodedFormulas) {
            newSearchParams.formulas = encodedFormulas;
          }

          // If we have a selected formula with inputs, also include single params for backward compatibility
          if (formulaId && Object.keys(inputs).length > 0) {
            const encoded = encodeParams(inputs);
            if (encoded) {
              newSearchParams.params = encoded;
            }
          }

          const queryString = new URLSearchParams(newSearchParams).toString();
          const newUrl = `/formula/${mainFormulaId}${
            queryString ? `?${queryString}` : ""
          }`;

          if (
            mainFormulaId !== params.id ||
            queryString !== new URLSearchParams(searchParams).toString()
          ) {
            navigate(newUrl, { replace: true });
          }
        }
        return;
      }

      // Single formula mode: use existing logic
      // Update path if formula ID changed
      if (formulaId && formulaId !== params.id) {
        const encoded = encodeParams(inputs);
        if (encoded && Object.keys(inputs).length > 0) {
          navigate(`/formula/${formulaId}?params=${encoded}`, {
            replace: true,
          });
        } else {
          navigate(`/formula/${formulaId}`, { replace: true });
        }
        lastSyncedFormulaIdRef.current = formulaId;
      } else if (!formulaId && params.id) {
        // If no formula selected but URL has ID, navigate to root
        navigate("/", { replace: true });
        lastSyncedFormulaIdRef.current = null;
        return;
      }

      // Update search params if inputs changed (only if we're on a formula page)
      if (formulaId) {
        const inputsChanged =
          JSON.stringify(inputs) !==
          JSON.stringify(lastSyncedInputsRef.current);

        if (inputsChanged && Object.keys(inputs).length > 0) {
          const encoded = encodeParams(inputs);
          if (encoded) {
            // Only update if the encoded value is different from current URL params
            // This prevents redundant updates when the values are the same
            const currentParams = searchParams.get("params");
            if (encoded !== currentParams) {
              setSearchParams({ params: encoded }, { replace: true });
            }
            lastSyncedInputsRef.current = inputs;
          }
        } else if (
          Object.keys(inputs).length === 0 &&
          searchParams.has("params")
        ) {
          // Clear params if inputs are empty
          setSearchParams({}, { replace: true });
          lastSyncedInputsRef.current = {};
        }
      }
    },
    [
      navigate,
      params.id,
      searchParams,
      setSearchParams,
      canvasMode,
      canvasFormulaIds,
      formulaParams,
    ]
  );

  /**
   * Sync formula ID from URL to store
   * This effect runs when URL params change (e.g., user pastes a shared URL)
   * Handles both single and multi formula modes
   */
  useEffect(() => {
    const urlFormulaId = params.id;
    const encodedFormulas = searchParams.get("formulas");
    const encodedParams = searchParams.get("params");

    // Check if formula exists in definitions
    const formulaExists = urlFormulaId
      ? formulaDefinitions.some((f) => f.id === urlFormulaId)
      : false;

    // CRITICAL: Wait for formulas to load before proceeding
    if (loading) {
      return;
    }

    // Handle multi-formula mode URL restoration
    if (encodedFormulas) {
      const decodedFormulas = decodeParams(
        encodedFormulas
      ) as MultiFormulaUrlData | null;
      if (decodedFormulas && Array.isArray(decodedFormulas.formulas)) {
        isSyncingFromUrlRef.current = true;
        try {
          // Switch to multi mode if not already
          if (useCanvasStore.getState().mode !== "multi") {
            useCanvasStore.getState().setMode("multi");
          }

          // Clear current canvas
          useCanvasStore.getState().clearCanvas();

          // Restore each formula with its params
          for (const formulaData of decodedFormulas.formulas) {
            const { id, params: formulaParams } = formulaData;

            // Check if formula exists
            if (formulaDefinitions.some((f) => f.id === id)) {
              // Add formula to canvas
              useCanvasStore.getState().addFormulaToCanvas(id);

              // Store formula params
              if (formulaParams && Object.keys(formulaParams).length > 0) {
                useCanvasStore.getState().setFormulaParams(id, formulaParams);
              }

              // Select the first formula (or URL formula ID if it matches)
              if (
                !selectedFormulaId ||
                selectedFormulaId === id ||
                decodedFormulas.formulas[0]?.id === id
              ) {
                selectFormula(id);
                if (formulaParams && Object.keys(formulaParams).length > 0) {
                  // Restore params for the selected formula
                  queueMicrotask(() => {
                    setInputs(formulaParams);
                    lastSyncedInputsRef.current = formulaParams;
                  });
                }
              }
            }
          }

          setTimeout(() => {
            isSyncingFromUrlRef.current = false;
          }, 100);
        } catch (error) {
          console.error(
            "Failed to restore multi-formula mode from URL:",
            error
          );
          isSyncingFromUrlRef.current = false;
        }
        return;
      }
    }

    // Handle single formula mode (existing logic)
    if (urlFormulaId && formulaExists) {
      // Check if URL has params that haven't been applied yet
      const hasUrlParams = Boolean(encodedParams);
      let hasUnappliedParams = false;

      if (hasUrlParams && encodedParams) {
        const decodedUrlParams = decodeParams(encodedParams);
        if (decodedUrlParams && Object.keys(decodedUrlParams).length > 0) {
          // Compare with lastSyncedInputs to see if these params have been applied
          const lastSyncedStr = JSON.stringify(lastSyncedInputsRef.current);
          const urlParamsStr = JSON.stringify(decodedUrlParams);
          hasUnappliedParams = lastSyncedStr !== urlParamsStr;
        }
      }

      // Only sync if:
      // 1. URL ID is different from current selected ID, OR
      // 2. This is initial mount and URL has an ID, OR
      // 3. URL has params that haven't been applied yet
      const shouldSync =
        urlFormulaId !== selectedFormulaId ||
        (isInitialMountRef.current &&
          urlFormulaId !== lastSyncedFormulaIdRef.current) ||
        hasUnappliedParams;

      if (shouldSync) {
        isSyncingFromUrlRef.current = true;
        try {
          // Check if URL has params - if so, we need to restore them after selecting formula
          const encodedParams = searchParams.get("params");
          const hasParams = Boolean(encodedParams);

          // If URL has params, decode them BEFORE selecting formula
          let decodedParams: Record<string, unknown> | null = null;
          if (hasParams) {
            decodedParams = encodedParams ? decodeParams(encodedParams) : null;

            if (decodedParams && Object.keys(decodedParams).length > 0) {
              // Mark these params as already synced to prevent URL updates
              lastSyncedInputsRef.current = decodedParams;
              pendingParamsRestoreRef.current = decodedParams;
            } else {
              // Decoding failed, treat as no params
              decodedParams = null;
              pendingParamsRestoreRef.current = null;
              lastSyncedInputsRef.current = {};
            }
          } else {
            pendingParamsRestoreRef.current = null;
            lastSyncedInputsRef.current = {};
          }

          // Select formula (this will reset inputs to defaults and trigger graph generation)
          selectFormula(urlFormulaId);
          lastSyncedFormulaIdRef.current = urlFormulaId;

          // If we have decoded params, restore them immediately
          // This minimizes the time window where default values exist
          // Nodes will be updated via useNodeValueUpdates when they're generated
          if (decodedParams && Object.keys(decodedParams).length > 0) {
            // Use queueMicrotask to restore params in next microtask
            // This ensures selectFormula's state updates are applied first
            queueMicrotask(() => {
              setInputs(decodedParams as Record<string, unknown>);
              lastSyncedInputsRef.current = decodedParams as Record<
                string,
                unknown
              >;
              pendingParamsRestoreRef.current = null;

              // Reset sync flag after a brief delay
              setTimeout(() => {
                isSyncingFromUrlRef.current = false;
              }, 50);
            });
          } else {
            // No params, reset sync flag immediately
            setTimeout(() => {
              isSyncingFromUrlRef.current = false;
            }, 0);
          }
        } catch (error) {
          console.error("Failed to sync formula from URL:", error);
          pendingParamsRestoreRef.current = null;
          isSyncingFromUrlRef.current = false;
        }
      }
    } else if (
      !urlFormulaId &&
      selectedFormulaId &&
      !isInitialMountRef.current
    ) {
      // If URL has no ID but store has one, and it's not initial mount,
      // user navigated away - clear selection
      // Note: We don't clear here to avoid conflicts with navigation logic
    }

    // Mark initial mount as complete after first render
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
  }, [
    params.id,
    selectedFormulaId,
    selectFormula,
    formulaDefinitions,
    searchParams,
    setInputs,
    loading,
  ]);

  /**
   * This effect is no longer needed as we restore params immediately in the formula sync effect
   * Keeping it as a fallback in case queueMicrotask doesn't work as expected
   */
  useEffect(() => {
    // Fallback: If we still have pending params after nodes are generated, restore them
    if (
      pendingParamsRestoreRef.current &&
      graphNodes.length > 0 &&
      isSyncingFromUrlRef.current
    ) {
      const paramsToRestore = pendingParamsRestoreRef.current;

      setInputs(paramsToRestore);
      lastSyncedInputsRef.current = paramsToRestore;
      pendingParamsRestoreRef.current = null;

      setTimeout(() => {
        isSyncingFromUrlRef.current = false;
      }, 50);
    }
  }, [graphNodes.length, setInputs]);

  /**
   * Sync parameters from URL to store
   * This effect runs when URL search params change (e.g., user pastes a shared URL)
   * Note: This effect handles the case where only params change (not formula ID)
   * When both formula ID and params change, the formula sync effect handles it
   */
  useEffect(() => {
    // Skip if we're already syncing (e.g., formula sync effect is handling params)
    if (isSyncingFromUrlRef.current) {
      return;
    }

    const encodedParams = searchParams.get("params");
    const urlFormulaId = params.id;

    // Only sync params if:
    // 1. URL has params
    // 2. We're on a formula page (has formula ID)
    // 3. Formula is already selected (to ensure nodes exist)
    // 4. Nodes are already generated (graphNodes.length > 0)
    if (
      encodedParams &&
      urlFormulaId &&
      urlFormulaId === selectedFormulaId &&
      graphNodes.length > 0
    ) {
      const decoded = decodeParams(encodedParams);
      if (decoded && Object.keys(decoded).length > 0) {
        // Get latest currentInputs from store to ensure we have the most recent value
        const latestInputs = store.getState().currentInputs;
        // Only sync if inputs are different to avoid unnecessary updates
        const currentInputsStr = JSON.stringify(latestInputs);
        const decodedInputsStr = JSON.stringify(decoded);
        if (currentInputsStr !== decodedInputsStr) {
          isSyncingFromUrlRef.current = true;
          try {
            setInputs(decoded);
            lastSyncedInputsRef.current = decoded;
          } finally {
            setTimeout(() => {
              isSyncingFromUrlRef.current = false;
            }, 0);
          }
        }
      }
    } else if (!encodedParams && searchParams.has("params") === false) {
      // URL has no params - clear inputs if we're on a formula page
      // But only if this wasn't triggered by the formula sync effect
      if (urlFormulaId && urlFormulaId === selectedFormulaId) {
        const latestInputs = store.getState().currentInputs;
        if (Object.keys(latestInputs).length > 0) {
          // Don't clear here - let the user's current state persist
          // Only clear when explicitly navigating away
        }
      }
    }
  }, [
    searchParams,
    setInputs,
    store,
    params.id,
    selectedFormulaId,
    graphNodes.length,
  ]); // Include graphNodes.length to detect when nodes are ready

  /**
   * Sync current formula params to canvasStore when in multi mode
   * This ensures each formula's params are tracked separately
   */
  useEffect(() => {
    if (
      canvasMode === "multi" &&
      selectedFormulaId &&
      Object.keys(currentInputs).length > 0 &&
      !isSyncingFromUrlRef.current
    ) {
      // Update canvasStore with current formula's params
      setFormulaParams(selectedFormulaId, currentInputs);
    }
  }, [canvasMode, selectedFormulaId, currentInputs, setFormulaParams]);

  /**
   * Handle mode switching: migrate params between single and multi modes
   * When switching from single to multi mode, migrate current single formula params
   * When switching from multi to single mode, use first formula's params
   */
  useEffect(() => {
    if (isSyncingFromUrlRef.current || isInitialMountRef.current) {
      return;
    }

    // When switching from single to multi mode, migrate current params
    if (canvasMode === "multi" && selectedFormulaId) {
      const canvasStore = useCanvasStore.getState();
      // If formula is NOT yet on canvas, add it (this happens when switching from single to multi)
      if (!canvasStore.canvasFormulaIds.includes(selectedFormulaId)) {
        // Add the current formula to canvas in multi mode
        canvasStore.addFormulaToCanvas(selectedFormulaId);

        // Set params if we have any
        if (Object.keys(currentInputs).length > 0) {
          setFormulaParams(selectedFormulaId, currentInputs);
        }
      } else if (
        canvasStore.canvasFormulaIds.includes(selectedFormulaId) &&
        !canvasStore.formulaParams[selectedFormulaId]
      ) {
        // Formula is on canvas but doesn't have params yet, use currentInputs
        if (Object.keys(currentInputs).length > 0) {
          setFormulaParams(selectedFormulaId, currentInputs);
        }
      }
    }

    // When switching from multi to single mode, params are already handled in canvasStore.setMode
    // But we need to update URL to single formula format
    if (canvasMode === "single" && selectedFormulaId) {
      // Check if URL has formulas param (multi mode format)
      const hasFormulasParam = searchParams.has("formulas");
      if (hasFormulasParam) {
        // Clear formulas param and use single params format
        const currentParams = searchParams.get("params");
        if (currentParams) {
          // Keep the params param, just remove formulas
          setSearchParams({ params: currentParams }, { replace: true });
        } else {
          // No params, just remove formulas
          setSearchParams({}, { replace: true });
        }
      }
    }
  }, [
    canvasMode,
    selectedFormulaId,
    currentInputs,
    setFormulaParams,
    searchParams,
    setSearchParams,
    updateUrl,
  ]);

  /**
   * Sync formula ID and parameters to URL when they change
   * This effect runs when store state changes (e.g., user selects formula or changes inputs)
   */
  useEffect(() => {
    // Don't update URL if:
    // 1. We're currently syncing from URL (isSyncingFromUrlRef.current = true)
    // 2. This is the initial mount (isInitialMountRef.current = true)
    // 3. We have pending params to restore (pendingParamsRestoreRef.current is not null)
    //    - This prevents updating URL with default values while waiting for param restoration
    if (
      isSyncingFromUrlRef.current ||
      isInitialMountRef.current ||
      pendingParamsRestoreRef.current
    ) {
      // Skip URL update - we're syncing from URL or waiting for param restoration
      return;
    }

    // If formulas are still loading, or the URL has an id and selection doesn't match yet,
    // do not update the URL (avoid resetting shared link during initial data load)
    const urlId = params.id;
    if (loading) {
      return;
    }
    if (urlId && urlId !== selectedFormulaId && canvasMode === "single") {
      return;
    }

    // In multi mode, update URL when canvasFormulaIds or formulaParams change
    if (canvasMode === "multi") {
      // Use current formula params or get from canvasStore
      const paramsToUse =
        selectedFormulaId && formulaParams[selectedFormulaId]
          ? formulaParams[selectedFormulaId]
          : currentInputs;

      updateUrl(selectedFormulaId, paramsToUse);
      return;
    }

    // Single mode: existing logic
    // Additional check: only update if currentInputs actually differ from last synced
    // This prevents unnecessary updates when selectFormula sets default values
    const inputsStr = JSON.stringify(currentInputs);
    const lastSyncedStr = JSON.stringify(lastSyncedInputsRef.current);

    if (inputsStr !== lastSyncedStr) {
      // Extra safety: check if URL already has params that match what we're about to restore
      // This prevents overwriting URL params during the restoration process
      const currentUrlParams = searchParams.get("params");
      if (currentUrlParams) {
        const decodedUrlParams = decodeParams(currentUrlParams);
        if (decodedUrlParams) {
          const urlParamsStr = JSON.stringify(decodedUrlParams);
          // If current inputs match URL params, don't update
          // This handles the case where params are being restored
          if (urlParamsStr === inputsStr) {
            lastSyncedInputsRef.current = currentInputs;
            return;
          }
        }
      }

      updateUrl(selectedFormulaId, currentInputs);
      if (selectedFormulaId) {
        lastSyncedFormulaIdRef.current = selectedFormulaId;
      }
    }
  }, [
    selectedFormulaId,
    currentInputs,
    updateUrl,
    searchParams,
    params.id,
    loading,
    canvasMode,
    canvasFormulaIds,
    formulaParams,
  ]);

  /**
   * Return a function to manually trigger URL update
   * Useful for cases where we want to ensure URL is synced
   */
  return {
    updateUrl: () => {
      if (!isSyncingFromUrlRef.current) {
        updateUrl(selectedFormulaId, currentInputs);
      }
    },
  };
}
