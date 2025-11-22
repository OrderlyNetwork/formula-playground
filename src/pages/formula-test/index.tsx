"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { TabBar } from "../datasheet/components/TabBar";
import { ResultsTable } from "../datasheet/components/ResultsTable";
import { StatusBar } from "../datasheet/components/StatusBar";
import type { QueryResult, TabItem } from "../datasheet/types";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { useParams } from "react-router";
import { useFormulaStore } from "@/store/formulaStore";

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
];

const tabs: TabItem[] = [
  { label: "formula_test", type: "code", active: true },
  { label: "results", type: "grid" },
];

export function FormulaTestPage() {
  const { id } = useParams<{ id: string }>();

  // Access formula store
  const { getFormulaDefinition } = useFormulaStore();

  // Get current formula definition based on URL parameter
  const currentFormula = id ? getFormulaDefinition(id) : undefined;

  const handleDownloadResults = () => {
    console.log("Downloading results...");
  };

  const handleAddTab = () => {
    console.log("Adding new tab...");
  };

  const handleCloseTab = (label: string) => {
    console.log(`Closing tab: ${label}`);
  };

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[#1e1e1e]">
      {/* Tabs */}
      <TabBar
        tabs={tabs}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
      />

      {/* Split View: Formula Sheet & Results */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Formula Data Sheet */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <FormulaDataSheet formula={currentFormula} />
        </ResizablePanel>

        <ResizableHandle className="bg-zinc-800" />

        {/* Results Table */}
        <ResizablePanel defaultSize={60}>
          <ResultsTable results={results} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Status Bar */}
      <StatusBar onDownload={handleDownloadResults} />
    </div>
  );
}