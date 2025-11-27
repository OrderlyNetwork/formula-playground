import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * Hook to manage spreadsheet virtualization
 */
export const useSpreadsheetVirtualization = (rowIds: string[]) => {
  // Container ref for virtualizer
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual row scrolling
  const rowVirtualizer = useVirtualizer({
    count: rowIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Row height
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  return {
    parentRef,
    rowVirtualizer,
  };
};
