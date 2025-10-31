import { useState } from "react";
import {
  FormulasPanel,
  DataSourcePanel,
  HistoryPanel,
  CategorySidebar,
} from "./panels";

/**
 * Category types for the left panel navigation
 */
type CategoryType = "formulas" | "datasource" | "history";

export function LeftPanel() {
  // State for active category
  const [activeCategory, setActiveCategory] =
    useState<CategoryType>("formulas");

  // State for source code dialog
  const [sourceCodeDialogOpen, setSourceCodeDialogOpen] = useState(false);

  /**
   * Render content based on active category
   */
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "formulas":
        return (
          <FormulasPanel
            sourceCodeDialogOpen={sourceCodeDialogOpen}
            setSourceCodeDialogOpen={setSourceCodeDialogOpen}
          />
        );

      case "datasource":
        return <DataSourcePanel />;

      case "history":
        return <HistoryPanel />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left sidebar: Category icons */}
      <CategorySidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Right content area */}
      <div className="flex-1 overflow-y-auto">{renderCategoryContent()}</div>
    </div>
  );
}
