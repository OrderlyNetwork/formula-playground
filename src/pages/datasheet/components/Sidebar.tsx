"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Table } from "../types";
import type { ActivePanel } from "./constants";
import { categories } from "./constants";
import { PANEL_REGISTRY } from "./panelRegistry";
import { IconButton } from "./SharedComponents";

interface SidebarProps {
  isOpen: boolean;
  tables: Table[];
  onToggle?: () => void;
}

export function Sidebar({ isOpen, tables, onToggle }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>('formulas');

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const ActivePanelComponent = useMemo(() => {
    if (!activePanel) return null;

    const panelConfig = PANEL_REGISTRY[activePanel];
    if (!panelConfig) return null;

    const Component = panelConfig.component;
    return <Component tables={tables} />;
  }, [activePanel, tables]);

  return (
    <div className="flex">
      {/* Icon Strip */}
      <div className="flex w-12 flex-col items-center py-4 gap-2 bg-[#181818] border-r border-zinc-800 shrink-0">
        {categories.map((category) => (
          <IconButton
            key={category.id}
            category={category}
            isActive={activePanel === category.id}
            onClick={() => togglePanel(category.id)}
          />
        ))}
      </div>

      {/* Sidebar Content */}
      <div className={cn(
        "bg-[#181818] transition-all duration-200",
        isOpen && activePanel ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-2 overflow-hidden"
      )}>
        <div className="flex flex-1 flex-col min-w-0 h-full">
          {ActivePanelComponent}
        </div>
      </div>
    </div>
  );
}