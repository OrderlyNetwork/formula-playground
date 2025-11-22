"use client";
import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormulaSection, type Formula } from "./FormulaComponents";
import { usePinnedStore } from "@/store/usePinnedStore";
import { useFormulaStore } from "@/store/formulaStore";

export function LocalFormulasPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isPinned } = usePinnedStore();
  const { formulaDefinitions, loadFormulasFromAllSources } = useFormulaStore();

  // Load formulas on component mount
  useEffect(() => {
    console.log("LocalFormulasPanel: Loading formulas...");
    loadFormulasFromAllSources();
  }, [loadFormulasFromAllSources]);

  // Debug: log formula definitions when they change
  useEffect(() => {
    console.log("LocalFormulasPanel: Formula definitions loaded:", formulaDefinitions);
  }, [formulaDefinitions]);

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
        pinnedFormulas: filtered.filter((f) => isPinned(f.id)),
        unpinnedFormulas: filtered.filter((f) => !isPinned(f.id)),
        totalFilteredFormulas: filtered.length,
      };
    }, [searchQuery, isPinned, formulaDefinitions]);

  return (
    <div className="flex flex-col h-full bg-[#181818]">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="font-medium text-zinc-300 text-sm mb-3">Formulas</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Filter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 bg-[#252526] border-zinc-700 text-xs text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Formula Lists */}
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
      <div className="px-2.5 py-2 border-t border-zinc-800 bg-[#1e1e1e] text-xs text-zinc-400 shrink-0">
        {searchQuery.trim() ? (
          <>
            Showing {totalFilteredFormulas} / {formulaDefinitions.length} formulas
          </>
        ) : (
          <>Total {formulaDefinitions.length} formulas</>
        )}
      </div>
    </div>
  );
}
