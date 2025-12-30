import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { TabBar } from "../datasheet/components/TabBar";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { StatusBar } from "../datasheet/components/StatusBar";
import type { TabItem } from "../datasheet/types";
import { useFormulaStore } from "@/store/formulaStore";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useFormulaLogStore } from "@/store/formulaLogStore";
import { useParams, useNavigate } from "react-router";
import { useEffect, useMemo, useCallback, useRef } from "react";
import { FormulaDocs } from "../playground/components/FormulaDocs";
import { FormulaCode } from "../playground/components/FormulaCode";
import { Progress } from "@/components/ui/progress";
import { FormulaLogPanel } from "../datasheet/components/FormulaLogPanel";

const LoadingState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-600">
    <div className="w-64 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        <p className="text-sm font-medium">Loading formulas...</p>
      </div>
      <Progress value={66} className="h-1" />
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center text-zinc-600">
    <p>Select a formula to view and edit its parameters in a tabular format.</p>
  </div>
);

export const FormulaDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { formulaDefinitions, loading } = useFormulaStore();

  const { tabs, activeTabId, addTab, closeTab, setActiveTab } =
    useFormulaTabStore();

  const setCurrentFormula = useSpreadsheetStore(
    (state) => state.setCurrentFormula
  );

  const isLogPanelOpen = useFormulaLogStore((state) => state.isOpen);

  const logPanelRef = useRef<ImperativePanelHandle>(null);

  // Sync log panel collapse state with store
  useEffect(() => {
    const panel = logPanelRef.current;
    if (panel) {
      const isCollapsed = panel.isCollapsed();
      if (isLogPanelOpen && isCollapsed) {
        panel.expand();
      } else if (!isLogPanelOpen && !isCollapsed) {
        panel.collapse();
      }
    }
  }, [isLogPanelOpen]);

  useEffect(() => {
    // Don't process if no ID or still loading
    if (!id || loading) return;

    // Don't process if formulas haven't been loaded yet
    if (formulaDefinitions.length === 0) return;

    const formula = formulaDefinitions.find((f) => f.id === id);
    if (!formula) {
      console.warn(`Formula with id "${id}" not found`);
      return;
    }

    // Only set active tab if it's different and we are initializing or navigating via browser
    if (id !== activeTabId) {
      addTab(id, formula.name || id, "code");
      setActiveTab(id);
    }
  }, [id, loading, formulaDefinitions, addTab, setActiveTab]);

  const currentFormula = useMemo(() => {
    if (!activeTabId) return undefined;
    return formulaDefinitions.find((f) => f.id === activeTabId);
  }, [activeTabId, formulaDefinitions]);

  useEffect(() => {
    // console.log("------->>>currentFormula", currentFormula);
    setCurrentFormula(currentFormula);
  }, [currentFormula, setCurrentFormula]);

  const handleCloseTab = useCallback(
    (label: string) => {
      const tab = tabs.find((t) => t.label === label);
      if (!tab) return;

      const isClosingActiveTab = tab.id === activeTabId;
      const tabIndex = tabs.findIndex((t) => t.id === tab.id);

      const remainingTabs = tabs.filter((t) => t.id !== tab.id);
      let nextActiveTabId: string | null = null;

      if (remainingTabs.length > 0) {
        if (tabIndex < remainingTabs.length) {
          nextActiveTabId = remainingTabs[tabIndex].id;
        } else {
          nextActiveTabId =
            remainingTabs[tabIndex - 1]?.id || remainingTabs[0].id;
        }
      }

      closeTab(tab.id);

      if (isClosingActiveTab) {
        if (nextActiveTabId) {
          navigate(`/formula/${nextActiveTabId}`);
        } else {
          navigate("/datasheet");
        }
      }
    },
    [tabs, id, closeTab, navigate]
  );

  const handleTabClick = useCallback(
    (label: string) => {
      const tab = tabs.find((t) => t.label === label);
      if (tab && tab.id !== activeTabId) {
        setActiveTab(tab.id);
        navigate(`/formula/${tab.id}`, {
          replace: true,
        });
      }
    },
    [tabs, activeTabId, setActiveTab, navigate]
  );

  const tabItems: TabItem[] = useMemo(() => {
    return tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      type: tab.type,
      active: tab.id === activeTabId,
    }));
  }, [tabs, activeTabId]);

  const shouldShowContent = useMemo(() => {
    return (
      !loading &&
      tabs.length > 0 &&
      activeTabId !== null &&
      currentFormula !== undefined
    );
  }, [loading, tabs.length, activeTabId, currentFormula]);

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-white">
      <TabBar
        tabs={tabItems}
        onCloseTab={handleCloseTab}
        onTabClick={handleTabClick}
      />

      {loading ? (
        <LoadingState />
      ) : !shouldShowContent ? (
        <EmptyState />
      ) : (
        <>
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={100} minSize={20}>
              <ResizablePanelGroup direction="vertical" className="flex-1">
                <ResizablePanel defaultSize={70} minSize={20}>
                  <FormulaDataSheet />
                </ResizablePanel>

                <ResizableHandle className="bg-zinc-200" />

                <ResizablePanel defaultSize={30} minSize={10}>
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-full"
                  >
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
            <ResizableHandle className="bg-zinc-200" />
            <ResizablePanel
              ref={logPanelRef}
              defaultSize={0}
              minSize={20}
              collapsible={true}
              collapsedSize={0}
              // onCollapse={() => setLogPanelOpen(false)}
              // onExpand={() => setLogPanelOpen(true)}
            >
              <FormulaLogPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
          <StatusBar />
        </>
      )}
    </div>
  );
};
