import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card } from "@/components/common/Card";
import { useFormulaStore } from "@/store/formulaStore";
import {
  Code2,
  Download,
  SquareFunction,
  Search,
  Star,
  Table2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Table } from "@/pages/datasheet/types";
import type { FormulaDefinition } from "@/types/formula";

// Custom EntityItem for formulas with navigation and creation type indicators
function FormulaEntityItem({
  table,
  formula,
  onClick
}: {
  table: Table;
  formula: FormulaDefinition;
  onClick: () => void;
}) {
  // Determine the creation type icon
  const CreationIcon =
    formula.creationType === "parsed"
      ? Code2
      : formula.creationType === "imported"
      ? Download
      : SquareFunction;

  const creationTooltip =
    formula.creationType === "parsed"
      ? "Developer mode parsed"
      : formula.creationType === "imported"
      ? "Imported from GitHub"
      : "Built-in formula";

  return (
    <div
      className={cn(
        "group flex items-center justify-between px-2 py-1 rounded cursor-pointer text-sm",
        table.active
          ? "bg-[#37373d] text-white"
          : "text-zinc-400 hover:bg-[#2a2d2e] hover:text-zinc-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Table2 className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`shrink-0 ${
                  formula.creationType === "parsed"
                    ? "text-purple-600"
                    : formula.creationType === "imported"
                    ? "text-blue-600"
                    : "text-gray-600"
                }`}
              >
                <CreationIcon strokeWidth={1.5} size={12} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {creationTooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="truncate">{table.name}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center">
        {table.active && <Star className="h-3 w-3 text-yellow-500" />}
        {!table.active && table.pinned && <Star className="h-3 w-3 text-yellow-500" />}
      </div>
    </div>
  );
}

// Custom EntitySection for formulas with navigation
function FormulaEntitySection({
  title,
  tables,
  count,
  formulas,
  onFormulaClick
}: {
  title: string;
  tables: Table[];
  count: number;
  formulas: FormulaDefinition[];
  onFormulaClick: (formula: FormulaDefinition) => void;
}) {
  if (tables.length === 0 && title === "Pinned") return null;

  return (
    <div className={cn("mb-4", title === "Formulas" && "mb-0")}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>{title}</span>
        <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-full">
          {count}
        </span>
      </div>
      {tables.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {tables.map((table, index) => (
            <FormulaEntityItem
              key={`${title}-${table.name}`}
              table={table}
              formula={formulas[index]}
              onClick={() => onFormulaClick(formulas[index])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Adapter function to convert FormulaDefinition to Table format for EntitySection
function formulaToTable(formula: FormulaDefinition, selectedFormulaId?: string): Table {
  return {
    name: formula.name,
    type: "table" as const, // All formulas shown as table type for consistent icon
    pinned: formula.tags?.includes("pinned") || false,
    active: formula.id === selectedFormulaId,
  };
}

export function FormulasPanel() {
  const { formulaDefinitions, selectedFormulaId } = useFormulaStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Handle formula navigation
   */
  const handleFormulaClick = (formula: FormulaDefinition) => {
    navigate(`/formula/${formula.id}`);
  };

  /**
   * Filter formulas based on search query
   * Searches in formula name and tags
   */
  const filteredFormulas = useMemo(() => {
    if (!searchQuery.trim()) {
      return formulaDefinitions;
    }
    const query = searchQuery.toLowerCase().trim();
    return formulaDefinitions.filter((formula) => {
      const nameMatch = formula.name.toLowerCase().includes(query);
      const tagsMatch = formula.tags?.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return nameMatch || tagsMatch;
    });
  }, [formulaDefinitions, searchQuery]);

  /**
   * Convert filtered formulas to Table format and separate into pinned/unpinned
   */
  const { pinnedTables, unpinnedTables, pinnedFormulas, unpinnedFormulas } = useMemo(() => {
    const pinned: { table: Table; formula: FormulaDefinition }[] = [];
    const unpinned: { table: Table; formula: FormulaDefinition }[] = [];

    filteredFormulas.forEach(formula => {
      const table = formulaToTable(formula, selectedFormulaId);
      if (table.pinned) {
        pinned.push({ table, formula });
      } else {
        unpinned.push({ table, formula });
      }
    });

    return {
      pinnedTables: pinned.map(p => p.table),
      unpinnedTables: unpinned.map(p => p.table),
      pinnedFormulas: pinned.map(p => p.formula),
      unpinnedFormulas: unpinned.map(p => p.formula),
    };
  }, [filteredFormulas, selectedFormulaId]);

  return (
    <>
      <Card
        title="Formulas"
        className="flex flex-col h-full"
        // headerRight={
        //   <TooltipProvider>
        //     <Tooltip>
        //       <TooltipTrigger asChild>
        //         <Button
        //           variant="ghost"
        //           size="sm"
        //           aria-label="Settings"
        //           title="Settings"
        //           className="p-0 h-4 w-4"
        //           onClick={handleImport}
        //         >
        //           <Settings2 strokeWidth={1.5} size={14} />
        //         </Button>
        //       </TooltipTrigger>
        //       <TooltipContent>Settings</TooltipContent>
        //     </Tooltip>
        //   </TooltipProvider>
        // }
      >
        {/* Search box */}
        <div className="px-2.5 py-2 border-b border-gray-200 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
              strokeWidth={1.5}
              size={14}
            />
            <Input
              type="text"
              placeholder="Search formulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        {/* Formula list with EntitySection components */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {formulaDefinitions.length === 0 ? (
            <p className="text-xs text-gray-500 px-2.5 py-4">
              No formulas loaded
            </p>
          ) : filteredFormulas.length === 0 ? (
            <p className="text-xs text-gray-500 px-2.5 py-4">
              No matching formulas found
            </p>
          ) : (
            <div className="p-2">
              <FormulaEntitySection
                title="Pinned"
                tables={pinnedTables}
                count={pinnedTables.length}
                formulas={pinnedFormulas}
                onFormulaClick={handleFormulaClick}
              />
              <FormulaEntitySection
                title="Formulas"
                tables={unpinnedTables}
                count={unpinnedTables.length}
                formulas={unpinnedFormulas}
                onFormulaClick={handleFormulaClick}
              />
            </div>
          )}
        </div>

        {/* Fixed footer with statistics */}
        <div className="px-2.5 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 shrink-0">
          {searchQuery.trim() ? (
            <>
              Showing {filteredFormulas.length} / {formulaDefinitions.length}{" "}
              formulas
            </>
          ) : (
            <>Total {formulaDefinitions.length} formulas</>
          )}
        </div>
      </Card>
    </>
  );
}
