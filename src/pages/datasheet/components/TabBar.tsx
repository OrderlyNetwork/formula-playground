"use client";
import { LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TabItem as TabItemType } from "../types";

interface TabBarProps {
  tabs: TabItemType[];
  onAddTab?: () => void;
  onCloseTab?: (label: string) => void;
}

export function TabBar({ tabs, onAddTab, onCloseTab }: TabBarProps) {
  return (
    <div className="flex items-center bg-[#181818] border-b border-zinc-800">
      {tabs.map((tab) => (
        <TabComponent
          key={tab.label}
          label={tab.label}
          active={tab.active}
          type={tab.type}
          onClose={() => onCloseTab?.(tab.label)}
        />
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none text-zinc-400 hover:text-white hover:bg-zinc-800"
        onClick={onAddTab}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface TabComponentProps {
  label: string;
  active?: boolean;
  type: "code" | "grid";
  onClose?: () => void;
}

function TabComponent({
  label,
  active,
  type,
  onClose,
}: TabComponentProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-xs border-r border-zinc-800 cursor-pointer min-w-[120px] max-w-[200px]",
        active
          ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#f1c40f]"
          : "bg-[#2d2d2d] text-zinc-400 hover:bg-[#1e1e1e]"
      )}
    >
      {type === "code" ? (
        <span className="text-purple-400 font-mono text-[10px]">&lt;&gt;</span>
      ) : (
        <LayoutGrid className="h-3 w-3 text-blue-400" />
      )}
      <span className="truncate flex-1">{label}</span>
      <X
        className={cn(
          "h-3 w-3 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded",
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