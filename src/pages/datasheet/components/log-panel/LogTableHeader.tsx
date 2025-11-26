import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const LogTableHeader: React.FC = () => {
    return (
        <TableHeader>
            <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">Time</TableHead>
                <TableHead className="w-[60px]">Row</TableHead>
                <TableHead>Inputs</TableHead>
                <TableHead>Result / Error</TableHead>
                <TableHead className="w-[60px] text-right">Dur.</TableHead>
            </TableRow>
        </TableHeader>
    );
};
