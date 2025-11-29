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
        <button className="h-full hover:bg-gray-200 px-2 text-gray-600">{`Mode: ${mode}`}</button>
      </PopoverTrigger>
      <PopoverContent
        className="w-30 shadow-none rounded text-xs p-2 border border-purple-500"
        align="start"
      >
        <div className="flex flex-col justify-start items-start">
          <button
            className={cn(
              "hover:text-gray-800 px-2 text-gray-600 w-full p-1 text-left",
              mode === "Playground" ? "bg-gray-100" : ""
            )}
            onClick={() => {
              setMode("Playground");
              setOpen(false);
            }}
          >
            Playground
          </button>
          <button
            className={cn(
              "hover:text-gray-800 px-2 text-gray-600 w-full p-1 text-left",
              mode === "Development" ? "bg-gray-100" : ""
            )}
            onClick={() => {
              setMode("Development");
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
