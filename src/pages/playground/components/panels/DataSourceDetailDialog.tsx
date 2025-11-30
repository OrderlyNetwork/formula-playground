import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Globe, Radio, Database } from "lucide-react";
import {
  type ApiDataSourceConfig,
  type WsDataSourceConfig,
  type StaticDataSourceConfig,
  type DataSourceConfig,
  DataSourceType,
  dataSourceManager,
} from "@/config/dataSources";
import { useDataSourceStore } from "@/store/dataSourceStore";
import Editor from "@monaco-editor/react";

interface DataSourceDetailDialogProps {
  dataSource: DataSourceConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataSourceDetailDialog({
  dataSource,
  open,
  onOpenChange,
}: DataSourceDetailDialogProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dataSourceData = useDataSourceStore((state) => state.dataSourceData);

  if (!dataSource) return null;

  const data = dataSourceData[dataSource.id] || [];

  const handleRefresh = async () => {
    if (dataSource.type !== DataSourceType.API) return;

    setIsRefreshing(true);
    try {
      await dataSourceManager.fetch(dataSource.id);
    } catch (error) {
      console.error("Failed to refresh data source:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isApiSource = dataSource.type === DataSourceType.API;
  const isStaticSource = dataSource.type === DataSourceType.STATIC;
  const apiSource = dataSource as ApiDataSourceConfig;
  const wsSource = dataSource as WsDataSourceConfig;
  const staticSource = dataSource as StaticDataSourceConfig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        {/* <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dataSource.type === DataSourceType.API ? (
              <Globe size={18} className="text-orange-600" />
            ) : dataSource.type === DataSourceType.WEBSOCKET ? (
              <Radio size={18} className="text-teal-600" />
            ) : (
              <Database size={18} className="text-blue-600" />
            )}
            {dataSource.label}
          </DialogTitle>
          <DialogDescription>
            {dataSource.description || "No description available"}
          </DialogDescription>
        </DialogHeader> */}

        <div className="flex-1 overflow-y-auto space-y-4">
          <Tabs defaultValue="data" className="w-full">
            <div className="flex items-center justify-center">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="data" className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {isStaticSource
                    ? "Static Data"
                    : `Loaded Data (${data.length} items)`}
                </h3>
                {isApiSource && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-7 text-xs"
                  >
                    <RefreshCw
                      size={12}
                      className={isRefreshing ? "animate-spin" : ""}
                    />
                    <span className="ml-1">Refresh</span>
                  </Button>
                )}
              </div>

              {isStaticSource ? (
                <div className="bg-gray-50  overflow-hidden h-[400px] border border-gray-200">
                  <Editor
                    height="400px"
                    defaultLanguage="json"
                    value={JSON.stringify(staticSource.data, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      lineNumbers: "on",
                      glyphMargin: false,
                      folding: true,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 3,
                    }}
                    theme="vs"
                  />
                </div>
              ) : data.length > 0 ? (
                <div className="bg-gray-50 overflow-hidden h-[400px] border border-gray-200">
                  <Editor
                    height="400px"
                    defaultLanguage="json"
                    value={JSON.stringify(data, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      lineNumbers: "on",
                      glyphMargin: false,
                      folding: true,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 3,
                    }}
                    theme="vs"
                  />
                </div>
              ) : (
                <div className="bg-gray-50  p-8 text-center border border-gray-200">
                  <p className="text-sm text-gray-500">
                    {isApiSource
                      ? "No data loaded. Click refresh to fetch data."
                      : "No data available yet."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Configuration
              </h3>
              <div className="bg-gray-50 rounded-md p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                    ID:
                  </span>
                  <span className="text-xs text-gray-900 font-mono">
                    {dataSource.id}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                    Description:
                  </span>
                  <span className="text-xs text-gray-900 font-mono">
                    {dataSource.description || "No description available"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                    Type:
                  </span>
                  <span className="text-xs text-gray-900">
                    {dataSource.type}
                  </span>
                </div>

                {isApiSource && (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                        Method:
                      </span>
                      <span className="text-xs text-gray-900 font-mono">
                        {apiSource.method || "GET"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                        URL:
                      </span>
                      <span className="text-xs text-gray-900 font-mono break-all">
                        {apiSource.url}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                        Data Path:
                      </span>
                      <span className="text-xs text-gray-900 font-mono">
                        {apiSource.dataPath || "root"}
                      </span>
                    </div>
                  </>
                )}

                {dataSource.type === DataSourceType.WEBSOCKET && (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                        Topic:
                      </span>
                      <span className="text-xs text-gray-900 font-mono">
                        {wsSource.topic}
                      </span>
                    </div>
                    {wsSource.url && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                          URL:
                        </span>
                        <span className="text-xs text-gray-900 font-mono break-all">
                          {wsSource.url}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {isStaticSource && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 min-w-[80px]">
                      Items:
                    </span>
                    <span className="text-xs text-gray-900">
                      {Object.keys(staticSource.data || {}).length} static items
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
