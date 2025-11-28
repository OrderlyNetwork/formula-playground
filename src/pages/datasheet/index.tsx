"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Database, Settings, Sigma, Play } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="space-y-2">
          {/* Combined icon: Sigma with Play badge at bottom right - Purple brand color theme */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            {/* Main Sigma icon representing formulas - Primary purple */}
            <Sigma className="h-16 w-16 text-purple-600" strokeWidth={2.5} />
            {/* Small Play badge at bottom right corner - Accent purple/pink */}
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md ring-2 ring-purple-100">
              <Play className="h-5 w-5 text-purple-500 fill-purple-500" />
            </div>
          </div>
          <h2 className="text-2xl font-mono text-zinc-900">
            Formula Playground
          </h2>
          <p className="text-zinc-500">
            Welcome to the Orderly SDK formula verification tool
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-zinc-50 border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                Test Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500 text-left">
                Select a formula from the sidebar to start testing and verifying
                calculations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-50 border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-green-400" />
                View History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500 text-left">
                Access your formula execution history and compare different
                engine results
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-50 border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                Configure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500 text-left">
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
  return <EmptyState />;
}
