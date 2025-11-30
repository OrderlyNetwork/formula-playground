/**
 * Data source configurations for API and WebSocket endpoints
 */

const staticDataSource = [
  // {
  //   id:'OrderTypes',
  //   data:{
  //     ''
  //   }
  // }
  {
    id: "OrderSides",
    label: "Order side",
    description: "Order side",
    data: {
      buy: "BUY",
      sell: "SELL",
    },
  },
];

/**
 * RESTful API data sources
 */
export const apiDataSources = [
  {
    // the data's key for the global scope
    id: "tokens",
    label: "Tokens",
    description: "Get all available trading tokens",
    method: "GET",
    url: "/v1/public/token",
    dataPath: "data.rows",
    convertKey: "token",
  },
  {
    id: "Symbols",
    label: "Symbols",
    description: "Get Available Symbols",
    method: "GET",
    url: "/v1/public/info",
    dataPath: "data.rows",
    convertKey: "symbol",
  },
] as const;

/**
 * WebSocket data sources
 */
export const wsDataSources = [
  {
    id: "index_price",
    label: "Index Price",
    description: "Real-time index price stream",
    // url: "wss://ws.example.com/index_price",
    topic: "{symbol}@indexprice",
  },
  {
    id: "mark_price",
    label: "Mark Price",
    description: "Real-time mark price updates",
    // url: "wss://ws.example.com/mark_price",
    topic: "{symbol}@markprice",
  },
  {
    id: "ticker",
    label: "Ticker",
    description: "Real-time ticker updates",
    // url: "wss://ws.example.com/ticker",
    topic: "{symbol}@ticker",
  },
  // {
  //   id: "orderbook_stream",
  //   label: "Orderbook Stream",
  //   description: "Real-time orderbook depth updates",
  //   url: "wss://ws.example.com/orderbook",
  //   topic: "orderbook",
  // },
  // {
  //   id: "trades_stream",
  //   label: "Trades Stream",
  //   description: "Real-time trades feed",
  //   // url: "wss://ws.example.com/trades",
  //   topic: "trades",
  // },
] as const;

export type ApiDataSource = (typeof apiDataSources)[number];
export type WsDataSource = (typeof wsDataSources)[number];

/**
 * Data Source Management
 */

export const DataSourceType = {
  STATIC: "STATIC",
  API: "API",
  WEBSOCKET: "WEBSOCKET",
} as const;

export type DataSourceType =
  (typeof DataSourceType)[keyof typeof DataSourceType];

export interface DataSourceOption {
  // label: string;
  // value: string | number;
  [key: string]: any;
}

export interface BaseDataSourceConfig {
  id: string;
  type: DataSourceType;
  label: string;
  description?: string;
}

export interface StaticDataSourceConfig extends BaseDataSourceConfig {
  type: typeof DataSourceType.STATIC;
  data: DataSourceOption;
}

export interface ApiDataSourceConfig extends BaseDataSourceConfig {
  type: typeof DataSourceType.API;
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  // Path to the array in the response (e.g., "data.rows"). If empty, assumes root is array.
  dataPath: string;
  convertKey?: string;
}

export interface WsDataSourceConfig extends BaseDataSourceConfig {
  type: typeof DataSourceType.WEBSOCKET;
  topic: string;
  url?: string;
}

export type DataSourceConfig =
  | StaticDataSourceConfig
  | ApiDataSourceConfig
  | WsDataSourceConfig;

import { useDataSourceStore } from "../store/dataSourceStore";

export class DataSourceManager {
  private configs: Map<string, DataSourceConfig> = new Map();
  #apiBaseURL: string = "";
  // Track ongoing fetch requests to prevent duplicates
  private pendingFetches: Map<string, Promise<void>> = new Map();
  // Cache timestamps for each data source
  private lastFetchTime: Map<string, number> = new Map();
  // Cache duration in milliseconds (default: 5 seconds)
  private cacheDuration: number = 5000;

