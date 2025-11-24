/**
 * EmptyState Component
 * Displays messages when there's no data or no formula selected
 */

import React from "react";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  className?: string;
}

/**
 * Empty state for no formula selected
 */
export const NoFormulaState: React.FC<EmptyStateProps> = ({ className }) => {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-center text-gray-500">
        Select a formula to view and edit its parameters in a tabular format.
      </div>
    </Card>
  );
};

/**
 * Empty state for no rows
 */
export const NoRowsState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      No test cases. Click "Add Row" to create your first test case.
    </div>
  );
};

