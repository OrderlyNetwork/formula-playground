"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ActivePanel } from "./constants";
import { categories } from "./constants";
import { PANEL_REGISTRY } from "./panelRegistry";
import { IconButton } from "./SharedComponents";

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("formulas");

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const ActivePanelComponent = useMemo(() => {
    if (!activePanel) return null;

    const panelConfig = PANEL_REGISTRY[activePanel];
    if (!panelConfig) return null;

    const Component = panelConfig.component;
    return <Component />;
  }, [activePanel]);

  return (
    <div className="flex">
      {/* Icon Strip */}
      <div className="flex flex-col items-center">
        {/* <div className="flex items-center justify-center py-3">
          <a href="/">
            <Logo />
          </a>
        </div> */}
        <div className="flex w-14 flex-col items-center py-4 gap-3 bg-gray-50 border-r border-gray-200 shrink-0 flex-1">
          {categories.map((category) => (
            <IconButton
              key={category.id}
              category={category}
              isActive={activePanel === category.id}
              onClick={() => togglePanel(category.id)}
            />
          ))}
        </div>
      </div>

      {/* Sidebar Content */}
      <div
        className={cn(
          "bg-gray-50 transition-all duration-200 border-r border-gray-200",
          isOpen && activePanel
            ? "w-64 opacity-100 translate-x-0"
            : "w-0 opacity-0 -translate-x-2 overflow-hidden"
        )}
      >
        <div className="flex flex-1 flex-col min-w-0 h-full">
          {ActivePanelComponent}
        </div>
      </div>
    </div>
  );
}
