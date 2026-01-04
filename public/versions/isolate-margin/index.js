'use strict';

var utils = require('@orderly.network/utils');
var types = require('@orderly.network/types');

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/version.ts
if (typeof window !== "undefined") {
  window.__ORDERLY_VERSION__ = window.__ORDERLY_VERSION__ || {};
  window.__ORDERLY_VERSION__["@orderly.network/perp"] = "4.8.10";
}
var version_default = "4.8.10";

// src/positions.ts
var positions_exports = {};
__export(positions_exports, {
  MMR: () => MMR,
  estOffsetForTP: () => estOffsetForTP,
  estPnLForSL: () => estPnLForSL,
  estPnLForTP: () => estPnLForTP,
  estPriceForTP: () => estPriceForTP,
  estPriceFromOffsetForTP: () => estPriceFromOffsetForTP,
  liqPrice: () => liqPrice,
  maintenanceMargin: () => maintenanceMargin,
  maxPositionLeverage: () => maxPositionLeverage,
  maxPositionNotional: () => maxPositionNotional,
  notional: () => notional,
  totalNotional: () => totalNotional,
  totalUnrealizedPnL: () => totalUnrealizedPnL,
  totalUnsettlementPnL: () => totalUnsettlementPnL,
  unrealizedPnL: () => unrealizedPnL,
  unrealizedPnLROI: () => unrealizedPnLROI,
  unsettlementPnL: () => unsettlementPnL
});

// src/constants.ts
var IMRFactorPower = 4 / 5;
var DMax = (...values) => {
  if (values.length === 0) {
    throw new Error("DMax requires at least one argument");
  }
  const decimals = values.map(
    (val) => val instanceof utils.Decimal ? val : new utils.Decimal(val)
  );
  let max = decimals[0];
  for (let i = 1; i < decimals.length; i++) {
    if (decimals[i].gte(max)) {
      max = decimals[i];
    }
  }
  return max;
};

