import { create } from "zustand";
import type { UserDataSource } from "../types/formula";
import { db } from "../lib/dexie";

/**
 * Store for managing user-defined data sources
 */
interface DataSourceStore {
  // State
  userDataSources: UserDataSource[];
  dataSourceData: Record<string, unknown>;

  // Actions
  loadDataSources: () => Promise<void>;
  saveDataSource: (
    name: string,
    value: unknown,
    unit?: string,
    description?: string,
    sourceNodeId?: string
  ) => Promise<string>;
  deleteDataSource: (id: string) => Promise<void>;
  getDataSource: (id: string) => UserDataSource | undefined;
  setDataSourceData: (id: string, data: unknown) => void;
  getDataSourceData: (id: string) => unknown | null | undefined;
}

/**
 * Generate a unique ID for a data source
 */
function generateDataSourceId(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useDataSourceStore = create<DataSourceStore>((set, get) => ({
  // Initial state
  userDataSources: [],
  dataSourceData: {},

  setDataSourceData: (id, data) => {
    set((state) => ({
      dataSourceData: {
        ...state.dataSourceData,
        [id]: data,
      },
    }));
  },

  getDataSourceData: (id) => {
    return get().dataSourceData[id];
  },

  /**
   * Load all user data sources from IndexedDB
   */
  loadDataSources: async () => {
    try {
      const dataSources = await db.userDataSources
        .orderBy("timestamp")
        .reverse()
        .toArray();
      set({ userDataSources: dataSources });
    } catch (error) {
      console.error("Failed to load data sources:", error);
    }
  },

  /**
   * Save a new data source to IndexedDB
   * @param name - User-provided name for the data source
   * @param value - The value to save
   * @param unit - Optional unit
   * @param description - Optional description
   * @param sourceNodeId - Optional source node ID
   * @returns The ID of the saved data source
   */
  saveDataSource: async (name, value, unit, description, sourceNodeId) => {
    try {
      const id = generateDataSourceId();
      const dataSource: UserDataSource = {
        id,
        name,
        value: value as UserDataSource["value"],
        unit,
        description,
        timestamp: Date.now(),
        sourceNodeId,
      };

      await db.userDataSources.add(dataSource);

      // Reload data sources to update state
      await get().loadDataSources();

      return id;
    } catch (error) {
      console.error("Failed to save data source:", error);
      throw error;
    }
  },

  /**
   * Delete a data source from IndexedDB
   * @param id - The ID of the data source to delete
   */
  deleteDataSource: async (id) => {
    try {
      await db.userDataSources.delete(id);
      await get().loadDataSources();
    } catch (error) {
      console.error("Failed to delete data source:", error);
      throw error;
    }
  },

  /**
   * Get a data source by ID
   * @param id - The ID of the data source
   * @returns The data source or undefined if not found
   */
  getDataSource: (id) => {
    return get().userDataSources.find((ds) => ds.id === id);
  },
}));
