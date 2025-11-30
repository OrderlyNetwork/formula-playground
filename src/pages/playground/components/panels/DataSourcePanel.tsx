import { useState, useMemo } from "react";
import { Card } from "../../../../components/common/Card";
import { Globe, Radio, Search, Database, Braces } from "lucide-react";
import {
  dataSourceManager,
  DataSourceType,
  type ApiDataSourceConfig,
  type WsDataSourceConfig,
  type StaticDataSourceConfig,
  type DataSourceConfig,
} from "../../../../config/dataSources";
import { Input } from "@/components/ui/input";
import { DataSourceDetailDialog } from "./DataSourceDetailDialog";

/**
 * DataSourcePanel component displays available data sources (API and WebSocket)
 * with search functionality and statistics
 */
export function DataSourcePanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataSource, setSelectedDataSource] =
    useState<DataSourceConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /**
   * Filter API data sources based on search query
   * Searches in label, description, method, and url
   */
  const allDataSources = dataSourceManager.getAllConfigs();

  /**
   * Filter API data sources based on search query
   * Searches in label, description, method, and url
   */
  const filteredApiDataSources = useMemo(() => {
    const apiSources = allDataSources.filter(
      (source): source is ApiDataSourceConfig =>
        source.type === DataSourceType.API
    );

    if (!searchQuery.trim()) {
      return apiSources;
    }
    const query = searchQuery.toLowerCase().trim();
    return apiSources.filter((source) => {
      const labelMatch = source.label?.toLowerCase().includes(query);
      const descriptionMatch = source.description
        ?.toLowerCase()
        .includes(query);
      const methodMatch = source.method?.toLowerCase().includes(query);
      const urlMatch = source.url?.toLowerCase().includes(query);
      return labelMatch || descriptionMatch || methodMatch || urlMatch;
    });
  }, [searchQuery, allDataSources]);

  /**
   * Filter Static data sources based on search query
   * Searches in label and description
   */
  const filteredStaticDataSources = useMemo(() => {
    const staticSources = allDataSources.filter(
      (source): source is StaticDataSourceConfig =>
        source.type === DataSourceType.STATIC
    );

    if (!searchQuery.trim()) {
      return staticSources;
    }
    const query = searchQuery.toLowerCase().trim();
    return staticSources.filter((source) => {
      const labelMatch = source.label?.toLowerCase().includes(query);
      const descriptionMatch = source.description
        ?.toLowerCase()
        .includes(query);
      return labelMatch || descriptionMatch;
    });
  }, [searchQuery, allDataSources]);

  /**
   * Filter WebSocket data sources based on search query
   * Searches in label, description, url, and topic
   */
  const filteredWsDataSources = useMemo(() => {
    const wsSources = allDataSources.filter(
      (source): source is WsDataSourceConfig =>
        source.type === DataSourceType.WEBSOCKET
    );

    if (!searchQuery.trim()) {
      return wsSources;
    }
    const query = searchQuery.toLowerCase().trim();
    return wsSources.filter((source) => {
      const labelMatch = source.label?.toLowerCase().includes(query);
      const descriptionMatch = source.description
        ?.toLowerCase()
        .includes(query);
      const urlMatch = source.url?.toLowerCase().includes(query);
      const topicMatch = source.topic?.toLowerCase().includes(query);
      return labelMatch || descriptionMatch || urlMatch || topicMatch;
    });
  }, [searchQuery, allDataSources]);

  // Calculate statistics
  const totalCount = allDataSources.length;
  const filteredCount =
    filteredStaticDataSources.length +
    filteredApiDataSources.length +
    filteredWsDataSources.length;
  const hasResults = filteredCount > 0;

  const handleDataSourceClick = (source: DataSourceConfig) => {
    setSelectedDataSource(source);
    setDialogOpen(true);
  };

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
          {/* Static Data Sources Section */}
          {filteredStaticDataSources.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                <Braces size={14} />
                <span>Static Data</span>
              </div>
              <div className="px-2 space-y-1">
                {filteredStaticDataSources.map((source) => (
                  <div
                    key={source.id}
                    onClick={() => handleDataSourceClick(source)}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {source.label}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        {source.description}
                      </div>
                      {/* <div className="text-[10px] font-mono text-blue-600 mt-0.5">
                        {Object.keys(source.data || {}).length} items
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESTful API Data Sources Section */}
          {filteredApiDataSources.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                <Globe size={14} strokeWidth={1.5} />
                <span>API Data</span>
              </div>
              <div className="px-2 space-y-1">
                {filteredApiDataSources.map((source) => (
                  <div
                    key={source.id}
                    onClick={() => handleDataSourceClick(source)}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white  hover:bg-orange-50 cursor-pointer transition-colors"
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
                    onClick={() => handleDataSourceClick(source)}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white hover:bg-teal-50 cursor-pointer transition-colors"
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

      {/* Detail Dialog */}
      <DataSourceDetailDialog
        dataSource={selectedDataSource}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
