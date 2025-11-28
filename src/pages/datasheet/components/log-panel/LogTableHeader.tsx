import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const LogTableHeader: React.FC = () => {
  return (
    <TableHeader className="h-[33px]">
      <TableRow>
        <TableHead className="w-[30px] h-[33px]"></TableHead>
        <TableHead className="w-[40px] h-[33px]"></TableHead>
        <TableHead className="w-[80px] h-[33px]">Time</TableHead>
        {/* <TableHead className="w-[60px] h-[33px]">Row</TableHead> */}
        <TableHead className="h-[33px]">Arguments</TableHead>
        <TableHead className="h-[33px]">Result / Error</TableHead>
        <TableHead className="w-[60px] text-right h-[33px]">Dur.</TableHead>
      </TableRow>
    </TableHeader>
  );
};
