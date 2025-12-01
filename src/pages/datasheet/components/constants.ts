import { Database, Clock, Settings, Sigma } from "lucide-react";
import type { Table } from "../types";

export type ActivePanel =
  | "formulas"
  | "datasource"
  | "history"
  | "settings"
  | null;

export interface Category {
  id: ActivePanel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type PanelComponent = React.ComponentType<{ tables?: Table[] }>;

export interface PanelConfig {
  component: PanelComponent;
  requiresTables?: boolean;
}

// Mock data for formulas - replace with actual store data if available
export const mockFormulas = [
  {
    id: "1",
    name: "Funding Fee",
    tags: ["trading", "fees"],
    creationType: "core" as const,
  },
  {
    id: "2",
    name: "Liquidation Price",
    tags: ["risk", "trading"],
    creationType: "core" as const,
  },
  {
    id: "3",
    name: "PnL Calculation",
    tags: ["profit", "loss"],
    creationType: "core" as const,
  },
];

// Categories configuration
export const categories: Category[] = [
  { id: "formulas", label: "Formulas", icon: Sigma },
  { id: "datasource", label: "DataSource", icon: Database },
  { id: "history", label: "History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];
