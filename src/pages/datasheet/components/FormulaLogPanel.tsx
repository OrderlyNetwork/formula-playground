import React, { useState } from "react";
import { useFormulaLogStore } from "@/store/formulaLogStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { X, Trash2, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const FormulaLogPanel: React.FC = () => {
    const { logs, isOpen, togglePanel, clearLogs } = useFormulaLogStore();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    if (!isOpen) {
        return null;
    }

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    return (
        <div className="w-full bg-white flex flex-col h-full shadow-sm relative z-10">
            <div className="px-4 py-2 h-[45px] border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <h3 className="font-semibold text-sm text-zinc-700">Execution Logs</h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={clearLogs}
                        title="Clear logs"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500"
                        onClick={togglePanel}
                        title="Close panel"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                {logs.length === 0 ? (
                    <div className="text-center text-zinc-400 text-sm py-8">
                        No execution logs yet
                    </div>
                ) : (
                    <div >
                        <Table>
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
                            <TableBody>
                                {logs.map((log) => {
                                    const isExpanded = expandedRows.has(log.id);
                                    return (
                                        <React.Fragment key={log.id}>
                                            <TableRow
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    log.error ? "bg-red-50 hover:bg-red-100" : "hover:bg-zinc-50",
                                                    isExpanded ? "bg-zinc-50" : ""
                                                )}
                                                onClick={() => toggleRow(log.id)}
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
                                                <TableCell className="py-4 text-xs font-medium">
                                                    {log.rowId}
                                                </TableCell>
                                                <TableCell className="py-4 max-w-[150px]">
                                                    <div className="text-xs font-mono text-zinc-600 truncate">
                                                        {JSON.stringify(log.inputs)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 max-w-[150px]">
                                                    <div
                                                        className={cn(
                                                            "text-xs font-mono truncate",
                                                            log.error ? "text-red-600" : "text-green-600"
                                                        )}
                                                    >
                                                        {log.error || JSON.stringify(log.result)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs text-zinc-500 text-right whitespace-nowrap">
                                                    {log.executionTime}ms
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow className={cn(
                                                    "hover:bg-transparent",
                                                    log.error ? "bg-red-50" : "bg-zinc-50"
                                                )}>
                                                    <TableCell colSpan={7} className="p-4  border-b">
                                                        <div className="space-y-2">
                                                            <div className="space-y-1">
                                                                <div className="text-xs font-semibold text-zinc-500">Inputs</div>
                                                                <div className="bg-white border rounded p-2">
                                                                    <pre className="text-xs font-mono text-zinc-700">
                                                                        {JSON.stringify(log.inputs, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs font-semibold text-zinc-500">
                                                                    {log.error ? "Error" : "Result"}
                                                                </div>
                                                                <div className={cn(
                                                                    "bg-white border rounded p-2",
                                                                    log.error ? "border-red-200 bg-red-50" : ""
                                                                )}>
                                                                    <pre className={cn(
                                                                        "text-xs font-mono",
                                                                        log.error ? "text-red-600" : "text-green-600"
                                                                    )}>
                                                                        {log.error || JSON.stringify(log.result, null, 2)}
                                                                    </pre>
                                                                    {log.error && log.stack && (
                                                                        <div className="mt-2 pt-2 border-t border-red-200">
                                                                            <div className="text-[10px] font-semibold text-red-800 mb-1">Stack Trace:</div>
                                                                            <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap">
                                                                                {log.stack}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};
