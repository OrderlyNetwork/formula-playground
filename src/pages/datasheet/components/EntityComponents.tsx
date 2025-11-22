"use client";
import { Table2, LayoutGrid, X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table } from "../types";

// Entity section component for grouping tables
export function EntitySection({ title, tables, count }: { title: string; tables: Table[]; count: number }) {
  if (tables.length === 0 && title === "Pinned") return null;

  return (
    <div className={cn("mb-4", title === "Entities" && "mb-0")}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>{title}</span>
        <span className="bg-zinc-800 text-zinc-400 px-1.5 rounded-full">
          {count}
        </span>
      </div>
      {tables.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {tables.map((table) => (
            <EntityItem key={`${title}-${table.name}`} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}

// Entity item component
export function EntityItem({ table }: { table: Table }) {
  const TableIcon = table.type === "table" ? Table2 : LayoutGrid;

  return (
    <div
      className={cn(
        "group flex items-center justify-between px-2 py-1 rounded cursor-pointer text-sm",
        table.active
          ? "bg-[#37373d] text-white"
          : "text-zinc-400 hover:bg-[#2a2d2e] hover:text-zinc-200"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <TableIcon className={cn(
          "h-3.5 w-3.5 shrink-0",
          table.type === "table" ? "text-yellow-500" : "text-blue-400"
        )} />
        <span className="truncate">{table.name}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center">
        {table.active && <Pin className="h-3 w-3 text-yellow-500 -rotate-45" />}
        {!table.active && (
          <X className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
        )}
      </div>
    </div>
  );
}