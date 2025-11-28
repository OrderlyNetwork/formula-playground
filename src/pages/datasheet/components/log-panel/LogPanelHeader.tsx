import React from "react";
import { Button } from "@/components/ui/button";
import { X, Trash2, BrushCleaning } from "lucide-react";

interface LogPanelHeaderProps {
  onClear: () => void;
  onClose: () => void;
}

export const LogPanelHeader: React.FC<LogPanelHeaderProps> = ({
  onClear,
  onClose,
}) => {
  return (
    <div className="px-4 py-2 h-[45px] border-b border-zinc-200 flex items-center justify-between bg-gray-50">
      <h3 className="font-semibold text-sm text-zinc-700">Execution Logs</h3>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-red-600"
          onClick={onClear}
          title="Clear logs"
        >
          <BrushCleaning className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500"
          onClick={onClose}
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
