import { useAppStore } from "./appStore";
import { useFormulaStore } from "./formulaStore";
import { useDeveloperStore } from "./developerStore";
import { useMemo } from "react";

/**
 * Custom hook to get current mode data efficiently
 * Reduces re-renders by memoizing mode-specific data selection
 */
export function useModeData() {
  const { mode } = useAppStore();
  const normalModeData = useFormulaStore();
  const developerModeData = useDeveloperStore();

  return useMemo(() => {
    const isDeveloper = mode === "development";

    return {
      formulaDefinitions: isDeveloper
        ? developerModeData.parsedFormulas
        : normalModeData.formulaDefinitions,
      selectedFormulaId: isDeveloper
        ? developerModeData.selectedFormulaId
        : normalModeData.selectedFormulaId,
      currentInputs: isDeveloper
        ? developerModeData.currentInputs
        : normalModeData.currentInputs,
      tsResult: isDeveloper
        ? developerModeData.tsResult
        : normalModeData.tsResult,
      switchEngine: isDeveloper
        ? developerModeData.switchEngine
        : normalModeData.switchEngine,
      activeEngine: isDeveloper
        ? developerModeData.activeEngine
        : normalModeData.activeEngine,
    };
  }, [
    mode,
    normalModeData.formulaDefinitions,
    normalModeData.selectedFormulaId,
    normalModeData.currentInputs,
    normalModeData.tsResult,
    normalModeData.switchEngine,
    normalModeData.activeEngine,
    developerModeData.parsedFormulas,
    developerModeData.selectedFormulaId,
    developerModeData.currentInputs,
    developerModeData.tsResult,
    developerModeData.switchEngine,
    developerModeData.activeEngine,
  ]);
}