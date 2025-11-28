import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { sanitizeJsonStringify } from "@/utils/sanitization";
import {
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormulaExecutionLog } from "@/store/formulaLogStore";

interface LogRowProps {
  log: FormulaExecutionLog;
  isExpanded: boolean;
  onToggle: () => void;
}

export const LogRow: React.FC<LogRowProps> = ({
  log,
  isExpanded,
  onToggle,
}) => {
  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        log.error ? "bg-red-50 hover:bg-red-100" : "hover:bg-zinc-50",
        isExpanded ? "bg-zinc-50" : ""
      )}
      onClick={onToggle}
    >
      <TableCell className="py-4 pl-2 pr-0">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </TableCell>
      <TableCell className="py-4">
        {log.error ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
      </TableCell>
      <TableCell className="py-4 text-xs text-zinc-500 whitespace-nowrap">
        {new Date(log.timestamp).toLocaleTimeString()}
      </TableCell>
      {/* <TableCell className="py-4 text-xs font-medium">
                {log.rowId}
            </TableCell> */}
      <TableCell className="py-4 max-w-[150px]">
        <div className="text-xs font-mono text-zinc-600 truncate">
          {sanitizeJsonStringify(log.inputs)}
        </div>
      </TableCell>
      <TableCell className="py-4 max-w-[150px]">
        <div
          className={cn(
            "text-xs font-mono truncate",
            log.error ? "text-red-600" : "text-green-600"
          )}
        >
          {log.error || sanitizeJsonStringify(log.result)}
        </div>
      </TableCell>
      <TableCell className="py-4 text-xs text-zinc-500 text-right whitespace-nowrap">
        {log.executionTime}ms
      </TableCell>
    </TableRow>
  );
};
