import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { LeftPanel } from "./components/LeftPanel";
import { CenterCanvas } from "./components/CenterCanvas";
import { RightPanel } from "./components/RightPanel";
import { useFormulaStore } from "../../store/formulaStore";
import { mockFormulas } from "../../constants/mockFormulas";

export function PlaygroundPage() {
  const { loadFormulas, error } = useFormulaStore();

  useEffect(() => {
    // Load pre-defined mock formulas for MVP
    // In production, this would parse from SDK source code
    loadFormulas(mockFormulas as any);
  }, [loadFormulas]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Error:</span> {error}
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <CenterCanvas />
        <RightPanel />
      </div>
    </div>
  );
}
