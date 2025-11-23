import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TabBar } from "../datasheet/components/TabBar";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { ResultsTable } from "../datasheet/components/ResultsTable";
import { StatusBar } from "../datasheet/components/StatusBar";
import type { TabItem, QueryResult } from "../datasheet/types";
import { useFormulaStore } from "@/store/formulaStore";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { useParams, useNavigate } from "react-router";
import { useEffect, useMemo } from "react";
import { FormulaDocs } from "../playground/components/FormulaDocs";
import { FormulaCode } from "../playground/components/FormulaCode";

// Mock Data
const results: QueryResult[] = [
  {
    id: 1,
    title: "ACADEMY DINOSAUR",
    description:
      "A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies",
  },
  {
    id: 2,
    title: "ACE GOLDFINGER",
    description:
      "A Astounding Epistle of a Database Administrator And a Explorer who must Find a Car in Ancient China",
  },
  {
    id: 3,
    title: "ADAPTATION HOLES",
    description:
      "A Astounding Reflection of a Lumberjack And a Car who must Sink a Lumberjack in A Baloon Factory",
  },
  {
    id: 4,
    title: "AFFAIR PREJUDICE",
    description:
      "A Fanciful Documentary of a Frisbee And a Lumberjack who must Chase a Monkey in A Shark Tank",
  },
  {
    id: 5,
    title: "AFRICAN EGG",
    description:
      "A Fast-Paced Documentary of a Pastry Chef And a Dentist who must Pursue a Forensic Psychologist in The Gulf of Mexico",
  },
  {
    id: 6,
    title: "AGENT TRUMAN",
    description:
      "A Intrepid Panorama of a Robot And a Boy who must Escape a Sumo Wrestler in Ancient China",
  },
  {
    id: 7,
    title: "AIRPLANE SIERRA",
    description:
      "A Touching Saga of a Hunter And a Butler who must Discover a Butler in A Jet Boat",
  },
  {
    id: 8,
    title: "AIRPORT POLLOCK",
    description:
      "A Epic Tale of a Moose And a Girl who must Confront a Monkey in Ancient India",
  },
  {
    id: 9,
    title: "ALABAMA DEVIL",
    description:
      "A Thoughtful Panorama of a Database Administrator And a Mad Scientist who must Outgun a Mad Scientist in A Jet Boat",
  },
  {
    id: 10,
    title: "ALADDIN CALENDAR",
    description:
      "A Action-Packed Tale of a Man And a Lumberjack who must Reach a Feminist in Ancient China",
  },
  {
    id: 11,
    title: "ALAMO VIDEOTAPE",
    description:
      "A Boring Epistle of a Butler And a Cat who must Fight a Pastry Chef in A MySQL Convention",
  },
];

export const FormulaDetails = () => {
  // Get formula ID from URL params
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Access formula store
  const { getFormulaDefinition, loadFormulasFromAllSources } =
    useFormulaStore();

  // Access tab store
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } =
    useFormulaTabStore();

  // Load formulas and manage tabs
  useEffect(() => {
    const initializeFormula = async () => {
      // Load all formulas first
      await loadFormulasFromAllSources();
    };

    initializeFormula();
  }, [loadFormulasFromAllSources]);

  // Add tab when URL changes and formulas are loaded
  useEffect(() => {
    if (id) {
      const formula = getFormulaDefinition(id);
      if (formula) {
        addTab(id, formula.name || id, "code");
      }
    }
  }, [id, getFormulaDefinition, addTab]);

  // Sync active tab with URL - only if the tab exists
  useEffect(() => {
    if (id) {
      const tabExists = tabs.some((tab) => tab.id === id);
      if (tabExists && id !== activeTabId) {
        setActiveTab(id);
      }
    }
  }, [id, activeTabId, setActiveTab, tabs]);

  // Get current formula definition based on active tab
  const currentFormula = useMemo(() => {
    return activeTabId ? getFormulaDefinition(activeTabId) : undefined;
  }, [activeTabId, getFormulaDefinition]);

  const handleDownloadResults = () => {
    console.log("Downloading results...");
  };

  const handleCloseTab = (label: string) => {
    // Find tab by label
    const tab = tabs.find((t) => t.label === label);
    if (!tab) return;

    const tabIndex = tabs.findIndex((t) => t.id === tab.id);
    const newTabs = tabs.filter((t) => t.id !== tab.id);

    // 关闭标签页
    closeTab(tab.id);

    // 如果关闭的是当前 URL 对应的标签
    if (tab.id === id) {
      if (newTabs.length === 0) {
        // 没有其他标签页了，导航回数据表页面
        navigate("/datasheet");
      } else {
        // 确定下一个要激活的标签页
        let nextTab;
        if (tabIndex < newTabs.length) {
          nextTab = newTabs[tabIndex];
        } else {
          nextTab = newTabs[tabIndex - 1];
        }
        navigate(`/formula/${nextTab.id}`);
      }
    }
  };

  const handleTabClick = (label: string) => {
    // Find tab by label
    const tab = tabs.find((t) => t.label === label);
    if (tab) {
      setActiveTab(tab.id);
      navigate(`/formula/${tab.id}`);
    }
  };

  // Convert tabs to TabItem format for TabBar component
  const tabItems: TabItem[] = useMemo(() => {
    return tabs.map((tab) => ({
      label: tab.label,
      type: tab.type,
      active: tab.id === activeTabId,
    }));
  }, [tabs, activeTabId]);

  console.log("Formula ID from URL:", id);
  console.log("Active tab ID:", activeTabId);
  console.log("Current formula:", currentFormula);
  console.log("All tabs:", tabs);

  // 判断是否应该显示内容：有活动标签且公式数据已加载
  const shouldShowContent = tabs.length > 0 && activeTabId && currentFormula;

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-white">
      {/* Tabs */}
      <TabBar
        tabs={tabItems}
        onCloseTab={handleCloseTab}
        onTabClick={handleTabClick}
      />

      {/* Content */}
      {!shouldShowContent ? (
        <div className="flex-1 flex items-center justify-center text-zinc-600">
          <p>
            Select a formula to view and edit its parameters in a tabular
            format.
          </p>
        </div>
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
          <StatusBar onDownload={handleDownloadResults} />
        </>
      )}
    </div>
  );
};
