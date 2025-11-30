"use client";
import { LayoutGrid, Sigma, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabItem as TabItemType } from "../types";
import { useFormulaTabStore } from "@/store/formulaTabStore";

interface TabBarProps {
  tabs: TabItemType[];
  onCloseTab?: (label: string) => void;
  onTabClick?: (label: string) => void;
}

export function TabBar({ tabs, onCloseTab, onTabClick }: TabBarProps) {
  // Get tab states from store for loading and dirty indicators
  const formulaTabs = useFormulaTabStore((state) => state.tabs);

  // Create a map for quick lookup
  const tabStateMap = new Map(
    formulaTabs.map((tab) => [
      tab.id,
      { isLoading: tab.isLoading, isDirty: tab.isDirty },
    ])
  );

  return (
    <div className="flex items-center bg-gray-100 border-b border-gray-300">
      {tabs.map((tab) => {
        const tabState = tabStateMap.get(tab.id);
        return (
          <TabComponent
            key={tab.id}
            label={tab.label}
            active={tab.active}
            type={tab.type}
            isLoading={tabState?.isLoading}
            isDirty={tabState?.isDirty}
            onClose={() => onCloseTab?.(tab.label)}
            onClick={() => onTabClick?.(tab.label)}
          />
        );
      })}
    </div>
  );
}

interface TabComponentProps {
  label: string;
  active?: boolean;
  type: "code" | "grid";
  isLoading?: boolean;
  isDirty?: boolean;
  onClose?: () => void;
  onClick?: () => void;
}

function TabComponent({
  label,
  active,
  type,
  isLoading,
  isDirty,
  onClose,
  onClick,
}: TabComponentProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-xs border-r border-gray-300 cursor-pointer min-w-[120px] max-w-[200px]",
        active
          ? "bg-white text-gray-900 "
          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
      )}
      onClick={onClick}
    >
      <div className="relative">
        {type === "code" ? (
          <span className="text-purple-600">
            <Sigma size={18} />
          </span>
        ) : (
          <LayoutGrid className="h-3 w-3 text-purple-600" />
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
          </div>
        )}
      </div>
      <span className="truncate flex-1">{label}</span>
      {isDirty && !isLoading && (
        <div
          className="h-1.5 w-1.5 rounded-full bg-orange-500 absolute right-0 top-0"
          title="Unsaved changes"
        />
      )}
      <X
        className={cn(
          "h-4 w-4 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded",
          active && "opacity-100"
        )}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onClose?.();
        }}
      />
    </div>
  );
}
