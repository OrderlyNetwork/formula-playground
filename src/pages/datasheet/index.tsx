"use client";
import { useLocation } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Database, Settings } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Database className="h-16 w-16 mx-auto text-zinc-500" />
          <h2 className="text-2xl font-semibold text-zinc-300">
            Formula Playground
          </h2>
          <p className="text-zinc-500">
            Welcome to the cryptocurrency trading formula verification tool
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-[#2a2a2a] border-zinc-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                Test Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">
                Select a formula from the sidebar to start testing and verifying
                calculations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#2a2a2a] border-zinc-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Database className="h-4 w-4 text-green-400" />
                View History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">
                Access your formula execution history and compare different
                engine results
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#2a2a2a] border-zinc-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                Configure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">
                Adjust input parameters and test various scenarios with
                different values
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4">
          <p className="text-xs text-zinc-600">
            Get started by selecting a formula from the sidebar or navigate to a
            specific formula using the formula explorer
          </p>
        </div>
      </div>
    </div>
  );
}

export function DatabaseDashboard() {
  const location = useLocation();

  // If we should show empty state, return it directly
  // if (shouldShowEmptyState) {
  //   return <EmptyState />;
  // }

  return <EmptyState />;
}
