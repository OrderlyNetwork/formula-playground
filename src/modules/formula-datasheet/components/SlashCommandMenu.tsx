import { memo, useEffect, useRef } from "react";
import { Globe, Radio } from "lucide-react";
import { apiDataSources, wsDataSources } from "@/config/dataSources";
import { cn } from "@/lib/utils";

/**
 * Command item type for slash command menu
 */
export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  type: "api" | "ws";
  icon?: React.ReactNode;
}

/**
 * Build command items from data sources
 * Exported for use in parent components
 */
export function buildSlashCommandItems(): SlashCommandItem[] {
  const items: SlashCommandItem[] = [];

  // Add API data sources
  apiDataSources.forEach((source) => {
    items.push({
      id: source.id,
      label: source.label,
      description: source.description,
      type: "api",
      icon: <Globe className="h-4 w-4" />,
    });
  });

  // Add WebSocket data sources
  wsDataSources.forEach((source) => {
    items.push({
      id: source.id,
      label: source.label,
      description: source.description,
      type: "ws",
      icon: <Radio className="h-4 w-4" />,
    });
  });

  return items;
}

/**
 * Filter commands based on search query
 * Exported for use in parent components
 */
export function filterSlashCommands(
  items: SlashCommandItem[],
  searchQuery: string
): SlashCommandItem[] {
  if (!searchQuery.trim()) {
    return items;
  }

  const query = searchQuery.toLowerCase().trim();
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
  );
}

/**
 * Props for SlashCommandMenu component
 */
interface SlashCommandMenuProps {
  /** Position of the menu (top, left) */
  position: { top: number; left: number };
  /** Currently selected index */
  selectedIndex: number;
  /** Search query to filter commands */
  searchQuery: string;
  /** Callback when a command is selected */
  onSelect: (command: SlashCommandItem) => void;
  /** Callback when menu should be closed */
  onClose: () => void;
  /** Callback when selection changes (for keyboard navigation) */
  onSelectionChange: (index: number) => void;
}

/**
 * SlashCommandMenu - Dropdown menu for slash commands
 * Displays API and WebSocket data sources in a searchable, navigable list
 */
export const SlashCommandMenu = memo(function SlashCommandMenu({
  position,
  selectedIndex,
  searchQuery,
  onSelect,
  onClose,
  onSelectionChange,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const items = buildSlashCommandItems();
  const filteredItems = filterSlashCommands(items, searchQuery);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          onSelectionChange(Math.min(selectedIndex + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          onSelectionChange(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
      }
    };

    if (filteredItems.length > 0) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedIndex, filteredItems, onSelect, onSelectionChange]);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[300px] max-w-[400px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-2 py-1.5 text-sm font-medium border-b">
        Data Sources
      </div>
      {searchQuery && (
        <div className="px-2 py-1 text-xs text-muted-foreground border-b">
          Searching for "{searchQuery}"
        </div>
      )}
      <div className="max-h-[200px] overflow-y-auto">
        {filteredItems.map((item, index) => (
          <div
            key={`${item.type}-${item.id}`}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer",
              "hover:bg-accent hover:text-accent-foreground",
              index === selectedIndex && "bg-accent text-accent-foreground"
            )}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onSelectionChange(index)}
          >
            {item.icon}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {item.description}
              </div>
            </div>
            <div className="text-xs text-muted-foreground uppercase">
              {item.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});