// src/positions.ts
var MaxIterates = 30;
var CONVERGENCE_THRESHOLD = 1e-4;
function notional(qty, mark_price) {
  return new utils.Decimal(qty).mul(mark_price).abs().toNumber();
}
function totalNotional(positions) {
  return positions.reduce((acc, cur) => {
    return acc + notional(cur.position_qty, cur.mark_price);
  }, 0);
}
function unrealizedPnL(inputs) {
  return new utils.Decimal(inputs.qty).mul(inputs.markPrice - inputs.openPrice).toNumber();
}
function unrealizedPnLROI(inputs) {
  const { openPrice, IMR: IMR2 } = inputs;
  if (inputs.unrealizedPnL === 0 || inputs.positionQty === 0 || openPrice === 0 || IMR2 === 0)
    return 0;
  return new utils.Decimal(inputs.unrealizedPnL).div(new utils.Decimal(Math.abs(inputs.positionQty)).mul(openPrice).mul(IMR2)).toNumber();
}
function totalUnrealizedPnL(positions) {
  return positions.reduce((acc, cur) => {
    return acc + unrealizedPnL({
      qty: cur.position_qty,
      openPrice: cur.average_open_price,
      markPrice: cur.mark_price
    });
  }, 0);
}
var mmForOtherSymbols = (positions) => {
  return positions.reduce((acc, cur) => {
    return acc.add(
      new utils.Decimal(cur.position_qty).abs().mul(cur.mark_price).mul(cur.mmr)
    );
  }, utils.zero);
};
var calculateLiqPrice = (markPrice, positionQty, MMR3, totalCollateral2, positions) => {
  const decimalMarkPrice = new utils.Decimal(markPrice);
  const absQty = new utils.Decimal(positionQty).abs();
  const denominator = absQty.mul(MMR3).sub(positionQty);
  const liqPrice2 = new utils.Decimal(totalCollateral2).sub(absQty.mul(decimalMarkPrice).mul(MMR3)).sub(mmForOtherSymbols(positions)).div(denominator).add(decimalMarkPrice);
  return DMax(liqPrice2, utils.zero);
};
var compareCollateralWithMM = (inputs) => {
  return (price) => {
    const {
      totalCollateral: totalCollateral2,
      positionQty,
      markPrice,
      baseMMR,
      baseIMR,
      IMRFactor,
      positions
    } = inputs;
    const decimalPositionQty = new utils.Decimal(positionQty);
    const collateral = new utils.Decimal(totalCollateral2).sub(decimalPositionQty.mul(markPrice)).add(decimalPositionQty.mul(price));
    const mm = decimalPositionQty.abs().mul(price).mul(
      Math.max(
        baseMMR,
        new utils.Decimal(baseMMR).div(baseIMR).mul(IMRFactor).mul(decimalPositionQty.mul(price).abs().toPower(IMRFactorPower)).toNumber()
      )
    ).add(mmForOtherSymbols(positions));
    return collateral.gte(mm);
  };
};
var liqPrice = (inputs) => {
  const {
    positionQty,
    markPrice,
    totalCollateral: totalCollateral2,
    positions,
    MMR: MMR3,
    baseMMR,
    baseIMR,
    IMRFactor,
    symbol
  } = inputs;
  if (positionQty === 0 || totalCollateral2 === 0) {
    return null;
  }
  const isLONG = positionQty > 0;
  const otherPositions = positions.filter((item) => item.symbol !== symbol);
  if (isLONG) {
    let liqPriceLeft = calculateLiqPrice(
      markPrice,
      positionQty,
      baseMMR,
      totalCollateral2,
      otherPositions
    );
    let liqPriceRight = calculateLiqPrice(
      markPrice,
      positionQty,
      MMR3,
      totalCollateral2,
      otherPositions
    );
    const compareCollateralWithMMFunc = compareCollateralWithMM({
      totalCollateral: totalCollateral2,
      positionQty,
      markPrice,
      baseIMR,
      baseMMR,
      IMRFactor,
      positions: otherPositions
    });
    for (let i = 0; i < MaxIterates; i++) {
      if (liqPriceLeft.gte(liqPriceRight)) {
        return liqPriceRight.toNumber();
      }
      const mid = new utils.Decimal(liqPriceLeft).add(liqPriceRight).div(2);
      if (compareCollateralWithMMFunc(mid)) {
        liqPriceRight = mid;
      } else {
        liqPriceLeft = mid;
      }
      if (liqPriceRight.sub(liqPriceLeft).div(liqPriceLeft.add(liqPriceRight)).mul(2).lte(CONVERGENCE_THRESHOLD)) {
        break;
      }
    }
    return liqPriceRight.toNumber();
  } else {
    let liqPriceRight = calculateLiqPrice(
      markPrice,
      positionQty,
      MMR3,
      totalCollateral2,
      otherPositions
    );
    let liqPriceLeft = calculateLiqPrice(
      markPrice,
      positionQty,
      Math.max(
        baseIMR,
        new utils.Decimal(baseMMR).div(baseIMR).mul(IMRFactor).mul(
          new utils.Decimal(positionQty).mul(liqPriceRight).abs().toPower(IMRFactorPower)
        ).toNumber()
      ),
      totalCollateral2,
      otherPositions
    );
    const compareCollateralWithMMFunc = compareCollateralWithMM({
      totalCollateral: totalCollateral2,
      positionQty,
      markPrice,
      baseMMR,
      baseIMR,
      IMRFactor,
      positions: otherPositions
    });
    for (let i = 0; i < MaxIterates; i++) {
      if (liqPriceLeft.gte(liqPriceRight)) {
        return liqPriceLeft.toNumber();
      }
      const mid = liqPriceLeft.add(liqPriceRight).div(2);
      if (compareCollateralWithMMFunc(mid)) {
        liqPriceLeft = mid;
      } else {
        liqPriceRight = mid;
      }
      if (liqPriceRight.sub(liqPriceLeft).div(liqPriceLeft.add(liqPriceRight)).mul(2).lte(CONVERGENCE_THRESHOLD)) {
        break;
      }
    }
    return liqPriceLeft.toNumber();
  }
};
function maintenanceMargin(inputs) {
  const { positionQty, markPrice, MMR: MMR3 } = inputs;
  return new utils.Decimal(positionQty).mul(markPrice).mul(MMR3).abs().toNumber();
}
function unsettlementPnL(inputs) {
  const {
    positionQty,
    markPrice,
    costPosition,
    sumUnitaryFunding,
    lastSumUnitaryFunding
  } = inputs;
  const qty = new utils.Decimal(positionQty);
  return qty.mul(markPrice).sub(costPosition).sub(qty.mul(new utils.Decimal(sumUnitaryFunding).sub(lastSumUnitaryFunding))).toNumber();
}
function totalUnsettlementPnL(positions) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return 0;
  }
  return positions.reduce((acc, cur) => {
    return acc + unsettlementPnL({
      positionQty: cur.position_qty,
      markPrice: cur.mark_price,
      costPosition: cur.cost_position,
      sumUnitaryFunding: cur.sum_unitary_funding,
      lastSumUnitaryFunding: cur.last_sum_unitary_funding
    });
  }, 0);
}
function MMR(inputs) {
  const {
    baseMMR,
    baseIMR,
    IMRFactor,
    positionNotional,
    IMR_factor_power = IMRFactorPower
  } = inputs;
  return Math.max(
    baseMMR,
    new utils.Decimal(baseMMR).div(baseIMR).mul(IMRFactor).mul(Math.pow(Math.abs(positionNotional), IMR_factor_power)).toNumber()
  );
}
function estPnLForTP(inputs) {
  return new utils.Decimal(inputs.positionQty).mul(new utils.Decimal(inputs.price).sub(inputs.entryPrice)).toNumber();
}
function estPriceForTP(inputs) {
  return new utils.Decimal(inputs.pnl).div(inputs.positionQty).add(inputs.entryPrice).toNumber();
}
function estOffsetForTP(inputs) {
  return new utils.Decimal(inputs.price).div(inputs.entryPrice).toNumber();
}
function estPriceFromOffsetForTP(inputs) {
  return new utils.Decimal(inputs.offset).add(inputs.entryPrice).toNumber();
}
function estPnLForSL(inputs) {
  return 0;
}
function maxPositionNotional(inputs) {
  const { leverage, IMRFactor } = inputs;
  return new utils.Decimal(1).div(new utils.Decimal(leverage).mul(IMRFactor)).pow(1 / 0.8).toNumber();
}
function maxPositionLeverage(inputs) {
  const { IMRFactor, notional: notional2 } = inputs;
  return new utils.Decimal(1).div(new utils.Decimal(IMRFactor).mul(new utils.Decimal(notional2).pow(0.8))).toNumber();
}

