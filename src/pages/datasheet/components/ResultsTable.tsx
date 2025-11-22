"use client";
import type { QueryResult } from "../types";

interface ResultsTableProps {
  results: QueryResult[];
  tableName?: string;
}

export function ResultsTable({ results }: ResultsTableProps) {
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center px-4 py-1 bg-[#1e1e1e] border-b border-zinc-800 text-xs text-zinc-400">
        {/* Table Header Placeholder if needed, otherwise just the grid */}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#181818] sticky top-0 z-10">
            <tr>
              <th className="p-2 font-medium text-zinc-300 border-b border-zinc-800 w-16">
                film_id
              </th>
              <th className="p-2 font-medium text-zinc-300 border-b border-zinc-800 w-48">
                title
              </th>
              <th className="p-2 font-medium text-zinc-300 border-b border-zinc-800">
                description
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {results.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#2a2d2e] group cursor-pointer border-b border-zinc-800/50"
              >
                <td className="p-2 text-zinc-400 border-r border-zinc-800/50">
                  {row.id}
                </td>
                <td className="p-2 text-zinc-300 border-r border-zinc-800/50">
                  {row.title}
                </td>
                <td className="p-2 text-zinc-400 truncate max-w-md">
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}