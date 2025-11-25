"use client";
import { Table2, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusBarProps {
  connection?: string;
  database?: string;
  result?: string;
  rowCount?: number;
  executionTime?: number;
  onDownload?: () => void;
}

export function StatusBar({
  connection = "[DEV] local sqlite",
  database = "sqlite",
  result = "Result 1",
  rowCount = 1000,
  executionTime = 45,
  onDownload,
}: StatusBarProps) {
  return (
    <div className="h-8 bg-gray-100 flex items-center justify-between px-2 text-xs text-white select-none border-t border-gray-200">
      <div className="flex items-center h-full">
        <div className="flex items-center gap-2 px-2 h-full bg-[#007acc] hover:bg-white/10 cursor-pointer">
          <span className="font-bold">{connection}</span>
        </div>
        <div className="flex items-center gap-2 px-2 h-full bg-gray-200 text-zinc-400 hover:bg-white/10 cursor-pointer ml-0.5">
          <span>{database}</span>
        </div>
        <div className="flex items-center gap-2 px-2 h-full bg-gray-200 text-zinc-400 hover:bg-white/10 cursor-pointer ml-0.5">
          <span>{result}</span>
          <ChevronDown className="h-3 w-3" />
        </div>
        <div className="flex items-center gap-4 px-4 h-full bg-gray-200 text-zinc-400 ml-0.5">
          <div className="flex items-center gap-1.5">
            <Table2 className="h-3 w-3" />
            <span>{rowCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-500">≡</span>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            <span>{executionTime || 0}ms</span>
          </div>
        </div>
      </div>
      <div className="flex items-center h-full bg-gray-200 ml-0.5 px-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700"
          onClick={onDownload}
        >
          Download
        </Button>
      </div>
    </div>
  );
}
