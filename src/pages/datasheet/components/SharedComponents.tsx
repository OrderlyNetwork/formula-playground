"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Category } from "./constants";

// Icon button component with tooltip
export function IconButton({
  category,
  isActive,
  onClick,
}: {
  category: Category;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "h-8 w-8 hover:bg-zinc-500 transition-colors flex items-center justify-center rounded-md",
              isActive
                ? "bg-zinc-700 text-white border border-zinc-600"
                : "text-zinc-400 hover:text-white"
            )}
            onClick={onClick}
          >
            <Icon className="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{category.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
