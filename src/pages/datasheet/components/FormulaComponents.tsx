"use client";
import { SquareFunction, Code2, Download, X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePinnedStore } from "@/store/usePinnedStore";
import { useNavigate } from "react-router";

export interface Formula {
  id: string;
  name: string;
  tags?: string[];
  creationType: "core" | "sdk" | "external";
  active?: boolean;
}

// Formula section component for grouping formulas
export function FormulaSection({ title, formulas, count }: { title: string; formulas: Formula[]; count: number }) {
  if (formulas.length === 0 && title === "Pinned") return null;

  return (
    <div className={cn("mb-4", title === "Formulas" && "mb-0")}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>{title}</span>
        <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-full">
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
  const { isPinned, togglePin } = usePinnedStore();
  const navigate = useNavigate();
  const pinned = isPinned(formula.id);

  const getCreationIcon = (creationType: string) => {
    switch (creationType) {
      case "parsed":
        return Code2;
      case "imported":
        return Download;
      default:
        return SquareFunction;
    }
  };

  const CreationIcon = getCreationIcon(formula.creationType);

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(formula.id);
  };

  const handleFormulaClick = () => {
    console.log("FormulaItem: Clicked formula:", formula);
    navigate(`/formula/${formula.id}`);
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs",
        formula.active
          ? "bg-[#37373d] text-white"
          : "text-zinc-300 hover:bg-[#2a2d2e] hover:text-zinc-100"
      )}
      onClick={handleFormulaClick}
    >
      <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
        <div className="shrink-0 text-zinc-400">
          <CreationIcon strokeWidth={1.5} size={16} />
        </div>
        <div className="truncate flex-1 min-w-0">{formula.name}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center ml-2 shrink-0">
        {pinned ? (
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