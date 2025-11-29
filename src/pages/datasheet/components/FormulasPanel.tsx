"use client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormulaSection, type Formula } from "./FormulaComponents";
import { usePinnedStore } from "@/store/usePinnedStore";
import { useFormulaStore } from "@/store/formulaStore";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/ui/button";

export function LocalFormulasPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  // ✅ Reactive: Subscribe directly to pinnedFormulaIds Set
  const pinnedFormulaIds = usePinnedStore((state) => state.pinnedFormulaIds);
  const { formulaDefinitions, loadFormulasFromAllSources } = useFormulaStore();

  // Load formulas on component mount
  useEffect(() => {
    console.log("LocalFormulasPanel: Loading formulas...");
    loadFormulasFromAllSources();
  }, [loadFormulasFromAllSources]);

  const { pinnedFormulas, unpinnedFormulas, totalFilteredFormulas } =
    useMemo(() => {
      // Convert formula definitions to the Formula interface format
      const formulas: Formula[] = formulaDefinitions.map((formula) => {
        let mappedCreationType: "core" | "sdk" | "external";
        switch (formula.creationType) {
          case "imported":
            mappedCreationType = "external";
            break;
          case "parsed":
            mappedCreationType = "sdk";
            break;
          case "builtin":
          default:
            mappedCreationType = "core";
            break;
        }

        return {
          id: formula.id,
          name: formula.name,
          tags: formula.tags,
          creationType: mappedCreationType,
        };
      });

      let filtered: Formula[] = formulas;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = formulas.filter((formula) => {
          const nameMatch = formula.name.toLowerCase().includes(query);
          const tagsMatch = formula.tags?.some((tag) =>
            tag.toLowerCase().includes(query)
          );
          return nameMatch || tagsMatch;
        });
      }

      return {
        pinnedFormulas: filtered.filter((f) => pinnedFormulaIds.has(f.id)),
        unpinnedFormulas: filtered.filter((f) => !pinnedFormulaIds.has(f.id)),
        totalFilteredFormulas: filtered.length,
      };
    }, [searchQuery, pinnedFormulaIds, formulaDefinitions]);

  return (
    <Card title="Formulas" className="h-full flex flex-col" headerRight={<Button variant={'ghost'} className="w-5 h-5" onClick={() => { }}>
      <Plus size={16} />
    </Button>}>
      <div className="flex flex-col h-full min-h-0">
        <div className="p-3 border-b border-gray-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Filter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 bg-gray-50 border-gray-300 text-xs text-gray-900 focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:border-gray-400 focus-visible:bg-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <FormulaSection
              title="Pinned"
              formulas={pinnedFormulas}
              count={pinnedFormulas.length}
            />
            <FormulaSection
              title="Formulas"
              formulas={unpinnedFormulas}
              count={formulaDefinitions.length}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-2.5 h-8 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 shrink-0">
          {searchQuery.trim() ? (
            <>
              Showing {totalFilteredFormulas} / {formulaDefinitions.length}{" "}
              formulas
            </>
          ) : (
            <>Total {formulaDefinitions.length} formulas</>
          )}
        </div>
      </div>
    </Card>
  );
}
