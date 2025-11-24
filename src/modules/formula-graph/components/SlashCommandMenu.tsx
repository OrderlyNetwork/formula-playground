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
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const allCommands = buildSlashCommandItems();
  const filteredCommands = filterSlashCommands(allCommands, searchQuery);

  // Note: Keyboard navigation is handled by parent component (TypeAwareInput)
  // This component only handles mouse interactions

  /**
   * Scroll selected item into view
   */
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  /**
   * Group commands by type
   */
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.type]) {
        acc[cmd.type] = [];
      }
      acc[cmd.type].push(cmd);
      return acc;
    },
    {} as Record<"api" | "ws", SlashCommandItem[]>
  );

  // Flatten grouped commands for indexing
  const flatCommands: SlashCommandItem[] = [];
  if (groupedCommands.api) flatCommands.push(...groupedCommands.api);
  if (groupedCommands.ws) flatCommands.push(...groupedCommands.ws);

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[200px] max-w-[300px] max-h-[300px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          No commands found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] max-w-[300px] max-h-[300px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* API Section */}
      {groupedCommands.api && groupedCommands.api.length > 0 && (
        <div className="mb-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            API
          </div>
          {groupedCommands.api.map((cmd, idx) => {
            const flatIndex = flatCommands.indexOf(cmd);
            const isSelected = flatIndex === selectedIndex;
            return (
              <div
                key={`api-${cmd.id}`}
                ref={isSelected ? selectedItemRef : null}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() => onSelectionChange(flatIndex)}
              >
                <div className="mr-2 flex-shrink-0">{cmd.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{cmd.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {cmd.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WebSocket Section */}
      {groupedCommands.ws && groupedCommands.ws.length > 0 && (
        <div>
          {groupedCommands.api && groupedCommands.api.length > 0 && (
            <div className="h-px bg-muted my-1" />
          )}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            WebSocket
          </div>
          {groupedCommands.ws.map((cmd, idx) => {
            const flatIndex = flatCommands.indexOf(cmd);
            const isSelected = flatIndex === selectedIndex;
            return (
              <div
                key={`ws-${cmd.id}`}
                ref={isSelected ? selectedItemRef : null}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() => onSelectionChange(flatIndex)}
              >
                <div className="mr-2 flex-shrink-0">{cmd.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{cmd.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {cmd.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

