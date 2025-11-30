/**
 * Data source configurations for API and WebSocket endpoints
 */

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
  },
  {
    id: "symbols",
    label: "Symbols",
    description: "Get all trading symbols/pairs",
    method: "GET",
    url: "/v1/public/symbols",
    dataPath: "data.rows",
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
} as const;

export type DataSourceType =
  (typeof DataSourceType)[keyof typeof DataSourceType];

export interface DataSourceOption {
  label: string;
  value: string | number;
  [key: string]: any;
}

export interface BaseDataSourceConfig {
  id: string;
  type: DataSourceType;
  description?: string;
}

export interface StaticDataSourceConfig extends BaseDataSourceConfig {
  type: typeof DataSourceType.STATIC;
  options: DataSourceOption[];
}

export interface ApiDataSourceConfig extends BaseDataSourceConfig {
  type: typeof DataSourceType.API;
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  // Path to the array in the response (e.g., "data.rows"). If empty, assumes root is array.
  dataPath: string;
}

export type DataSourceConfig = StaticDataSourceConfig | ApiDataSourceConfig;

class DataSourceManager {
  private configs: Map<string, DataSourceConfig> = new Map();
  private data: Map<string, DataSourceOption[]> = new Map();

  /**
   * Register a new data source configuration
   */
  register(config: DataSourceConfig) {
    this.configs.set(config.id, config);
    if (config.type === DataSourceType.STATIC) {
      this.data.set(config.id, config.options);
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
    return this.data.get(id) || [];
  }

  /**
   * Fetch data for a specific API data source
   */
  async fetch(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config || config.type !== DataSourceType.API) {
      return;
    }

    // Type guard confirmed config is ApiDataSourceConfig
    const apiConfig = config as ApiDataSourceConfig;

    try {
      const response = await fetch(apiConfig.url, {
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

      this.data.set(id, items);
    } catch (error) {
      console.error(`Error fetching data source ${id}:`, error);
      // Optionally handle error state
    }
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

  private extractItems(data: any, path?: string): any[] {
    if (!path) {
      return Array.isArray(data) ? data : [];
    }
    return path.split(".").reduce((obj, key) => obj?.[key], data) || [];
  }
}

export const dataSourceManager = new DataSourceManager();