// src/account.ts
var account_exports = {};
__export(account_exports, {
  IMR: () => IMR,
  LTV: () => LTV,
  MMR: () => MMR2,
  availableBalance: () => availableBalance,
  buyOrdersFilter_by_symbol: () => buyOrdersFilter_by_symbol,
  calcMinimumReceived: () => calcMinimumReceived,
  collateralContribution: () => collateralContribution,
  collateralRatio: () => collateralRatio,
  currentLeverage: () => currentLeverage,
  extractSymbols: () => extractSymbols,
  freeCollateral: () => freeCollateral,
  getPositonsAndOrdersNotionalBySymbol: () => getPositonsAndOrdersNotionalBySymbol,
  getQtyFromOrdersBySide: () => getQtyFromOrdersBySide,
  getQtyFromPositions: () => getQtyFromPositions,
  groupOrdersBySymbol: () => groupOrdersBySymbol,
  initialMarginWithOrder: () => initialMarginWithOrder,
  maxLeverage: () => maxLeverage,
  maxQty: () => maxQty,
  maxQtyByLong: () => maxQtyByLong,
  maxQtyByShort: () => maxQtyByShort,
  maxWithdrawalOtherCollateral: () => maxWithdrawalOtherCollateral,
  maxWithdrawalUSDC: () => maxWithdrawalUSDC,
  otherIMs: () => otherIMs,
  positionNotionalWithOrder_by_symbol: () => positionNotionalWithOrder_by_symbol,
  positionQtyWithOrders_by_symbol: () => positionQtyWithOrders_by_symbol,
  sellOrdersFilter_by_symbol: () => sellOrdersFilter_by_symbol,
  totalCollateral: () => totalCollateral,
  totalInitialMarginWithOrders: () => totalInitialMarginWithOrders,
  totalInitialMarginWithQty: () => totalInitialMarginWithQty,
  totalMarginRatio: () => totalMarginRatio,
  totalUnrealizedROI: () => totalUnrealizedROI,
  totalValue: () => totalValue
});
function totalValue(inputs) {
  const { totalUnsettlementPnL: totalUnsettlementPnL2, USDCHolding, nonUSDCHolding } = inputs;
  const nonUSDCHoldingValue = nonUSDCHolding.reduce((acc, cur) => {
    return new utils.Decimal(cur.holding).mul(cur.indexPrice).add(acc);
  }, utils.zero);
  return nonUSDCHoldingValue.add(USDCHolding).add(totalUnsettlementPnL2);
}
function freeCollateral(inputs) {
  const value = inputs.totalCollateral.sub(inputs.totalInitialMarginWithOrders);
  return value.isNegative() ? utils.zero : value;
}
function totalCollateral(inputs) {
  const { USDCHolding, nonUSDCHolding, unsettlementPnL: unsettlementPnL2 } = inputs;
  const nonUSDCHoldingValue = nonUSDCHolding.reduce((acc, cur) => {
    const finalHolding = Math.min(cur.holding, cur.collateralCap);
    const value = new utils.Decimal(finalHolding).mul(cur.collateralRatio).mul(cur.indexPrice);
    return acc.add(value);
  }, utils.zero);
  return new utils.Decimal(USDCHolding).add(nonUSDCHoldingValue).add(unsettlementPnL2);
}
function initialMarginWithOrder() {
}
function positionNotionalWithOrder_by_symbol(inputs) {
  return new utils.Decimal(inputs.markPrice).mul(inputs.positionQtyWithOrders);
}
function positionQtyWithOrders_by_symbol(inputs) {
  const { positionQty, buyOrdersQty, sellOrdersQty } = inputs;
  const positionQtyDecimal = new utils.Decimal(positionQty);
  const qty = Math.max(
    positionQtyDecimal.add(buyOrdersQty).abs().toNumber(),
    positionQtyDecimal.sub(sellOrdersQty).abs().toNumber()
  );
  return qty;
}
function IMR(inputs) {
  const {
    maxLeverage: maxLeverage2,
    baseIMR,
    IMR_Factor,
    positionNotional,
    ordersNotional: orderNotional,
    IMR_factor_power = IMRFactorPower
  } = inputs;
  return Math.max(
    1 / maxLeverage2,
    baseIMR,
    new utils.Decimal(IMR_Factor).mul(
      new utils.Decimal(positionNotional).add(orderNotional).abs().toPower(IMR_factor_power)
    ).toNumber()
  );
}
function buyOrdersFilter_by_symbol(orders, symbol) {
  return orders.filter(
    (item) => item.symbol === symbol && item.side === types.OrderSide.BUY
  );
}
function sellOrdersFilter_by_symbol(orders, symbol) {
  return orders.filter(
    (item) => item.symbol === symbol && item.side === types.OrderSide.SELL
  );
}
function getQtyFromPositions(positions, symbol) {
  if (!positions) {
    return 0;
  }
  const position = positions.find((item) => item.symbol === symbol);
  return (position == null ? void 0 : position.position_qty) || 0;
}
function getQtyFromOrdersBySide(orders, symbol, side) {
  const ordersBySide = side === types.OrderSide.SELL ? sellOrdersFilter_by_symbol(orders, symbol) : buyOrdersFilter_by_symbol(orders, symbol);
  return ordersBySide.reduce((acc, cur) => {
    return acc + cur.quantity;
  }, 0);
}
function getPositonsAndOrdersNotionalBySymbol(inputs) {
  const { positions, orders, symbol, markPrice } = inputs;
  const positionQty = getQtyFromPositions(positions, symbol);
  const buyOrdersQty = getQtyFromOrdersBySide(orders, symbol, types.OrderSide.BUY);
  const sellOrdersQty = getQtyFromOrdersBySide(orders, symbol, types.OrderSide.SELL);
  const markPriceDecimal = new utils.Decimal(markPrice);
  return markPriceDecimal.mul(positionQty).add(markPriceDecimal.mul(new utils.Decimal(buyOrdersQty).add(sellOrdersQty))).abs().toNumber();
}
function totalInitialMarginWithOrders(inputs) {
  const {
    positions,
    orders,
    markPrices,
    IMR_Factors,
    maxLeverage: maxLeverage2,
    symbolInfo
  } = inputs;
  const symbols = extractSymbols(positions, orders);
  const total_initial_margin_with_orders = symbols.reduce((acc, cur) => {
    const symbol = cur;
    const positionQty = getQtyFromPositions(positions, symbol);
    const buyOrdersQty = getQtyFromOrdersBySide(orders, symbol, types.OrderSide.BUY);
    const sellOrdersQty = getQtyFromOrdersBySide(
      orders,
      symbol,
      types.OrderSide.SELL
    );
    const markPrice = markPrices[symbol] || 0;
    const positionQtyWithOrders = positionQtyWithOrders_by_symbol({
      positionQty,
      buyOrdersQty,
      sellOrdersQty
    });
    const position_notional_with_orders = positionNotionalWithOrder_by_symbol({
      markPrice,
      positionQtyWithOrders
    });
    const markPriceDecimal = new utils.Decimal(markPrice);
    const imr = IMR({
      positionNotional: markPriceDecimal.mul(positionQty).toNumber(),
      ordersNotional: markPriceDecimal.mul(new utils.Decimal(buyOrdersQty).add(sellOrdersQty)).toNumber(),
      maxLeverage: maxLeverage2,
      IMR_Factor: IMR_Factors[symbol],
      baseIMR: symbolInfo[symbol]("base_imr", 0)
    });
    return position_notional_with_orders.mul(imr).add(acc).toNumber();
  }, 0);
  return total_initial_margin_with_orders;
}
function totalInitialMarginWithQty(inputs) {
  const { positions, markPrices, IMR_Factors, symbolInfo } = inputs;
  const symbols = positions.map((item) => item.symbol);
  const total_initial_margin_with_orders = symbols.reduce((acc, cur) => {
    var _a;
    const symbol = cur;
    const position = positions.find((item) => item.symbol === symbol);
    const positionQty = (position == null ? void 0 : position.position_qty) || 0;
    const buyOrdersQty = (position == null ? void 0 : position.pending_long_qty) || 0;
    const sellOrdersQty = (position == null ? void 0 : position.pending_short_qty) || 0;
    const markPrice = markPrices[symbol] || 0;
    const positionQtyWithOrders = positionQtyWithOrders_by_symbol({
      positionQty,
      buyOrdersQty,
      sellOrdersQty
    });
    const position_notional_with_orders = positionNotionalWithOrder_by_symbol({
      markPrice,
      positionQtyWithOrders
    });
    const markPriceDecimal = new utils.Decimal(markPrice);
    const imr = IMR({
      positionNotional: markPriceDecimal.mul(positionQty).toNumber(),
      ordersNotional: markPriceDecimal.mul(new utils.Decimal(buyOrdersQty).add(sellOrdersQty)).toNumber(),
      maxLeverage: maxLeverage({
        symbolLeverage: (_a = position == null ? void 0 : position.leverage) != null ? _a : inputs.maxLeverage,
        accountLeverage: inputs.maxLeverage
      }),
      IMR_Factor: IMR_Factors[symbol],
      baseIMR: symbolInfo[symbol]("base_imr", 0)
    });
    return position_notional_with_orders.mul(imr).add(acc).toNumber();
  }, 0);
  return total_initial_margin_with_orders;
}
function groupOrdersBySymbol(orders) {
  const symbols = {};
  orders.forEach((item) => {
    if (!symbols[item.symbol]) {
      symbols[item.symbol] = [];
    }
    symbols[item.symbol].push(item);
  });
  return symbols;
}
function extractSymbols(positions, orders) {
  const symbols = /* @__PURE__ */ new Set();
  positions.forEach((item) => {
    symbols.add(item.symbol);
  });
  orders.forEach((item) => {
    symbols.add(item.symbol);
  });
  return Array.from(symbols);
}
function otherIMs(inputs) {
  const {
    // orders,
    positions,
    IMR_Factors,
    symbolInfo,
    markPrices
  } = inputs;
  const symbols = positions.map((item) => item.symbol);
  return symbols.reduce((acc, cur) => {
    const symbol = cur;
    if (typeof markPrices[symbol] === "undefined") {
      console.warn("markPrices[%s] is undefined", symbol);
      return acc;
    }
    const markPriceDecimal = new utils.Decimal(markPrices[symbol] || 0);
    const position = positions.find((item) => item.symbol === symbol);
    const positionQty = getQtyFromPositions(positions, symbol);
    const positionNotional = markPriceDecimal.mul(positionQty).toNumber();
    const buyOrdersQty = position.pending_long_qty;
    const sellOrdersQty = position.pending_short_qty;
    const ordersNotional = markPriceDecimal.mul(new utils.Decimal(buyOrdersQty).add(sellOrdersQty)).toNumber();
    const IMR_Factor = IMR_Factors[symbol];
    if (typeof IMR_Factor === "undefined") {
      console.warn("IMR_Factor is not found:", symbol);
      return acc;
    }
    const imr = IMR({
      maxLeverage: maxLeverage({
        symbolLeverage: position.leverage,
        accountLeverage: inputs.maxLeverage
      }),
      IMR_Factor,
      baseIMR: symbolInfo[symbol]("base_imr", 0),
      positionNotional,
      ordersNotional
    });
    const positionQtyWithOrders = positionQtyWithOrders_by_symbol({
      positionQty,
      buyOrdersQty,
      sellOrdersQty
    });
    const positionNotionalWithOrders = positionNotionalWithOrder_by_symbol({
      markPrice: markPrices[symbol] || 0,
      positionQtyWithOrders
    });
    return acc.add(positionNotionalWithOrders.mul(imr));
  }, utils.zero).toNumber();
}
function maxQty(side, inputs, options) {
  if (side === types.OrderSide.BUY) {
    return maxQtyByLong(inputs);
  }
  return maxQtyByShort(inputs);
}
function maxQtyByLong(inputs, options) {
  try {
    const {
      baseMaxQty,
      totalCollateral: totalCollateral2,
      otherIMs: otherIMs2,
      maxLeverage: maxLeverage2,
      baseIMR,
      markPrice,
      IMR_Factor,
      positionQty,
      buyOrdersQty,
      takerFeeRate
    } = inputs;
    if (totalCollateral2 === 0) {
      return 0;
    }
    const totalCollateralDecimal = new utils.Decimal(totalCollateral2);
    const factor_1 = totalCollateralDecimal.sub(otherIMs2).div(
      new utils.Decimal(takerFeeRate).mul(2).mul(1e-4).add(Math.max(1 / maxLeverage2, baseIMR))
    ).div(markPrice).mul(0.995).sub(new utils.Decimal(positionQty).add(buyOrdersQty)).toNumber();
    if (positionQty === 0 && buyOrdersQty === 0) {
      return Math.min(baseMaxQty, factor_1);
    }
    if (IMR_Factor === 0) {
      return Math.min(baseMaxQty, factor_1);
    }
    const factor_2 = totalCollateralDecimal.sub(otherIMs2).div(IMR_Factor).toPower(1 / 1.8).div(markPrice).sub(
      new utils.Decimal(positionQty).add(buyOrdersQty)
      // .abs()
      // .div(new Decimal(takerFeeRate).mul(2).mul(0.0001).add(1))
    ).div(new utils.Decimal(takerFeeRate).mul(2).mul(1e-4).add(1)).mul(0.995).toNumber();
    return Math.min(baseMaxQty, factor_1, factor_2);
  } catch (error) {
    return 0;
  }
}
function maxQtyByShort(inputs, options) {
  try {
    const {
      baseMaxQty,
      totalCollateral: totalCollateral2,
      otherIMs: otherIMs2,
      maxLeverage: maxLeverage2,
      baseIMR,
      markPrice,
      IMR_Factor,
      positionQty,
      buyOrdersQty,
      sellOrdersQty,
      takerFeeRate
    } = inputs;
    const totalCollateralDecimal = new utils.Decimal(totalCollateral2);
    const factor_1 = totalCollateralDecimal.sub(otherIMs2).div(
      new utils.Decimal(takerFeeRate).mul(2).mul(1e-4).add(Math.max(1 / maxLeverage2, baseIMR))
    ).div(markPrice).mul(0.995).add(positionQty).sub(Math.abs(sellOrdersQty)).toNumber();
    if (positionQty === 0 && sellOrdersQty === 0) {
      return Math.min(baseMaxQty, factor_1);
    }
    if (IMR_Factor === 0) {
      return Math.min(baseMaxQty, factor_1);
    }
    const factor_2 = totalCollateralDecimal.sub(otherIMs2).div(IMR_Factor).toPower(1 / 1.8).div(markPrice).add(positionQty).sub(sellOrdersQty).div(new utils.Decimal(takerFeeRate).mul(2).mul(1e-4).add(1)).mul(0.995).toNumber();
    return Math.min(baseMaxQty, factor_1, factor_2);
  } catch (error) {
    return 0;
  }
}
function totalMarginRatio(inputs, dp) {
  const { totalCollateral: totalCollateral2, markPrices, positions } = inputs;
  if (totalCollateral2 === 0) {
    return 0;
  }
  const totalCollateralDecimal = new utils.Decimal(totalCollateral2);
  const totalPositionNotional = positions.reduce((acc, cur) => {
    const markPrice = markPrices[cur.symbol] || 0;
    return acc.add(new utils.Decimal(cur.position_qty).mul(markPrice).abs());
  }, utils.zero);
  if (totalPositionNotional.eq(utils.zero)) {
    return 0;
  }
  return totalCollateralDecimal.div(totalPositionNotional).toNumber();
}
function totalUnrealizedROI(inputs) {
  const { totalUnrealizedPnL: totalUnrealizedPnL2, totalValue: totalValue2 } = inputs;
  return new utils.Decimal(totalUnrealizedPnL2).div(totalValue2 - totalUnrealizedPnL2).toNumber();
}
function currentLeverage(totalMarginRatio2) {
  if (totalMarginRatio2 === 0) {
    return 0;
  }
  return 1 / totalMarginRatio2;
}
function availableBalance(inputs) {
  const { USDCHolding, unsettlementPnL: unsettlementPnL2 } = inputs;
  return new utils.Decimal(USDCHolding).add(unsettlementPnL2).toNumber();
}
function MMR2(inputs) {
  if (inputs.positionsNotional === 0) {
    return null;
  }
  if (inputs.positionsMMR === 0) {
    return null;
  }
  return new utils.Decimal(inputs.positionsMMR).div(inputs.positionsNotional).toNumber();
}
var collateralRatio = (params) => {
  const {
    baseWeight,
    discountFactor,
    collateralQty,
    collateralCap,
    indexPrice
  } = params;
  const cap = collateralCap === -1 ? collateralQty : collateralCap;
  const K = new utils.Decimal(1.2);
  const DCF = new utils.Decimal(discountFactor || 0);
  const qty = new utils.Decimal(Math.min(collateralQty, cap));
  const notionalAbs = qty.mul(indexPrice).abs();
  const dynamicWeight = DCF.mul(notionalAbs.toPower(IMRFactorPower));
  const result = K.div(new utils.Decimal(1).add(dynamicWeight));
  return result.lt(baseWeight) ? result : new utils.Decimal(baseWeight);
};
var collateralContribution = (params) => {
  const { collateralQty, collateralCap, collateralRatio: collateralRatio2, indexPrice } = params;
  const cap = collateralCap === -1 ? collateralQty : collateralCap;
  return new utils.Decimal(Math.min(collateralQty, cap)).mul(collateralRatio2).mul(indexPrice).toNumber();
};
var LTV = (params) => {
  const { usdcBalance, upnl, assets } = params;
  const usdcLoss = new utils.Decimal(Math.min(usdcBalance, 0)).abs();
  const upnlLoss = new utils.Decimal(Math.min(upnl, 0)).abs();
  const numerator = usdcLoss.add(upnlLoss);
  const collateralSum = assets.reduce((acc, asset) => {
    return acc.add(
      new utils.Decimal(Math.max(asset.qty, 0)).mul(new utils.Decimal(asset.indexPrice)).mul(new utils.Decimal(asset.weight))
    );
  }, utils.zero);
  const denominator = collateralSum.add(new utils.Decimal(Math.max(upnl, 0)));
  if (numerator.isZero() || denominator.isZero()) {
    return 0;
  }
  return numerator.div(denominator).toNumber();
};
var maxWithdrawalUSDC = (inputs) => {
  const { USDCBalance, freeCollateral: freeCollateral2, upnl } = inputs;
  const value = Math.min(
    new utils.Decimal(USDCBalance).toNumber(),
    new utils.Decimal(freeCollateral2).sub(Math.max(upnl, 0)).toNumber()
  );
  return Math.max(0, value);
};
var maxWithdrawalOtherCollateral = (inputs) => {
  const { USDCBalance, collateralQty, freeCollateral: freeCollateral2, indexPrice, weight } = inputs;
  const usdcBalance = new utils.Decimal(USDCBalance);
  const denominator = usdcBalance.isNegative() ? new utils.Decimal(indexPrice).mul(weight).mul(new utils.Decimal(1).add(2e-3)) : new utils.Decimal(indexPrice).mul(weight);
  if (denominator.isZero()) {
    return utils.zero;
  }
  const qty = new utils.Decimal(collateralQty);
  const maxQtyByValue = new utils.Decimal(freeCollateral2).div(denominator);
  return maxQtyByValue.lt(qty) ? maxQtyByValue : qty;
};
var calcMinimumReceived = (inputs) => {
  const { amount, slippage } = inputs;
  const slippageRatio = new utils.Decimal(slippage).div(100);
  return new utils.Decimal(amount).mul(new utils.Decimal(1).minus(slippageRatio)).toNumber();
};
var maxLeverage = (inputs) => {
  const { symbolLeverage, accountLeverage } = inputs;
  return symbolLeverage != null ? symbolLeverage : 1;
};

