/**
 * Input Updater Hook
 * 
 * Centralizes the logic for choosing between updateInput and updateInputAt
 * based on whether the input ID contains a dot (indicating nested path)
 */

import { useMemo } from "react";
import { useFormulaStore } from "@/store/formulaStore";

/**
 * Hook that returns the appropriate update function based on input ID
 * 
 * @param inputId - The input identifier (may contain dots for nested paths)
 * @returns The appropriate update function (updateInput or updateInputAt)
 * 
 * @example
 * const updateFn = useInputUpdater("user.name");
 * updateFn("user.name", "John"); // Uses updateInputAt
 * 
 * const updateFn2 = useInputUpdater("username");
 * updateFn2("username", "john"); // Uses updateInput
 */
export function useInputUpdater(inputId: string) {
  const { updateInput, updateInputAt } = useFormulaStore();
  
  return useMemo(
    () => {
      // If inputId contains a dot, it's a nested path, use updateInputAt
      // Otherwise, use updateInput
      return inputId.includes(".") ? updateInputAt : updateInput;
    },
    [inputId, updateInput, updateInputAt]
  );
}