  set apiBaseURL(url: string) {
    this.#apiBaseURL = url;
  }

  /**
   * Set the cache duration for deduplication
   * @param duration Duration in milliseconds
   */
  setCacheDuration(duration: number) {
    this.cacheDuration = duration;
  }

  /**
   * Register a new data source configuration
   */
  register(config: DataSourceConfig) {
    this.configs.set(config.id, config);
    if (config.type === DataSourceType.STATIC) {
      useDataSourceStore.getState().setDataSourceData(config.id, config.data);
    }
  }

  /**
   * Get a configuration by ID
   */
  getConfig(id: string): DataSourceConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): DataSourceConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get options for a specific data source
   */
  getOptions(id: string): DataSourceOption[] {
    return useDataSourceStore.getState().getDataSourceData(id);
  }

  /**
   * Fetch data for a specific API data source
   * Implements deduplication to prevent duplicate requests within cache duration
   */
  async fetch(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config || config.type !== DataSourceType.API) {
      return;
    }

    // Check if there's already a pending request
    const pending = this.pendingFetches.get(id);
    if (pending) {
      return pending;
    }

    // Check if we have recent cached data
    const lastFetch = this.lastFetchTime.get(id);
    const now = Date.now();
    if (lastFetch && now - lastFetch < this.cacheDuration) {
      return;
    }

    // Type guard confirmed config is ApiDataSourceConfig
    const apiConfig = config as ApiDataSourceConfig;

    // Create and store the fetch promise
    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${this.#apiBaseURL}${apiConfig.url}`, {
          method: apiConfig.method || "GET",
          headers: apiConfig.headers,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch data source ${id}: ${response.statusText}`
          );
        }

        const result = await response.json();
        const items = this.extractItems(result, apiConfig.dataPath);

        // if the data is an array, convert it to an object with the key as the index
        if (Array.isArray(items) && typeof apiConfig.convertKey === "string") {
          const obj: Record<string, any> = {};
          for (const item of items) {
            obj[item[apiConfig.convertKey]] = item;
          }
          useDataSourceStore.getState().setDataSourceData(id, obj);
        } else {
          useDataSourceStore.getState().setDataSourceData(id, items as any[]);
        }

        // Update last fetch time
        this.lastFetchTime.set(id, Date.now());
      } catch (error) {
        console.error(`Error fetching data source ${id}:`, error);
        // Optionally handle error state
      } finally {
        // Remove from pending fetches
        this.pendingFetches.delete(id);
      }
    })();

    this.pendingFetches.set(id, fetchPromise);
    return fetchPromise;
  }

  /**
   * Fetch all API data sources
   */
  async fetchAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const config of this.configs.values()) {
      if (config.type === DataSourceType.API) {
        promises.push(this.fetch(config.id));
      }
    }
    await Promise.all(promises);
  }

  /**
   * Serialize configurations to JSON
   */
  toJSON(): string {
    return JSON.stringify(Array.from(this.configs.values()));
  }

  /**
   * Load configurations from JSON
   */
  fromJSON(json: string | DataSourceConfig[]) {
    const configs = typeof json === "string" ? JSON.parse(json) : json;
    if (Array.isArray(configs)) {
      configs.forEach((config) => this.register(config));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractItems(data: unknown, path?: string): any[] {
    if (!path) {
      return Array.isArray(data) ? data : [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = path.split(".").reduce((obj: any, key) => obj?.[key], data);
    return Array.isArray(result) ? result : [];
  }

  static prepare() {
    staticDataSource.forEach((config) =>
      dataSourceManager.register({ ...config, type: DataSourceType.STATIC })
    );
    apiDataSources.forEach((config) =>
      dataSourceManager.register({
        ...config,
        type: DataSourceType.API,
      })
    );
    // wsDataSources.forEach((config) => dataSourceManager.register({
    //   ...config,
    //   type: DataSourceType.WEBSOCKET,
    // }));
  }
}

export const dataSourceManager = new DataSourceManager();
