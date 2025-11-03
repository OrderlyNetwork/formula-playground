import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calculator, Database, History, Settings } from "lucide-react";

type CategoryType = "formulas" | "datasource" | "history" | "settings";

interface Category {
  id: CategoryType;
  label: string;
  icon: any;
}

/**
 * All categories displayed in order
 * Settings is placed at the end
 */
const categories: Category[] = [
  {
    id: "formulas",
    label: "Formulas",
    icon: Calculator,
  },
  {
    id: "datasource",
    label: "DataSource",
    icon: Database,
  },
  {
    id: "history",
    label: "History",
    icon: History,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

interface CategorySidebarProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

export function CategorySidebar({
  activeCategory,
  onCategoryChange,
}: CategorySidebarProps) {
  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = activeCategory === category.id;

        return (
          <TooltipProvider key={category.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onCategoryChange(category.id)}
                  className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  aria-label={category.label}
                >
                  <Icon size={24} strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {category.label}

                <TooltipArrow />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
