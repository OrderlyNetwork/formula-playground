/**
 * Mock SDK - TypeScript Formula Implementations
 *
 * These formulas demonstrate the Formula Playground's capabilities
 * with proper JSDoc annotations for automatic parsing.
 */

/**
 * @formulaId funding_fee
 * @name Funding Fee Calculation
 * @description Calculates the funding fee for a perpetual contract position based on its size and the current funding rate.
 * @tags ["perpetual", "fee", "financial"]
 * @version 1.2.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 8
 * @engineHint.rust.rounding trunc
 * @engineHint.rust.scale 7
 *
 * @param {number} positionSize - The size of the position (e.g., in USD). @unit USD @default 1000
 * @param {number} fundingRate - The current funding rate (e.g., 0.0001 for 0.01%). @unit % @default 0.0001
 * @returns {number} The calculated funding fee. @unit USD
 */
export function calculateFundingFee(
  positionSize: number,
  fundingRate: number
): number {
  return positionSize * fundingRate;
}

/**
 * @formulaId liquidation_price
 * @name Liquidation Price Calculation
 * @description Calculates the liquidation price for a leveraged position.
 * @tags ["perpetual", "risk", "liquidation"]
 * @version 1.0.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 6
 *
 * @param {number} entryPrice - The entry price of the position. @unit USD @default 50000
 * @param {number} leverage - The leverage multiplier. @unit x @default 10
 * @param {boolean} isLong - Whether this is a long position. @default true
 * @param {number} maintenanceMarginRate - The maintenance margin rate. @unit % @default 0.005
 * @returns {number} The calculated liquidation price. @unit USD
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  isLong: boolean,
  maintenanceMarginRate: number = 0.005
): number {
  const marginRate = 1 / leverage;

  if (isLong) {
    // Long position liquidation price
    return entryPrice * (1 - marginRate + maintenanceMarginRate);
  } else {
    // Short position liquidation price
    return entryPrice * (1 + marginRate - maintenanceMarginRate);
  }
}

/**
 * @formulaId pnl_calculation
 * @name Profit and Loss Calculation
 * @description Calculates the profit or loss for a trading position.
 * @tags ["trading", "pnl", "financial"]
 * @version 1.1.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 8
 *
 * @param {number} entryPrice - The entry price of the position. @unit USD @default 50000
 * @param {number} exitPrice - The exit price of the position. @unit USD @default 51000
 * @param {number} quantity - The quantity/size of the position. @unit contracts @default 1
 * @param {boolean} isLong - Whether this is a long position. @default true
 * @returns {number} The calculated profit or loss. @unit USD
 */
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  isLong: boolean
): number {
  if (isLong) {
    return (exitPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - exitPrice) * quantity;
  }
}

/**
 * @formulaId margin_requirement
 * @name Margin Requirement Calculation
 * @description Calculates the margin requirement for opening a position.
 * @tags ["margin", "risk", "trading"]
 * @version 1.0.0
 * @engineHint.ts.rounding ceil
 * @engineHint.ts.scale 8
 *
 * @param {number} positionValue - The total value of the position. @unit USD @default 10000
 * @param {number} leverage - The leverage multiplier. @unit x @default 10
 * @returns {number} The required margin amount. @unit USD
 */
export function calculateMarginRequirement(
  positionValue: number,
  leverage: number
): number {
  return positionValue / leverage;
}

/**
 * @formulaId percentage_change
 * @name Percentage Change
 * @description Calculates the percentage change between two values.
 * @tags ["utility", "percentage"]
 * @version 1.0.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 4
 *
 * @param {number} oldValue - The original value. @default 100
 * @param {number} newValue - The new value. @default 110
 * @returns {number} The percentage change. @unit %
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) {
    return 0;
  }
  return ((newValue - oldValue) / oldValue) * 100;
}
