import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { sanitizeJsonStringify, sanitizeStackTrace } from "@/utils/sanitization";
import { cn } from "@/lib/utils";
import type { FormulaExecutionLog } from "@/store/formulaLogStore";

interface ExpandedLogDetailsProps {
    log: FormulaExecutionLog;
    isError: boolean;
}

export const ExpandedLogDetails: React.FC<ExpandedLogDetailsProps> = ({ log, isError }) => {
    return (
        <TableRow className={cn(
            "hover:bg-transparent",
            isError ? "bg-red-50" : "bg-zinc-50"
        )}>
            <TableCell colSpan={7} className="p-4 border-b">
                <div className="space-y-2">
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500">Inputs</div>
                        <div className="bg-white border rounded p-2">
                            <pre className="text-xs font-mono text-zinc-700">
                                {sanitizeJsonStringify(log.inputs, null, 2)}
                            </pre>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500">
                            {isError ? "Error" : "Result"}
                        </div>
                        <div className={cn(
                            "bg-white border rounded p-2",
                            isError ? "border-red-200 bg-red-50" : ""
                        )}>
                            <pre className={cn(
                                "text-xs font-mono",
                                isError ? "text-red-600" : "text-green-600"
                            )}>
                                {log.error || sanitizeJsonStringify(log.result, null, 2)}
                            </pre>
                            {isError && log.stack && (
                                <div className="mt-2 pt-2 border-t border-red-200">
                                    <div className="text-[10px] font-semibold text-red-800 mb-1">Stack Trace:</div>
                                    <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap">
                                        {sanitizeStackTrace(log.stack)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
};
