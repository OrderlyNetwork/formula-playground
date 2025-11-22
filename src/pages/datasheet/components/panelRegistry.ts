import { LocalFormulasPanel } from "./FormulasPanel";
import { DataSourcePanelWrapper } from "./DataSourcePanel";
import {
  DataSourcePanel as BaseDataSourcePanel,
  HistoryPanel,
  SettingsPanel,
} from "@/pages/playground/components/panels";
import type { PanelConfig, ActivePanel } from "./constants";

// Registry pattern for panels
export const PANEL_REGISTRY: Record<Exclude<ActivePanel, null>, PanelConfig> = {
  formulas: { component: LocalFormulasPanel },
  datasource: { component: DataSourcePanelWrapper, requiresTables: true },
  history: { component: HistoryPanel },
  settings: { component: SettingsPanel },
};