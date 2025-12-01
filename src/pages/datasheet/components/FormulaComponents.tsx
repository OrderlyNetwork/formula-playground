"use client";
import { Code2, Download, Pin, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePinnedStore, selectIsPinned } from "@/store/usePinnedStore";
import { useNavigate, useMatch } from "react-router";
import { useFormulaTabStore } from "@/store/formulaTabStore";

export interface Formula {
  id: string;
  name: string;
  tags?: string[];
  creationType: "core" | "sdk" | "external";
  active?: boolean;
}

// Formula section component for grouping formulas
export function FormulaSection({
  title,
  formulas,
  count,
}: {
  title: string;
  formulas: Formula[];
  count: number;
}) {
  if (formulas.length === 0 && title === "Pinned") return null;

  return (
    <div className={cn("mb-4", title === "Formulas" && "mb-0")}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>{title}</span>
        <span className="bg-zinc-800 text-zinc-200 px-1.5 rounded-full">
          {count}
        </span>
      </div>
      {formulas.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {formulas.map((formula) => (
            <FormulaItem key={`${title}-${formula.id}`} formula={formula} />
          ))}
        </div>
      )}
    </div>
  );
}

// Formula item component
export function FormulaItem({ formula }: { formula: Formula }) {
  // ✅ Reactive: Subscribe directly to pinned state for this formula
  const isPinned = usePinnedStore(selectIsPinned(formula.id));
  const togglePin = usePinnedStore((state) => state.togglePin);
  const { addTab, activeTabId } = useFormulaTabStore();
  const navigate = useNavigate();
  const isFormulaDetailsPage = useMatch("/formula/:id");

  // Check if this formula is currently active based on activeTabId from store
  // (since URL navigation is now handled silently via pushState)
  const isActive = activeTabId === formula.id;

  const getCreationIcon = (creationType: string) => {
    switch (creationType) {
      case "parsed":
        return Code2;
      case "imported":
        return Download;
      default:
        return Sigma;
    }
  };

  const CreationIcon = getCreationIcon(formula.creationType);

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(formula.id);
  };

  const handleFormulaClick = () => {
    console.log("FormulaItem: Clicked formula:", formula);
    // Add formula to tab store
    addTab(formula.id, formula.name, "code");

    if (isFormulaDetailsPage) {
      // If already on details page, just update store (silent URL update handled in details.tsx)
      useFormulaTabStore.getState().setActiveTab(formula.id);
    } else {
      // If on another page (e.g. dashboard, test page), we must navigate
      navigate(`/formula/${formula.id}`);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[13px]",
        isActive ? "bg-gray-100 " : "hover:bg-gray-200 text-gray-900"
      )}
      onClick={handleFormulaClick}
    >
      <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
        <div
          className={cn(
            "shrink-0",
            isActive ? "text-gray-900" : "text-zinc-400"
          )}
        >
          {/* <Sigma size={16} /> */}
          <CreationIcon size={16} />
        </div>
        <div className={cn("truncate flex-1 min-w-0",isActive?'font-semibold':'')}>{formula.name}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center ml-2 shrink-0">
        {isPinned ? (
          <Pin
            className="h-3 w-3 text-yellow-500 -rotate-45 cursor-pointer hover:text-yellow-400"
            onClick={handlePinToggle}
          />
        ) : (
          <Pin
            className="h-3 w-3 text-zinc-500 hover:text-zinc-300 cursor-pointer hover:-rotate-12 transition-transform"
            onClick={handlePinToggle}
          />
        )}
      </div>
    </div>
  );
}
