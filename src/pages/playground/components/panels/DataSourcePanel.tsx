import { Card } from "../../../../components/common/Card";
import { Globe, Radio } from "lucide-react";
import { apiDataSources, wsDataSources } from "../../../../config/dataSources";

export function DataSourcePanel() {
  return (
    <Card title="DataSource">
      <div className="space-y-3">
        {/* RESTful API Data Sources Section */}
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
            <Globe size={14} strokeWidth={1.5} />
            <span>RESTful API</span>
          </div>
          <div className="space-y-1">
            {apiDataSources.map((source) => (
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
                className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white border border-orange-200 hover:bg-orange-50 cursor-move transition-colors"
              >
                <Globe
                  size={16}
                  strokeWidth={1.5}
                  className="text-orange-600 mt-0.5 shrink-0"
                />
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

        {/* WebSocket Data Sources Section */}
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
            <Radio size={14} strokeWidth={1.5} />
            <span>WebSocket</span>
          </div>
          <div className="space-y-1">
            {wsDataSources.map((source) => (
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
                className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white border border-teal-200 hover:bg-teal-50 cursor-move transition-colors"
              >
                <Radio
                  size={16}
                  strokeWidth={1.5}
                  className="text-teal-600 mt-0.5 shrink-0"
                />
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

        <div className="text-[11px] text-gray-500 mt-2 px-2.5 pt-2 border-t border-gray-200">
          💡 Drag a data source to the canvas to create a node
        </div>
      </div>
    </Card>
  );
}