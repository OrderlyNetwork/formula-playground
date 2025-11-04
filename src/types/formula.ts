// Type definitions for Formula Playground
import type { Node, Edge } from "reactflow";
import type { NodeExecutionStatus } from "./runner";

export type FormulaInputType = "number" | "string" | "boolean" | "object";
export type RoundingStrategy = "floor" | "ceil" | "round" | "trunc";
export type FormulaScalar =
  | number
  | string
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null
  | {};

/**
 * @description Calculation factor type definition
 */
export interface FactorType {
  baseType: FormulaInputType;
  constraints?: {
    min?: number;
    max?: number;
    enum?: string[];
    pattern?: string; // Regular expression
  };
  nullable?: boolean;
  array?: boolean;
  // For object types: describe properties
  properties?: Array<{
    key: string;
    type: FormulaInputType;
    factorType: FactorType;
    unit?: string;
    default?: unknown;
    description?: string;
  }>;
}

/**
 * @description Formula creation type - tracks how the formula was created
 */
export type FormulaCreationType =
  | "parsed" // Created by parsing TypeScript code in developer mode
  | "imported" // Imported from GitHub or other external sources
  | "uploaded" // Uploaded from local files
  | "builtin" // Built-in formula definitions
  | "external"; // External formula without SDK implementation (placeholder)

/**
 * @description Formula definition parsed from SDK source code (via JSDoc)
 */
export interface FormulaDefinition {
  id: string; // Unique formula identifier, e.g., "funding_fee"
  name: string; // Display name, e.g., "Funding Fee Calculation"
  version: string; // SDK version or formula version, extracted from JSDoc @version
  description?: string; // Natural language description, from JSDoc @description
  formula?: string; // Original formula text, e.g., "Total Value = total_holding + total_unsettlement_PNL", extracted from JSDoc @formula
  tags?: string[]; // Tags for categorization or search, from JSDoc @tags (JSON array format)
  creationType?: FormulaCreationType; // How this formula was created
  engineHints?: {
    // Calculation hints for specific engines, from JSDoc @engineHint.xxx
    ts?: { rounding?: RoundingStrategy; scale?: number };
    rust?: { rounding?: RoundingStrategy; scale?: number };
    local?: { rounding?: RoundingStrategy; scale?: number };
  };
  inputs: Array<{
    key: string; // Parameter name
    type: FormulaInputType; // Base type
    factorType: FactorType; // Detailed calculation factor type information
    unit?: string; // Unit, extracted from JSDoc @param @unit
    default?: FormulaScalar; // Default value, extracted from JSDoc @param @default
    description?: string; // Parameter description, from JSDoc @param
  }>;
  outputs: Array<{
    key: string; // Output result name, default 'result'
    type: FormulaInputType; // Base type
    factorType: FactorType; // Detailed output factor type information
    unit?: string; // Unit, extracted from JSDoc @returns @unit
    description?: string; // Description, from JSDoc @returns
  }>;
  formulaText?: string; // Original formula function body code as string
  sourceCode?: string; // Complete original formula function source code as string (for display)

  // GitHub source info (for display and visualization)
  githubInfo?: {
    owner: string;
    repo: string;
    ref: string; // branch/tag/commit
    path: string;
    url: string; // full GitHub URL
  };

  // Local file upload info
  localInfo?: {
    fileName: string; // Original file name
    fileSize: number; // File size in bytes
    lastModified: Date; // File last modified timestamp
    uploadTimestamp: Date; // When the file was uploaded
  };

  // jsDelivr execution info (separate from source)
  jsdelivrInfo?: {
    url: string; // e.g., "https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/dist/formulas.js"
    functionName: string; // e.g., "calculateFundingFee"
    version: string; // e.g., "v1.0.0"
    enabled: boolean; // whether to use jsdelivr or fallback to hardcoded
  };

  // Local npm package execution info
  localNpmInfo?: {
    packageName: string; // e.g., "@orderly.network/utils"
    functionName: string; // Exported function name
    importPath?: string; // Optional subpath, e.g., "/dist/utils" (without .js)
    enabled: boolean; // Whether to use local npm or fallback
  };

  examples?: Array<{
    inputs: Record<string, FormulaScalar>;
    outputs: Record<string, FormulaScalar>;
  }>; // Example use cases
}

/**
 * @description Compiled formula stored in IndexedDB cache for jsDelivr executables
 */
export interface CompiledFormula {
  id: string; // unique: `${formulaId}:${version}`
  formulaId: string;
  version: string;
  jsdelivrUrl: string; // Source URL for this compiled version
  compiledCode: string; // Cached compiled function code
  functionName: string;
  timestamp: number;
  hash: string; // Integrity hash
}

/**
 * @description Shared code entry for storing jsDelivr code once and referenced by multiple formulas
 */
export interface SharedCodeEntry {
  id: string; // unique: `shared:${base64url}:${version}`
  url: string; // jsDelivr URL
  version: string;
  code: string; // Complete source code
  timestamp: number;
  hash: string; // Integrity hash
}

/**
 * @description Formula reference to shared code (lightweight storage)
 */
export interface FormulaReference {
  id: string; // unique: `${formulaId}:${version}`
  formulaId: string;
  version: string;
  jsdelivrUrl: string;
  functionName: string;
  sharedCodeId: string; // Reference to SharedCodeEntry
  timestamp: number;
}

/**
 * @description React Flow node data
 */
export interface FormulaNodeData {
  id: string; // Corresponding formula ID or parameter/output KEY
  type:
    | "formula"
    | "input"
    | "output"
    | "operator"
    | "object"
    | "array"
    | "api"
    | "websocket"; // Node type
  label: string; // Node display text
  value?: FormulaScalar; // Runtime parameter or result value
  unit?: string; // Unit
  description?: string; // Description
  isError?: boolean; // Whether there is an error
  diff?: number; // Difference with another engine (e.g., absolute error)
  // More custom data...
  // For formula nodes: the accepted input parameter definitions (to render per-parameter handles)
  inputs?: FormulaDefinition["inputs"];
  // For input nodes: the base input type to drive inline editors
  inputType?: FormulaInputType;
  // Factor type for rendering hints
  factorType?: FactorType;
  // For API nodes: API request configuration
  apiConfig?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    responseFields?: string[]; // Parsed response field paths (e.g., ["data", "data.user", "data.user.name"])
    requestParams?: unknown; // Request parameters for APIs that need input
  };
  // For WebSocket nodes: WebSocket connection configuration
  wsConfig?: {
    url?: string;
    status?: "disconnected" | "connecting" | "connected" | "error";
    protocols?: string[];
    topic?: string; // WebSocket subscription topic
  };
  // For formula nodes: execution state and runner control
  executionState?: {
    status: NodeExecutionStatus;
    isAutoRunning: boolean;
    lastExecutionTime?: number;
    lastResult?: any;
    errorMessage?: string;
  };
}

/**
 * @description Type-safe React Flow node type
 */
export type FormulaNode = Node<FormulaNodeData>;

/**
 * @description Type-safe React Flow edge type
 */
export type FormulaEdge = Edge;
