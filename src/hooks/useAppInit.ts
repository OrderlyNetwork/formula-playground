import { useState, useEffect } from "react";
import { DataSourceManager, dataSourceManager } from "@/config/dataSources";
import { useFormulaStore } from "@/store/formulaStore";
import { useSettingsStore } from "@/store/settingsStore";

interface AppInitState {
  isReady: boolean;
  error: Error | null;
  statusMessage: string;
}

export function useAppInit(): AppInitState {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const apiBaseURL = useSettingsStore((state) => state.settings.apiBaseURL);
  const loadFormulasFromAllSources = useFormulaStore(
    (state) => state.loadFormulasFromAllSources
  );

  useEffect(() => {
    const init = async () => {
      try {
        dataSourceManager.apiBaseURL = apiBaseURL;
        setStatusMessage("Loading data sources...");
        DataSourceManager.prepare();
        await dataSourceManager.fetchAll();

        setStatusMessage("Loading formula library...");
        await loadFormulasFromAllSources();

        setStatusMessage("Ready");
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize application:", err);
        setError(
          err instanceof Error ? err : new Error("Unknown initialization error")
        );
        setStatusMessage("Initialization failed");
        // Even if there's an error, we might want to let the app load (maybe with a warning)
        setIsReady(true);
      }
    };

    init();
  }, [loadFormulasFromAllSources, apiBaseURL]);

  return { isReady, error, statusMessage };
}
