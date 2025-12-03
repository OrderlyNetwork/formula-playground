import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useState } from "react";
export const EditorMode = () => {
  const { mode, setMode } = useAppStore();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-full hover:bg-gray-200 px-2 text-gray-600">{`Mode: ${
          mode.charAt(0).toUpperCase() + mode.slice(1)
        }`}</button>
      </PopoverTrigger>
      <PopoverContent
        className="w-30 shadow-none rounded text-xs p-2 border border-purple-500"
        align="start"
      >
        <div className="flex flex-col justify-start items-start">
          <button
            className={cn(
              "hover:text-gray-800 px-2 text-gray-600 w-full p-1 text-left",
              mode === "playground" ? "bg-gray-100" : ""
            )}
            onClick={() => {
              setMode("playground");
              setOpen(false);
            }}
          >
            Playground
          </button>
          <button
            className={cn(
              "hover:text-gray-800 px-2 text-gray-600 w-full p-1 text-left",
              mode === "development" ? "bg-gray-100" : ""
            )}
            onClick={() => {
              setMode("development");
              setOpen(false);
            }}
          >
            Development
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
