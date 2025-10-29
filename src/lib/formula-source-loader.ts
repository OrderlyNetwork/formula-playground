/**
 * Formula Source Loader
 * Loads formula source code and enriches formula definitions
 */

import type { FormulaDefinition } from "../types/formula";

// Import SDK source code as raw text
import sdkSourceRaw from "../../sdk-mock/ts/formulas.ts?raw";

/**
 * Extract individual function source code from SDK file
 */
function extractFunctionSource(
  fullSource: string,
  functionName: string
): string | undefined {
  // Match the entire function including JSDoc
  const jsdocAndFunctionRegex = new RegExp(
    `/\\*\\*[\\s\\S]*?\\*/\\s*export\\s+function\\s+${functionName}\\s*\\([\\s\\S]*?\\n\\}`,
    "m"
  );

  const match = fullSource.match(jsdocAndFunctionRegex);
  return match?.[0];
}

/**
 * Extract only function body (without JSDoc)
 */
function extractFunctionBody(
  fullSource: string,
  functionName: string
): string | undefined {
  const functionRegex = new RegExp(
    `export\\s+function\\s+${functionName}\\s*\\([\\s\\S]*?\\n\\}`,
    "m"
  );

  const match = fullSource.match(functionRegex);
  return match?.[0];
}

/**
 * Map formula IDs to their function names in the SDK
 */
const formulaIdToFunctionName: Record<string, string> = {
  funding_fee: "calculateFundingFee",
  liquidation_price: "calculateLiquidationPrice",
  pnl_calculation: "calculatePnL",
  margin_requirement: "calculateMarginRequirement",
  percentage_change: "calculatePercentageChange",
  est_liq_price: "estLiqPrice", // If you add this function
  order_fee: "calculateOrderFee", // If you add this function
};

/**
 * Enrich formula definitions with source code
 */
export function enrichFormulasWithSource(
  formulas: FormulaDefinition[]
): FormulaDefinition[] {
  return formulas.map((formula) => {
    const functionName = formulaIdToFunctionName[formula.id];

    if (!functionName) {
      console.warn(`No function mapping found for formula: ${formula.id}`);
      return formula;
    }

    const sourceCode = extractFunctionSource(sdkSourceRaw, functionName);
    const formulaText = extractFunctionBody(sdkSourceRaw, functionName);

    return {
      ...formula,
      sourceCode,
      formulaText,
    };
  });
}

/**
 * Get source code for a specific formula
 */
export function getFormulaSource(formulaId: string): {
  sourceCode?: string;
  formulaText?: string;
} {
  const functionName = formulaIdToFunctionName[formulaId];

  if (!functionName) {
    return {};
  }

  return {
    sourceCode: extractFunctionSource(sdkSourceRaw, functionName),
    formulaText: extractFunctionBody(sdkSourceRaw, functionName),
  };
}

/**
 * Get the full SDK source code
 */
export function getFullSDKSource(): string {
  return sdkSourceRaw;
}
