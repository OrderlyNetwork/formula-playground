import type {
  SDKAdapter,
  FormulaExecutionResult,
} from "../../../types/executor";
import type { FormulaDefinition } from "../../../types/formula";
import { normalizePrecision } from "../../../lib/math";
import { TypeScriptRuntimeSandbox } from "../runtime-sandbox";
import { CacheManager } from "../cache-manager";

// Inline formula implementations for MVP
const calculateFundingFee = (
  positionSize: number,
  fundingRate: number
): number => {
  return positionSize * fundingRate;
};

const calculateLiquidationPrice = (
  entryPrice: number,
  leverage: number,
  isLong: boolean,
  maintenanceMarginRate: number = 0.005
): number => {
  const marginRate = 1 / leverage;
  if (isLong) {
    return entryPrice * (1 - marginRate + maintenanceMarginRate);
  } else {
    return entryPrice * (1 + marginRate - maintenanceMarginRate);
  }
};

const calculatePnL = (
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  isLong: boolean
): number => {
  if (isLong) {
    return (exitPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - exitPrice) * quantity;
  }
};

const calculateMarginRequirement = (
  positionValue: number,
  leverage: number
): number => {
  return positionValue / leverage;
};

const calculatePercentageChange = (
  oldValue: number,
  newValue: number
): number => {
  if (oldValue === 0) {
    return 0;
  }
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * TypeScript SDK Adapter - Executes formulas using TS implementations
 * Supports both hardcoded implementations and dynamic loading from jsDelivr
 */
export class TSAdapter implements SDKAdapter {
  id: "ts" = "ts";
  name = "TypeScript SDK";
  version = "1.0.0";

  private formulaMap: Map<string, Function>;
  private sandbox: TypeScriptRuntimeSandbox;
  private cacheManager: CacheManager;

  constructor() {
    this.formulaMap = new Map();
    this.cacheManager = new CacheManager();
    this.sandbox = new TypeScriptRuntimeSandbox(this.cacheManager);
    this.initializeFormulaMap();
  }

  /**
   * Initialize the formula ID to function mapping
   */
  private initializeFormulaMap() {
    // Map formula IDs to actual functions
    this.formulaMap.set("funding_fee", calculateFundingFee);
    this.formulaMap.set("liquidation_price", calculateLiquidationPrice);
    this.formulaMap.set("pnl_calculation", calculatePnL);
    this.formulaMap.set("margin_requirement", calculateMarginRequirement);
    this.formulaMap.set("percentage_change", calculatePercentageChange);
  }

  /**
   * Execute a formula with given inputs
   * Priority: jsDelivr (if enabled) -> hardcoded implementation -> error
   */
  async execute(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    const startTime = performance.now();

    try {
      let func: Function | undefined;

      // Priority 1: Try jsDelivr if configured and enabled
      if (formula.jsdelivrInfo?.enabled && formula.jsdelivrInfo.url) {
        try {
          func = await this.sandbox.loadFromJsDelivr(
            formula.jsdelivrInfo.url,
            formula.jsdelivrInfo.functionName,
            formula.id,
            formula.jsdelivrInfo.version
          );
        } catch (error) {
          console.warn(
            `Failed to load from jsDelivr, falling back to hardcoded:`,
            error
          );
          func = undefined;
        }
      }

      // Priority 2: Fallback to hardcoded implementation
      if (!func) {
        func = this.formulaMap.get(formula.id);
      }

      // No implementation found
      if (!func) {
        // Check if formula has localNpmInfo configured (suggest using local engine)
        const hasLocalNpm =
          formula.localNpmInfo?.enabled && formula.localNpmInfo.packageName;
        const errorMessage = hasLocalNpm
          ? `Formula ${formula.id} not found in TS engine. ` +
            `This formula has localNpmInfo configured - it should use the "local" engine instead. ` +
            `Please switch to the local engine or configure jsDelivr URL for TS engine.`
          : `Formula ${formula.id} not found. ` +
            `Please configure jsDelivr URL, localNpmInfo, or ensure hardcoded implementation exists.`;
        throw new Error(errorMessage);
      }

      // Convert inputs object to function arguments in the correct order
      const args = formula.inputs.map((input) => inputs[input.key]);

      // Execute the formula
      const result = func(...args);

      // Apply engine hints if present
      let finalResult = result;
      if (formula.engineHints?.ts) {
        const { rounding, scale } = formula.engineHints.ts;
        if (rounding && scale !== undefined) {
          finalResult = normalizePrecision(result, scale, rounding);
        }
      }

      const durationMs = performance.now() - startTime;

      return {
        success: true,
        outputs: { result: finalResult },
        durationMs,
        engine: "ts",
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        engine: "ts",
      };
    }
  }
}
