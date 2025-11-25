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
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 hover:bg-zinc-800 transition-colors",
              isActive
                ? "bg-zinc-700 text-white border border-zinc-600"
                : "text-zinc-400 hover:text-white"
            )}
            onClick={onClick}
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{category.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
