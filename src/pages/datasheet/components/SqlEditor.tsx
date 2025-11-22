"use client";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SqlEditorProps {
  onRun?: () => void;
  onSave?: () => void;
}

export function SqlEditor({ onRun, onSave }: SqlEditorProps) {
  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 p-4 font-mono text-sm overflow-auto">
        <div className="flex">
          <div className="w-8 text-zinc-600 text-right pr-3 select-none">
            1
          </div>
          <div className="flex-1">
            <span className="text-[#c586c0]">select</span>{" "}
            <span className="text-zinc-300">*</span>
          </div>
        </div>
        <div className="flex">
          <div className="w-8 text-zinc-600 text-right pr-3 select-none">
            2
          </div>
          <div className="flex-1 pl-4">
            <span className="text-[#c586c0]">from</span>{" "}
            <span className="text-[#9cdcfe]">film</span>{" "}
            <span className="text-[#9cdcfe]">f</span>
          </div>
        </div>
        <div className="flex">
          <div className="w-8 text-zinc-600 text-right pr-3 select-none">
            3
          </div>
          <div className="flex-1 pl-4">
            <span className="text-[#c586c0]">left outer join</span>{" "}
            <span className="text-[#9cdcfe]">language</span>{" "}
            <span className="text-[#9cdcfe]">l</span>
          </div>
        </div>
        <div className="flex">
          <div className="w-8 text-zinc-600 text-right pr-3 select-none">
            4
          </div>
          <div className="flex-1 pl-6">
            <span className="text-[#c586c0]">on</span>{" "}
            <span className="text-[#9cdcfe]">
              f.original_language_id
            </span>{" "}
            = <span className="text-[#9cdcfe]">l.language_id</span>;
          </div>
        </div>
        <div className="flex bg-[#264f78]/30">
          <div className="w-8 text-zinc-600 text-right pr-3 select-none">
            5
          </div>
          <div className="flex-1">
            <span className="text-[#c586c0]">select</span>{" "}
            <span className="text-zinc-300">*</span>{" "}
            <span className="text-[#c586c0]">from</span>{" "}
            <span className="text-[#9cdcfe]">customer</span>;
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex">
            <div className="w-8 text-zinc-600 text-right pr-3 select-none">
              {i + 6}
            </div>
            <div className="flex-1"></div>
          </div>
        ))}
      </div>

      {/* Floating Actions */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border border-zinc-700"
          onClick={onSave}
        >
          Save
        </Button>
        <div className="flex items-center rounded-md bg-[#f1c40f] text-black hover:bg-[#f39c12]">
          <Button
            size="sm"
            className="h-8 px-3 bg-transparent hover:bg-transparent text-black border-r border-black/10 rounded-r-none font-semibold"
            onClick={onRun}
          >
            Run
          </Button>
          <Button
            size="sm"
            className="h-8 px-1.5 bg-transparent hover:bg-transparent text-black rounded-l-none"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}