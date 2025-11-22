"use client";
import { useMemo } from "react";
import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Table } from "../types";
import { DataSourcePanel as BaseDataSourcePanel } from "@/pages/playground/components/panels";
import { EntitySection } from "./EntityComponents";

export function DataSourcePanelWrapper({ tables = [] }: { tables?: Table[] }) {
  const { pinnedTables, unpinnedTables } = useMemo(
    () => ({
      pinnedTables: tables.filter((t) => t.pinned),
      unpinnedTables: tables.filter((t) => !t.pinned),
    }),
    [tables]
  );

  return (
    <>
      <BaseDataSourcePanel />
      {/* Table content overlaid */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#181818] border-t border-zinc-800">
        {/* Connection Header */}
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Filter"
              className="h-8 pl-8 bg-[#252526] border-zinc-700 text-xs text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Entity Lists */}
        <ScrollArea className="max-h-48">
          <div className="p-2">
            <EntitySection
              title="Pinned"
              tables={pinnedTables}
              count={pinnedTables.length}
            />
            <EntitySection
              title="Entities"
              tables={unpinnedTables}
              count={tables.length}
            />
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
