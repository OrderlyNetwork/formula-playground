import React from "react";
import { Lock, Trash2 } from "lucide-react";
import type { ColumnDef } from "@/types/spreadsheet";
import { getStickyStyle } from "./spreadsheetUtils";
import { cn } from "@/lib/utils";

/**
 * Props for SpreadsheetHeader component
 */
interface SpreadsheetHeaderProps {
  columns: ColumnDef[];
  selectedColIds: Set<string>;
  onColHeaderClick: (id: string) => void;
  onDeleteColumn: (id: string) => void;
}

/**
 * Header row component for spreadsheet
 */
const SpreadsheetHeader: React.FC<SpreadsheetHeaderProps> = ({
  columns,
  selectedColIds,
  onColHeaderClick,
  onDeleteColumn,
}) => {
  return (
    <div className="flex sticky top-0 z-40 shadow-sm min-w-max">
      {/* Row Number Header - Sticky Left Corner */}
      <div className="w-10 bg-gray-100 border-r border-b border-gray-300 flex-shrink-0 sticky left-0 z-50"></div>

      {columns.map((col) => {
        const { style, className } = getStickyStyle(col, true);
        const isSelected = selectedColIds.has(col.id);
        return (
          <div
            key={col.id}
            onClick={() => onColHeaderClick(col.id)}
            className={cn(
              `bg-gray-100 px-2 h-[33px] flex items-center justify-between group font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors ${
                isSelected
                  ? "bg-blue-200 text-blue-900 border-blue-300"
                  : "text-gray-600"
              } `,
              "border-r border-b border-gray-300",
              className
            )}
            style={{ width: col.width, minWidth: col.width, ...style }}
          >
            <div className="flex items-center gap-1 truncate">
              {col.locked && <Lock size={10} className="text-gray-400" />}
              <span>{col.title}</span>
            </div>
            {!col.locked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteColumn(col.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                title="Delete Column"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SpreadsheetHeader;
