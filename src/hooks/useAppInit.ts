import { useState, useEffect } from "react";
import { dataSourceManager } from "@/config/dataSources";
import { useFormulaStore } from "@/store/formulaStore";

interface AppInitState {
  isReady: boolean;
  error: Error | null;
  statusMessage: string;
}

export function useAppInit(): AppInitState {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const loadFormulasFromAllSources = useFormulaStore(
    (state) => state.loadFormulasFromAllSources
  );

  useEffect(() => {
    const init = async () => {
      try {
        setStatusMessage("Loading data sources...");
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
  }, [loadFormulasFromAllSources]);

  return { isReady, error, statusMessage };
}
