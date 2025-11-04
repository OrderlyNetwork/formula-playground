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
 * Extract formula ID to function name mappings from JSDoc annotations in source code
 * This automatically builds the mapping instead of requiring hard-coded values
 */
function extractFormulaMappings(sourceCode: string): Record<string, string> {
  const mappings: Record<string, string> = {};

  // Regex to match JSDoc with @formulaId and the following export function
  // This pattern captures the formula ID from @formulaId and the function name from export function
  const formulaRegex = /\/\*\*[\s\S]*?\*\s*@formulaId\s+([a-zA-Z0-9_-]+)[\s\S]*?\*\/[\s\S]*?export\s+function\s+([a-zA-Z0-9_]+)/g;

  let match;
  while ((match = formulaRegex.exec(sourceCode)) !== null) {
    const [, formulaId, functionName] = match;
    mappings[formulaId] = functionName;

    console.debug(`Auto-mapped formula: ${formulaId} → ${functionName}`);
  }

  return mappings;
}

/**
 * Convert formula ID to function name using naming conventions
 * Fallback when no JSDoc mapping is found
 */
function idToFunctionName(formulaId: string): string {
  return 'calculate' + formulaId
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// Auto-generated mappings cache - populated from JSDoc annotations
let cachedMappings: Record<string, string> | null = null;

/**
 * Get function name for a formula ID using automatic resolution
 * Priority: JSDoc extraction > naming convention
 */
function getFunctionNameForFormula(formulaId: string): string {
  // Initialize mappings cache if not already done
  if (!cachedMappings) {
    cachedMappings = extractFormulaMappings(sdkSourceRaw);
    console.info(`Auto-extracted ${Object.keys(cachedMappings).length} formula mappings from SDK JSDoc`);
  }

  // First try to find mapping from JSDoc
  if (cachedMappings[formulaId]) {
    return cachedMappings[formulaId];
  }

  // Fallback to naming convention
  const conventionalName = idToFunctionName(formulaId);
  console.debug(`Using conventional naming for formula: ${formulaId} → ${conventionalName}`);
  return conventionalName;
}

/**
 * Enrich formula definitions with source code
 * Also sets creationType to "builtin" for formulas loaded from SDK mock
 */
export function enrichFormulasWithSource(
  formulas: FormulaDefinition[]
): FormulaDefinition[] {
  return formulas.map((formula) => {
    const functionName = getFunctionNameForFormula(formula.id);

    const sourceCode = extractFunctionSource(sdkSourceRaw, functionName);
    const formulaText = extractFunctionBody(sdkSourceRaw, functionName);

    // If no source code found, it means the function doesn't exist in the SDK yet
    // Provide a placeholder implementation
    if (!sourceCode || !formulaText) {
      const placeholderSource = generatePlaceholderSource(formula, functionName);
      return {
        ...formula,
        sourceCode: placeholderSource,
        formulaText: placeholderSource,
        creationType: formula.creationType ?? "external", // Mark as external since it's not in SDK
      };
    }

    return {
      ...formula,
      sourceCode,
      formulaText,
      // Set creationType to "builtin" if not already set
      creationType: formula.creationType ?? "builtin",
    };
  });
}

/**
 * Generate placeholder source code for formulas not yet implemented in SDK
 */
function generatePlaceholderSource(formula: FormulaDefinition, functionName: string): string {
  const inputs = Object.entries(formula.inputTypes || {})
    .map(([name, type]) => {
      const defaultValue = type === 'number' ? '0' : type === 'boolean' ? 'false' : '""';
      return `  ${name}: ${type} = ${defaultValue}`;
    })
    .join(',\n');

  const returnType = formula.outputType || 'number';

  return `/**
 * Placeholder implementation for ${formula.name || formula.id}
 * TODO: Implement actual formula logic in SDK
 */
export function ${functionName}(
${inputs}
): ${returnType} {
  // TODO: Implement actual formula logic
  console.warn('Using placeholder implementation for ${formula.id}');
  return ${returnType === 'number' ? '0' : returnType === 'boolean' ? 'false' : '""'};
}`;
}

/**
 * Get source code for a specific formula
 */
export function getFormulaSource(formulaId: string): {
  sourceCode?: string;
  formulaText?: string;
} {
  const functionName = getFunctionNameForFormula(formulaId);

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

/**
 * Get all auto-extracted formula mappings (for debugging)
 */
export function getExtractedFormulaMappings(): Record<string, string> {
  if (!cachedMappings) {
    cachedMappings = extractFormulaMappings(sdkSourceRaw);
  }
  return { ...cachedMappings };
}

/**
 * Clear the mappings cache (useful for testing or dynamic reloading)
 */
export function clearFormulaMappingsCache(): void {
  cachedMappings = null;
}
