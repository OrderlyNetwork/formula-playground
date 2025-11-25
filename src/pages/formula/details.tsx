import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TabBar } from "../datasheet/components/TabBar";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { StatusBar } from "../datasheet/components/StatusBar";
import type { TabItem } from "../datasheet/types";
import { useFormulaStore } from "@/store/formulaStore";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { useCalculationStatusStore } from "@/store/calculationStatusStore";
import { useParams, useNavigate } from "react-router";
import { useEffect, useMemo, useCallback, useRef } from "react";
import { FormulaDocs } from "../playground/components/FormulaDocs";
import { FormulaCode } from "../playground/components/FormulaCode";
import { Progress } from "@/components/ui/progress";

/**
 * Loading state component
 * Displayed while formulas are being loaded from sources
 */
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

/**
 * Empty state component
 * Displayed when no formula is selected or formula not found
 */
const EmptyState = () => (
  <div className="flex-1 flex items-center justify-center text-zinc-600">
    <p>Select a formula to view and edit its parameters in a tabular format.</p>
  </div>
);

export const FormulaDetails = () => {
  // Get formula ID from URL params
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Access formula store
  const { loadFormulasFromAllSources, formulaDefinitions, loading } =
    useFormulaStore();

  // Access global calculation status store
  const { getMetrics } = useCalculationStatusStore();

  // Access tab store
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } =
    useFormulaTabStore();

  // Track if formulas have been loaded to avoid duplicate loading
  const formulasLoadedRef = useRef(false);

  // Load formulas on mount - only once
  useEffect(() => {
    if (!formulasLoadedRef.current) {
      formulasLoadedRef.current = true;
      loadFormulasFromAllSources();
    }
  }, [loadFormulasFromAllSources]);

  // Add tab when URL changes and sync active tab
  // This effect handles both adding tabs and syncing active tab with URL
  // Wait for formulas to load before attempting to add tab
  useEffect(() => {
    // Don't proceed if no ID or still loading
    if (!id || loading) return;

    // Find formula directly from definitions
    const formula = formulaDefinitions.find((f) => f.id === id);
    if (!formula) {
      // Formula not found even after loading - might be invalid ID
      console.warn(`Formula with id "${id}" not found`);
      return;
    }

    // Add tab if it doesn't exist (addTab handles duplicate check)
    addTab(id, formula.name || id, "code");

    // Sync active tab with URL if different
    if (id !== activeTabId) {
      setActiveTab(id);
    }
  }, [id, loading, formulaDefinitions, addTab, setActiveTab, activeTabId]);

  // Get current formula definition based on active tab
  // Compute directly from formulaDefinitions to ensure reactivity
  const currentFormula = useMemo(() => {
    if (!activeTabId) return undefined;
    return formulaDefinitions.find((f) => f.id === activeTabId);
  }, [activeTabId, formulaDefinitions]);

  /**
   * Handle download results action
   * TODO: Implement actual download functionality
   */
  const handleDownloadResults = useCallback(() => {
    console.log("Downloading results...");
    // TODO: Implement CSV/Excel export functionality
  }, []);

  /**
   * Handle closing a tab
   * Navigates to the next available tab or back to datasheet if no tabs remain
   */
  const handleCloseTab = useCallback(
    (label: string) => {
      // Find tab by label
      const tab = tabs.find((t) => t.label === label);
      if (!tab) return;

      const isClosingActiveTab = tab.id === id;
      const tabIndex = tabs.findIndex((t) => t.id === tab.id);

      // Calculate which tab will be active after closing
      const remainingTabs = tabs.filter((t) => t.id !== tab.id);
      let nextActiveTabId: string | null = null;

      if (remainingTabs.length > 0) {
        // Determine next tab based on store logic: prefer right tab, fallback to left
        if (tabIndex < remainingTabs.length) {
          nextActiveTabId = remainingTabs[tabIndex].id;
        } else {
          nextActiveTabId =
            remainingTabs[tabIndex - 1]?.id || remainingTabs[0].id;
        }
      }

      // Close the tab (store handles activating next tab based on its logic)
      closeTab(tab.id);

      // If closing the active tab, navigate to the next tab or datasheet
      if (isClosingActiveTab) {
        if (nextActiveTabId) {
          // Navigate to the next tab that should be active
          navigate(`/formula/${nextActiveTabId}`);
        } else {
          // No tabs remaining, navigate back to datasheet
          navigate("/datasheet");
        }
      }
    },
    [tabs, id, closeTab, navigate]
  );

  /**
   * Handle tab click to switch between tabs
   */
  const handleTabClick = useCallback(
    (label: string) => {
      // Find tab by label
      const tab = tabs.find((t) => t.label === label);
      if (tab && tab.id !== activeTabId) {
        setActiveTab(tab.id);
        navigate(`/formula/${tab.id}`);
      }
    },
    [tabs, activeTabId, setActiveTab, navigate]
  );

  // Convert tabs to TabItem format for TabBar component
  const tabItems: TabItem[] = useMemo(() => {
    return tabs.map((tab) => ({
      label: tab.label,
      type: tab.type,
      active: tab.id === activeTabId,
    }));
  }, [tabs, activeTabId]);

  /**
   * Determine if content should be displayed
   * Requires: not loading, tabs exist, active tab is set, and formula is loaded
   */
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
      {/* Tabs */}
      <TabBar
        tabs={tabItems}
        onCloseTab={handleCloseTab}
        onTabClick={handleTabClick}
      />

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : !shouldShowContent ? (
        <EmptyState />
      ) : (
        <>
          {/* Split View: Editor & Results */}
          <ResizablePanelGroup direction="vertical" className="flex-1">
            {/* SQL Editor */}
            <ResizablePanel defaultSize={80} minSize={20}>
              <FormulaDataSheet formula={currentFormula} />
            </ResizablePanel>

            <ResizableHandle className="bg-zinc-200" />

            {/* Results Table */}
            <ResizablePanel defaultSize={20}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={50} minSize={20}>
                  <FormulaDocs formula={currentFormula} />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50} minSize={20}>
                  <FormulaCode formula={currentFormula} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Status Bar */}
          <StatusBar
            onDownload={handleDownloadResults}
            executionTime={getMetrics(activeTabId || "")?.averageTime || 0}
            rowCount={getMetrics(activeTabId || "")?.calculatedRows || 0}
          />
        </>
      )}
    </div>
  );
};
