import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { LeftPanel } from "./components/LeftPanel";
import { CenterCanvas } from "./components/CenterCanvas";
import { FormulaDocs } from "./components/FormulaDocs";
import { FormulaCode } from "./components/FormulaCode";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useFormulaStore } from "../../store/formulaStore";
import { mockFormulas } from "../../constants/mockFormulas";

export function PlaygroundPage() {
  const { loadFormulas, error } = useFormulaStore();

  useEffect(() => {
    // Load pre-defined mock formulas for MVP
    // In production, this would parse from SDK source code
    loadFormulas(mockFormulas);
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

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
            <div className="h-full">
              <LeftPanel />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={78} minSize={40}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full">
                  <CenterCanvas />
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <FormulaDocs />
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <FormulaCode />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
