import { useState, useMemo } from "react";
import { Card } from "../../../../components/common/Card";
import { Globe, Radio, Search } from "lucide-react";
import { apiDataSources, wsDataSources } from "../../../../config/dataSources";
import { Input } from "@/components/ui/input";

/**
 * DataSourcePanel component displays available data sources (API and WebSocket)
 * with search functionality and statistics
 */
export function DataSourcePanel() {
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Filter API data sources based on search query
   * Searches in label, description, method, and url
   */
  const filteredApiDataSources = useMemo(() => {
    if (!searchQuery.trim()) {
      return apiDataSources;
    }
    const query = searchQuery.toLowerCase().trim();
    return apiDataSources.filter((source) => {
      const labelMatch = source.label.toLowerCase().includes(query);
      const descriptionMatch = source.description.toLowerCase().includes(query);
      const methodMatch = source.method.toLowerCase().includes(query);
      const urlMatch = source.url.toLowerCase().includes(query);
      return labelMatch || descriptionMatch || methodMatch || urlMatch;
    });
  }, [searchQuery]);

  /**
   * Filter WebSocket data sources based on search query
   * Searches in label, description, url, and topic
   */
  const filteredWsDataSources = useMemo(() => {
    if (!searchQuery.trim()) {
      return wsDataSources;
    }
    const query = searchQuery.toLowerCase().trim();
    return wsDataSources.filter((source) => {
      const labelMatch = source.label.toLowerCase().includes(query);
      const descriptionMatch = source.description.toLowerCase().includes(query);
      const urlMatch = source.url.toLowerCase().includes(query);
      const topicMatch = source.topic.toLowerCase().includes(query);
      return labelMatch || descriptionMatch || urlMatch || topicMatch;
    });
  }, [searchQuery]);

  // Calculate statistics
  const totalCount = apiDataSources.length + wsDataSources.length;
  const filteredCount =
    filteredApiDataSources.length + filteredWsDataSources.length;
  const hasResults = filteredCount > 0;

  return (
    <Card title="DataSource" className="flex flex-col h-full">
      {/* Search box */}
      <div className="px-2.5 py-2 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            strokeWidth={1.5}
            size={14}
          />
          <Input
            type="text"
            placeholder="Search data sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3 py-2">
          {/* RESTful API Data Sources Section */}
          {filteredApiDataSources.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                <Globe size={14} strokeWidth={1.5} />
                <span>RESTful API</span>
              </div>
              <div className="px-2">
                {filteredApiDataSources.map((source) => (
                  <div
                    key={source.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/reactflow",
                        JSON.stringify({
                          type: "api",
                          sourceId: source.id,
                          label: source.label,
                          description: source.description,
                          method: source.method,
                          url: source.url,
                        })
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white  hover:bg-orange-50 cursor-move transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {source.label}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        {source.description}
                      </div>
                      <div className="text-[10px] font-mono text-orange-600 mt-0.5">
                        {source.method} {source.url}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WebSocket Data Sources Section */}
          {filteredWsDataSources.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                <Radio size={14} strokeWidth={1.5} />
                <span>WebSocket</span>
              </div>
              <div className="px-2">
                {filteredWsDataSources.map((source) => (
                  <div
                    key={source.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/reactflow",
                        JSON.stringify({
                          type: "websocket",
                          sourceId: source.id,
                          label: source.label,
                          description: source.description,
                          url: source.url,
                          topic: source.topic,
                        })
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white hover:bg-teal-50 cursor-move transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {source.label}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        {source.description}
                      </div>
                      <div className="text-[10px] font-mono text-teal-600 mt-0.5 truncate">
                        {source.topic}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {!hasResults && searchQuery.trim() && (
            <div className="px-2.5 py-4">
              <p className="text-xs text-gray-500">
                No matching data sources found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed footer with hint and statistics */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50">
        {/* Hint message */}
        {hasResults && (
          <div className="text-[11px] text-gray-500 px-2.5 pt-2 pb-1 border-b border-gray-200 bg-white">
            💡 Drag a data source to the canvas to create a node
          </div>
        )}
        {/* Statistics */}
        <div className="px-2.5 py-2 text-xs text-gray-600">
          {searchQuery.trim() ? (
            <>
              Showing {filteredCount} / {totalCount} data sources
            </>
          ) : (
            <>Total {totalCount} data sources</>
          )}
        </div>
      </div>
    </Card>
  );
}
