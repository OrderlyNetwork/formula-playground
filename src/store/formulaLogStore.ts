import { create } from "zustand";
import type { FormulaScalar } from "@/types/formula";

export type LogLevel = "info" | "warning" | "error";

export interface FormulaExecutionLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  formulaId: string;
  rowId: string;
  inputs: Record<string, FormulaScalar>;
  result?: FormulaScalar;
  error?: string;
  stack?: string;
  executionTime?: number;
}

interface FormulaLogStore {
  logs: FormulaExecutionLog[];
  isOpen: boolean;

  // Actions
  addLog: (log: Omit<FormulaExecutionLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  togglePanel: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const MAX_LOGS = 20;

export const useFormulaLogStore = create<FormulaLogStore>((set) => ({
  logs: [],
  isOpen: false,

  addLog: (logData) => {
    const newLog: FormulaExecutionLog = {
      ...logData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    set((state) => ({
      logs: [newLog, ...state.logs].slice(0, MAX_LOGS),
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  togglePanel: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  setIsOpen: (isOpen) => {
    set({ isOpen });
  },
}));
