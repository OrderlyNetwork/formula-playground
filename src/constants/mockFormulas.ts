import type { FormulaDefinition } from "../types/formula";

/**
 * Pre-parsed formula definitions for MVP
 * In production, these would be parsed from SDK source code
 */
export const mockFormulas: FormulaDefinition[] = [
  {
    id: "funding_fee",
    name: "Funding Fee Calculation",
    version: "1.2.0",
    description:
      "Calculates the funding fee for a perpetual contract position based on its size and the current funding rate.",
    tags: ["perpetual", "fee", "financial"],
    engineHints: {
      ts: { rounding: "round", scale: 8 },
      rust: { rounding: "trunc", scale: 7 },
    },
    inputs: [
      {
        key: "positionSize",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        default: 1000,
        description: "The size of the position (e.g., in USD).",
      },
      {
        key: "fundingRate",
        type: "number",
        factorType: { baseType: "number" },
        unit: "%",
        default: 0.0001,
        description: "The current funding rate (e.g., 0.0001 for 0.01%).",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        description: "The calculated funding fee.",
      },
    ],
  },
  {
    id: "est_liq_price",
    name: "Estimated Liquidation Price",
    version: "1.0.0",
    description: "Estimate liquidation price based on inputs object.",
    tags: ["risk", "liquidation", "object-param"],
    engineHints: {
      ts: { rounding: "round", scale: 6 },
    },
    inputs: [
      {
        key: "inputs",
        type: "object",
        factorType: {
          baseType: "object",
          properties: [
            {
              key: "totalCollateral",
              type: "number",
              factorType: { baseType: "number" },
              default: 10000,
              description: "Total collateral amount",
            },
            {
              key: "markPrice",
              type: "number",
              factorType: { baseType: "number" },
              default: 50000,
              description: "Current mark price",
            },
            {
              key: "baseMMR",
              type: "number",
              factorType: { baseType: "number" },
              default: 0.005,
              description: "Base maintenance margin rate",
            },
            {
              key: "baseIMR",
              type: "number",
              factorType: { baseType: "number" },
              default: 0.1,
              description: "Base initial margin rate",
            },
            {
              key: "IMR_Factor",
              type: "number",
              factorType: { baseType: "number" },
              default: 1,
              description: "Initial margin factor",
            },
            {
              key: "orderFee",
              type: "number",
              factorType: { baseType: "number" },
              default: 0,
              description: "Order fee",
            },
            {
              key: "positions",
              type: "object",
              factorType: {
                baseType: "object",
                array: true,
                properties: [
                  {
                    key: "position_qty",
                    type: "number",
                    factorType: { baseType: "number" },
                    default: 0,
                  },
                  {
                    key: "mark_price",
                    type: "number",
                    factorType: { baseType: "number" },
                    default: 0,
                  },
                  {
                    key: "symbol",
                    type: "string",
                    factorType: { baseType: "string" },
                    default: "BTCUSDT",
                  },
                  {
                    key: "mmr",
                    type: "number",
                    factorType: { baseType: "number" },
                    default: 0.005,
                  },
                ],
              },
              description: "Positions array (JSON)",
            },
            {
              key: "newOrder",
              type: "object",
              factorType: {
                baseType: "object",
                properties: [
                  {
                    key: "symbol",
                    type: "string",
                    factorType: { baseType: "string" },
                    default: "BTCUSDT",
                  },
                  {
                    key: "qty",
                    type: "number",
                    factorType: { baseType: "number" },
                    default: 1,
                  },
                  {
                    key: "price",
                    type: "number",
                    factorType: { baseType: "number" },
                    default: 50000,
                  },
                ],
              },
              description: "New order object (JSON)",
            },
          ],
        },
        description: "Inputs object per estLiqPrice signature",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        description: "Estimated liquidation price",
      },
    ],
  },
  {
    id: "liquidation_price",
    name: "Liquidation Price Calculation",
    version: "1.0.0",
    description: "Calculates the liquidation price for a leveraged position.",
    tags: ["perpetual", "risk", "liquidation"],
    engineHints: {
      ts: { rounding: "round", scale: 6 },
    },
    inputs: [
      {
        key: "entryPrice",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        default: 50000,
        description: "The entry price of the position.",
      },
      {
        key: "leverage",
        type: "number",
        factorType: { baseType: "number" },
        unit: "x",
        default: 10,
        description: "The leverage multiplier.",
      },
      {
        key: "isLong",
        type: "boolean",
        factorType: { baseType: "boolean" },
        default: true,
        description: "Whether this is a long position.",
      },
      {
        key: "maintenanceMarginRate",
        type: "number",
        factorType: { baseType: "number" },
        unit: "%",
        default: 0.005,
        description: "The maintenance margin rate.",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        description: "The calculated liquidation price.",
      },
    ],
  },
  {
    id: "pnl_calculation",
    name: "Profit and Loss Calculation",
    version: "1.1.0",
    description: "Calculates the profit or loss for a trading position.",
    tags: ["trading", "pnl", "financial"],
    engineHints: {
      ts: { rounding: "round", scale: 8 },
    },
    inputs: [
      {
        key: "entryPrice",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        default: 50000,
        description: "The entry price of the position.",
      },
      {
        key: "exitPrice",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        default: 51000,
        description: "The exit price of the position.",
      },
      {
        key: "quantity",
        type: "number",
        factorType: { baseType: "number" },
        unit: "contracts",
        default: 1,
        description: "The quantity/size of the position.",
      },
      {
        key: "isLong",
        type: "boolean",
        factorType: { baseType: "boolean" },
        default: true,
        description: "Whether this is a long position.",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        description: "The calculated profit or loss.",
      },
    ],
  },
  {
    id: "margin_requirement",
    name: "Margin Requirement Calculation",
    version: "1.0.0",
    description: "Calculates the margin requirement for opening a position.",
    tags: ["margin", "risk", "trading"],
    engineHints: {
      ts: { rounding: "ceil", scale: 8 },
    },
    inputs: [
      {
        key: "positionValue",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        default: 10000,
        description: "The total value of the position.",
      },
      {
        key: "leverage",
        type: "number",
        factorType: { baseType: "number" },
        unit: "x",
        default: 10,
        description: "The leverage multiplier.",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        description: "The required margin amount.",
      },
    ],
  },
  {
    id: "percentage_change",
    name: "Percentage Change",
    version: "1.0.0",
    description: "Calculates the percentage change between two values.",
    tags: ["utility", "percentage"],
    engineHints: {
      ts: { rounding: "round", scale: 4 },
    },
    inputs: [
      {
        key: "oldValue",
        type: "number",
        factorType: { baseType: "number" },
        default: 100,
        description: "The original value.",
      },
      {
        key: "newValue",
        type: "number",
        factorType: { baseType: "number" },
        default: 110,
        description: "The new value.",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "%",
        description: "The percentage change.",
      },
    ],
  },
  {
    id: "order_fee",
    name: "Order Fee",
    version: "1.0.0",
    description: "Calculate order fee from an object payload.",
    tags: ["order", "fee"],
    engineHints: {
      ts: { rounding: "round", scale: 8 },
    },
    inputs: [
      {
        key: "order",
        type: "object",
        factorType: {
          baseType: "object",
          properties: [
            {
              key: "price",
              type: "number",
              factorType: { baseType: "number" },
              unit: "USD",
              default: 100,
              description: "Order price",
            },
            {
              key: "qty",
              type: "number",
              factorType: { baseType: "number" },
              default: 1,
              description: "Order quantity",
            },
            {
              key: "isMaker",
              type: "boolean",
              factorType: { baseType: "boolean" },
              default: true,
              description: "Is maker order",
            },
          ],
        },
        description: "Order payload",
      },
    ],
    outputs: [
      {
        key: "result",
        type: "number",
        factorType: { baseType: "number" },
        unit: "USD",
        description: "Calculated order fee.",
      },
    ],
  },
];
