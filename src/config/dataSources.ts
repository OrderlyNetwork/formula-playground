/**
 * Data source configurations for API and WebSocket endpoints
 */

/**
 * RESTful API data sources
 */
export const apiDataSources = [
  {
    id: "tokens",
    label: "Tokens",
    description: "Get all available trading tokens",
    method: "GET",
    url: "/v1/public/tokens",
  },
  {
    id: "symbols",
    label: "Symbols",
    description: "Get all trading symbols/pairs",
    method: "GET",
    url: "/v1/public/symbols",
  },
  {
    id: "orderbook",
    label: "Orderbook",
    description: "Get orderbook depth data",
    method: "GET",
    url: "/v1/orderbook/:symbol",
  },
  {
    id: "kline",
    label: "K-Line",
    description: "Get candlestick/kline data",
    method: "GET",
    url: "/v1/kline",
  },
  {
    id: "trades",
    label: "Recent Trades",
    description: "Get recent trades history",
    method: "GET",
    url: "/v1/public/trades/:symbol",
  },
] as const;

/**
 * WebSocket data sources
 */
export const wsDataSources = [
  {
    id: "ticker",
    label: "Ticker",
    description: "Real-time ticker updates",
    url: "wss://ws.example.com/ticker",
    topic: "ticker",
  },
  {
    id: "index_price",
    label: "Index Price",
    description: "Real-time index price stream",
    url: "wss://ws.example.com/index_price",
    topic: "index_price",
  },
  {
    id: "mark_price",
    label: "Mark Price",
    description: "Real-time mark price updates",
    url: "wss://ws.example.com/mark_price",
    topic: "mark_price",
  },
  {
    id: "orderbook_stream",
    label: "Orderbook Stream",
    description: "Real-time orderbook depth updates",
    url: "wss://ws.example.com/orderbook",
    topic: "orderbook",
  },
  {
    id: "trades_stream",
    label: "Trades Stream",
    description: "Real-time trades feed",
    url: "wss://ws.example.com/trades",
    topic: "trades",
  },
] as const;

export type ApiDataSource = (typeof apiDataSources)[number];
export type WsDataSource = (typeof wsDataSources)[number];

