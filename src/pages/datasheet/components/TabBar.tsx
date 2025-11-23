"use client";
import { LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabItem as TabItemType } from "../types";

interface TabBarProps {
  tabs: TabItemType[];
  onCloseTab?: (label: string) => void;
  onTabClick?: (label: string) => void;
}

export function TabBar({ tabs, onCloseTab, onTabClick }: TabBarProps) {
  return (
    <div className="flex items-center bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <TabComponent
          key={tab.label}
          label={tab.label}
          active={tab.active}
          type={tab.type}
          onClose={() => onCloseTab?.(tab.label)}
          onClick={() => onTabClick?.(tab.label)}
        />
      ))}
    </div>
  );
}

interface TabComponentProps {
  label: string;
  active?: boolean;
  type: "code" | "grid";
  onClose?: () => void;
  onClick?: () => void;
}

function TabComponent({
  label,
  active,
  type,
  onClose,
  onClick,
}: TabComponentProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-xs border-r border-gray-200 cursor-pointer min-w-[120px] max-w-[200px]",
        active
          ? "bg-gray-50 text-gray-900 border-t-2 border-t-blue-500"
          : "bg-white text-gray-600 hover:bg-gray-50"
      )}
      onClick={onClick}
    >
      {type === "code" ? (
        <span className="text-purple-600 font-mono text-[10px]">&lt;&gt;</span>
      ) : (
        <LayoutGrid className="h-3 w-3 text-blue-600" />
      )}
      <span className="truncate flex-1">{label}</span>
      <X
        className={cn(
          "h-3 w-3 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded",
          active && "opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
      />
    </div>
  );
}