// src/order.ts
var order_exports = {};
__export(order_exports, {
  estLeverage: () => estLeverage,
  estLiqPrice: () => estLiqPrice,
  maxPrice: () => maxPrice,
  minPrice: () => minPrice,
  orderFee: () => orderFee,
  scopePrice: () => scopePrice,
  tpslROI: () => tpslROI
});
function maxPrice(markprice, range) {
  return markprice * (1 + range);
}
function minPrice(markprice, range) {
  return markprice * (1 - range);
}
function scopePrice(price, scope, side) {
  if (side === "BUY") {
    return price * (1 - scope);
  }
  return price * (1 + scope);
}
function orderFee(inputs) {
  return new utils.Decimal(inputs.qty).mul(inputs.price).mul(inputs.futuresTakeFeeRate).toNumber();
}
function estLiqPrice(inputs) {
  var _a;
  const {
    positions,
    newOrder,
    totalCollateral: totalCollateral2,
    markPrice,
    baseIMR,
    baseMMR,
    orderFee: orderFee2,
    IMR_Factor
  } = inputs;
  let currentPosition = void 0;
  let newTotalMM = utils.zero;
  const hasPosition = positions.filter((item) => item.position_qty > 0).length > 0;
  const basePrice = hasPosition ? markPrice : newOrder.price;
  const newOrderNotional = new utils.Decimal(newOrder.qty).mul(newOrder.price);
  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    let notional2 = new utils.Decimal(position.position_qty).mul(position.mark_price);
    if (newOrder.symbol === position.symbol) {
      currentPosition = position;
      notional2 = notional2.add(newOrderNotional);
    }
    newTotalMM = newTotalMM.add(notional2.abs().mul(position.mmr));
  }
  if (!currentPosition) {
    newTotalMM = newTotalMM.add(newOrderNotional.mul(baseMMR));
  }
  const newMMR = Math.max(
    baseMMR,
    new utils.Decimal(baseMMR).div(baseIMR).mul(IMR_Factor).mul(
      newOrderNotional.add(
        !!currentPosition ? new utils.Decimal(currentPosition.position_qty).mul(
          currentPosition.mark_price
        ) : utils.zero
      ).abs()
    ).toPower(4 / 5).toNumber()
  );
  const newQty = new utils.Decimal(newOrder.qty).add(
    (_a = currentPosition == null ? void 0 : currentPosition.position_qty) != null ? _a : 0
  );
  if (newQty.eq(0)) {
    return 0;
  }
  const denominator = newQty.abs().mul(newMMR).sub(newQty);
  if (denominator.eq(utils.zero)) {
    return 0;
  }
  const price = new utils.Decimal(basePrice).add(
    new utils.Decimal(totalCollateral2).sub(newTotalMM).sub(orderFee2).div(denominator)
  ).toNumber();
  return Math.max(0, price);
}
function estLeverage(inputs) {
  const { totalCollateral: totalCollateral2, positions, newOrder } = inputs;
  if (totalCollateral2 <= 0) {
    return null;
  }
  let hasPosition = false;
  let sumPositionNotional = positions.reduce((acc, cur) => {
    let count = new utils.Decimal(cur.position_qty).mul(cur.mark_price);
    if (cur.symbol === newOrder.symbol) {
      hasPosition = true;
      count = count.add(new utils.Decimal(newOrder.qty).mul(newOrder.price));
    }
    return acc.add(count.abs());
  }, utils.zero);
  if (!hasPosition) {
    sumPositionNotional = sumPositionNotional.add(
      new utils.Decimal(newOrder.qty).mul(newOrder.price).abs()
    );
  }
  if (sumPositionNotional.eq(utils.zero)) {
    return null;
  }
  const totalMarginRatio2 = new utils.Decimal(totalCollateral2).div(
    sumPositionNotional
  );
  return new utils.Decimal(1).div(totalMarginRatio2).toDecimalPlaces(2, utils.Decimal.ROUND_HALF_EVEN).toNumber();
}
function tpslROI(inputs) {
  const direction = utils.getTPSLDirection({
    side: inputs.side,
    type: inputs.type,
    closePrice: inputs.closePrice,
    orderPrice: inputs.orderPrice
  });
  const { closePrice, orderPrice, leverage } = inputs;
  return new utils.Decimal(closePrice).minus(orderPrice).div(orderPrice).mul(leverage).abs().mul(direction).toNumber();
}

exports.account = account_exports;
exports.order = order_exports;
exports.orderUtils = order_exports;
exports.positions = positions_exports;
exports.version = version_default;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map