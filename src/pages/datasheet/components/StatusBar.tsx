"use client";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import {
  usePreArgsCheckStore,
  createPreArgsCheckMessageSelector,
} from "@/store/preArgsCheckStore";
import { cn } from "@/lib/utils";
import { Version } from "./version";

export function StatusBar() {
  const activeTab = useFormulaTabStore((state) => state.getActiveTab());
  const formulaId = activeTab?.id;

  // Method 1: Use helper function with useMemo to create a stable selector
  // This ensures re-render only when the specific formulaId's data changes
  // Zustand will only re-render when the selected value actually changes
  const latestMessage = usePreArgsCheckStore(
    useMemo(() => createPreArgsCheckMessageSelector(formulaId), [formulaId])
  );

  return (
    <div className="h-8 bg-gray-100 flex items-center justify-between px-2 text-xs text-white select-none border-t border-gray-200">
      <div className="flex items-center flex-1">
        {latestMessage ? (
          <div
            className={cn(
              "flex items-center gap-1.5",
              latestMessage.message?.level === "warning"
                ? "text-amber-600"
                : "text-red-600"
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="truncate">{latestMessage.message?.message}</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <span>All required fields present</span>
          </div>
        )}
      </div>
      <div className="flex items-center h-full px-2">
        {/* <div className="flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" />
          <span>{executionTime || 0}ms</span>
        </div> */}
        <Version />
      </div>
    </div>
  );
}
