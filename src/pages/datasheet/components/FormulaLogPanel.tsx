import React, { useState } from "react";
import { useFormulaLogStore } from "@/store/formulaLogStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody } from "@/components/ui/table";
import { LogPanelHeader } from "./log-panel/LogPanelHeader";
import { LogTableHeader } from "./log-panel/LogTableHeader";
import { LogRow } from "./log-panel/LogRow";
import { ExpandedLogDetails } from "./log-panel/ExpandedLogDetails";
import { EmptyLogState } from "./log-panel/EmptyLogState";

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
            <LogPanelHeader onClear={clearLogs} onClose={togglePanel} />

            <ScrollArea className="flex-1">
                {logs.length === 0 ? (
                    <EmptyLogState />
                ) : (
                    <Table>
                        <LogTableHeader />
                        <TableBody>
                            {logs.map((log) => {
                                const isExpanded = expandedRows.has(log.id);
                                return (
                                    <React.Fragment key={log.id}>
                                        <LogRow
                                            log={log}
                                            isExpanded={isExpanded}
                                            onToggle={() => toggleRow(log.id)}
                                        />
                                        {isExpanded && (
                                            <ExpandedLogDetails
                                                log={log}
                                                isError={!!log.error}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </ScrollArea>
        </div>
    );
};
