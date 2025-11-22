import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TabBar } from "../datasheet/components/TabBar";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { ResultsTable } from "../datasheet/components/ResultsTable";
import { StatusBar } from "../datasheet/components/StatusBar";
import type { TabItem } from "../datasheet/types";
import { useFormulaStore } from "@/store/formulaStore";
import { useParams } from "react-router";
import { useEffect } from "react";

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

  // Access formula store
  const { selectedFormulaId, getFormulaDefinition, loadFormulasFromAllSources, selectFormula } = useFormulaStore();

  // Get current formula definition
  const currentFormula = selectedFormulaId
    ? getFormulaDefinition(selectedFormulaId)
    : undefined;

  // Load formulas and select the one from URL
  useEffect(() => {
    const initializeFormula = async () => {
      // Load all formulas
      await loadFormulasFromAllSources();

      // If we have an ID in the URL, select that formula
      if (id) {
        selectFormula(id);
      }
    };

    initializeFormula();
  }, [id, loadFormulasFromAllSources, selectFormula]);

  
  const handleDownloadResults = () => {
    console.log("Downloading results...");
  };

  const handleAddTab = () => {
    console.log("Adding new tab...");
  };

  const handleCloseTab = (label: string) => {
    console.log(`Closing tab: ${label}`);
  };

  const tabs: TabItem[] = [
    { label: "homepage_example", type: "code", active: true },
    { label: "film_list", type: "grid" },
    { label: "inventory", type: "grid" },
  ];

  console.log("Formula ID from URL:", id);
  console.log("Selected formula ID:", selectedFormulaId);
  console.log("Current formula:", currentFormula);

  // const currentFormula = getFormulaDefinition(id);

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[#1e1e1e]">
      {/* Tabs */}
      <TabBar tabs={tabs} onAddTab={handleAddTab} onCloseTab={handleCloseTab} />

      {/* Split View: Editor & Results */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* SQL Editor */}
        <ResizablePanel defaultSize={40} minSize={20}>
          {/* <SqlEditor
                onRun={handleRunQuery}
                onSave={handleSaveQuery}
              /> */}
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
};
