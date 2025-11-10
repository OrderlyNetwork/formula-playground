import { Handle, Position } from "reactflow";
import { memo, useState, useEffect, useRef, useMemo, Fragment } from "react";
import type { FormulaNodeData, FormulaScalar } from "@/types/formula";
import { cn } from "@/lib/utils";
import { Radio, Play, Pause } from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { websocketManager } from "../services/websocketManager";
import { useSettingsStore } from "@/store/settingsStore";

interface WebSocketNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

const HEADER_HEIGHT = 80;
const HANDLE_GAP = 24;
const HEADER_TO_FIRST_HANDLE_GAP = 32; // Increased from 12 to avoid overlap
const BOTTOM_PADDING = 16;

/**
 * Extract all field paths from a JSON object recursively
 * Returns flat list of field paths (e.g., ["data", "data.user", "data.user.name"])
 */
function extractFieldPaths(
  obj: unknown,
  prefix = "",
  paths: string[] = []
): string[] {
  if (obj == null || typeof obj !== "object") {
    // Primitive value - add the path if it's not empty
    if (prefix) {
      paths.push(prefix);
    }
    return paths;
  }

  // Handle arrays - extract paths from each element
  if (Array.isArray(obj)) {
    // For arrays, we add the array path itself
    if (prefix && !paths.includes(prefix)) {
      paths.push(prefix);
    }
    // Extract paths from first element if it's an object
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      // For arrays, extract fields from first element but use dot notation
      // This allows getByPath to work correctly
      extractFieldPaths(obj[0], prefix ? `${prefix}.0` : "0", paths);
    }
    return paths;
  }

  // Handle objects - extract paths for each property
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const value = record[key];

      // Add the path for this property
      if (!paths.includes(currentPath)) {
        paths.push(currentPath);
      }

      // Recursively extract nested paths
      if (value != null && typeof value === "object" && !Array.isArray(value)) {
        extractFieldPaths(value, currentPath, paths);
      } else if (Array.isArray(value) && value.length > 0) {
        extractFieldPaths(value, currentPath, paths);
      }
    }
  }

  return paths;
}

/**
 * WebSocketNode - Custom React Flow node for WebSocket data streaming
 * Displays pre-configured WebSocket endpoint information
 * Manages WebSocket subscription and data output control
 */
export const WebSocketNode = memo(function WebSocketNode({
  id,
  data,
  selected,
}: WebSocketNodeProps) {
  const { updateNodeData } = useGraphStore();
  const webSocketBaseURL = useSettingsStore(
    (state) => state.settings.webSocketBaseURL
  );
  const topicTemplate = data.wsConfig?.topic || "";

  /**
   * Parse placeholders from topic template (e.g., "{symbol}@indexprice" -> ["symbol"])
   */
  const placeholders = useMemo(() => {
    const matches = topicTemplate.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map((match) => match.slice(1, -1)); // Remove { and }
  }, [topicTemplate]);

  /**
   * Store placeholder values
   */
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >(data.wsConfig?.placeholderValues || {});

  /**
   * Resolve topic from template and placeholder values
   */
  const resolvedTopic = useMemo(() => {
    let resolved = topicTemplate;
    placeholders.forEach((placeholder) => {
      const value = placeholderValues[placeholder] || "";
      resolved = resolved.replace(`{${placeholder}}`, value);
    });
    return resolved;
  }, [topicTemplate, placeholders, placeholderValues]);

  /**
   * Check if all placeholders have values
   */
  const isTopicReady = useMemo(() => {
    return (
      placeholders.length === 0 ||
      placeholders.every((p) => placeholderValues[p]?.trim())
    );
  }, [placeholders, placeholderValues]);

  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >(data.wsConfig?.status || "disconnected");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(
    data.wsConfig?.isSubscribed || false
  );
  const [latestData, setLatestData] = useState<FormulaScalar | undefined>(
    data.value
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previousTopicRef = useRef<string>("");
  const responseFieldsRef = useRef<string[]>(
    data.wsConfig?.responseFields || []
  );

  // Extract field paths from current data value or use stored responseFields
  const responseFields = useMemo(() => {
    // Use stored responseFields if available (more stable)
    if (
      data.wsConfig?.responseFields &&
      data.wsConfig.responseFields.length > 0
    ) {
      return data.wsConfig.responseFields;
    }
    // Otherwise extract from current value or latest data
    const sourceData = data.value || latestData;
    if (!sourceData || data.isError) return [];
    return extractFieldPaths(sourceData);
  }, [data.value, latestData, data.isError, data.wsConfig?.responseFields]);

  // Calculate configuration section height
  const configSectionHeight = useMemo(() => {
    let height = 0;

    // Base space for status, topic, and output control
    height += 60;

    // Placeholder inputs
    if (placeholders.length > 0) {
      height += 20; // "Parameters:" label
      height += placeholders.length * 40; // Each placeholder input
    }

    return height;
  }, [placeholders.length]);

  // Calculate container height based on fields
  const fieldCount = responseFields.length;
  const containerMinHeight =
    HEADER_HEIGHT +
    configSectionHeight +
    HEADER_TO_FIRST_HANDLE_GAP +
    Math.max(1, fieldCount) * HANDLE_GAP +
    BOTTOM_PADDING;

  /**
   * Get status color based on connection state
   */
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600 bg-green-50 border-green-200";
      case "connecting":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  /**
   * Get status text based on connection state
   */
  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  useEffect(() => {
    responseFieldsRef.current = data.wsConfig?.responseFields || [];
  }, [data.wsConfig?.responseFields]);

  /**
   * Store current subscription info to detect parameter changes
   */
  const currentSubscriptionRef = useRef<{
    topic: string;
    nodeId: string;
  } | null>(null);

  /**
   * Handle subscription when isSubscribed changes or topic changes
   * Only subscribes when isSubscribed is true and topic is ready
   */
  useEffect(() => {
    if (!webSocketBaseURL || !topicTemplate) return;

    // If not subscribed, clean up any existing subscription
    if (!isSubscribed) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        currentSubscriptionRef.current = null;
      }
      // Update status to disconnected
      setConnectionStatus("disconnected");
      updateNodeData(id, {
        wsConfig: {
          topic: topicTemplate,
          status: "disconnected",
          placeholderValues,
          isSubscribed: false,
        },
      });
      return;
    }

    // Only subscribe if topic is ready (all placeholders filled)
    if (!isTopicReady) {
      // Unsubscribe if we had a previous subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        currentSubscriptionRef.current = null;
      }
      // Update status to disconnected if we have placeholders but they're not filled
      if (placeholders.length > 0) {
        setConnectionStatus("disconnected");
        updateNodeData(id, {
          wsConfig: {
            topic: topicTemplate,
            status: "disconnected",
            placeholderValues,
            isSubscribed: false,
          },
        });
      }
      return;
    }

    // Check if we need to resubscribe (topic changed or no current subscription)
    const needsNewSubscription =
      !currentSubscriptionRef.current ||
      currentSubscriptionRef.current.topic !== resolvedTopic ||
      currentSubscriptionRef.current.nodeId !== id;

    if (needsNewSubscription) {
      // Unsubscribe from previous topic if different
      if (
        unsubscribeRef.current &&
        currentSubscriptionRef.current?.topic !== resolvedTopic
      ) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Subscribe to WebSocket topic
      const unsubscribe = websocketManager.subscribe(
        resolvedTopic,
        id,
        (message: unknown) => {
          // Always update latest data
          setLatestData(message as FormulaScalar);

          // Extract field paths from the message
          const fields = extractFieldPaths(message);

          updateNodeData(id, {
            value: message,
            isError: false,
            wsConfig: {
              topic: topicTemplate,
              status: connectionStatus,
              placeholderValues,
              responseFields: fields,
              isSubscribed: true,
            },
          });
        },
        (status) => {
          // Update connection status
          setConnectionStatus(status);
          updateNodeData(id, {
            wsConfig: {
              topic: topicTemplate,
              status,
              placeholderValues,
              responseFields: responseFieldsRef.current,
              isSubscribed: true,
            },
          });
        }
      );

      unsubscribeRef.current = unsubscribe;
      currentSubscriptionRef.current = {
        topic: resolvedTopic,
        nodeId: id,
      };
    } else {
      console.log(
        `[WebSocketNode] Subscription already exists for topic: ${resolvedTopic}, skipping`
      );
    }

    previousTopicRef.current = resolvedTopic;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      currentSubscriptionRef.current = null;
      previousTopicRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    webSocketBaseURL,
    topicTemplate,
    id,
    updateNodeData,
    isSubscribed,
    isTopicReady,
    resolvedTopic,
    placeholders.length,
    placeholderValues,
    data.wsConfig?.responseFields,
  ]);

  /**
   * Cleanup subscription when component unmounts
   * Simplified cleanup - only remove from manager to avoid duplicate unsubscriptions
   */
  useEffect(() => {
    return () => {
      // Clean up directly from WebSocketManager - this handles all cleanup
      websocketManager.removeNode(id);
      // Clear local refs
      unsubscribeRef.current = null;
      currentSubscriptionRef.current = null;
    };
  }, [id]);

  /**
   * Handle subscribe/unsubscribe toggle
   * Click to subscribe when not subscribed, unsubscribe when subscribed
   */
  const handleSubscribeToggle = () => {
    const newSubscribedState = !isSubscribed;
    setIsSubscribed(newSubscribedState);

    // Update node data to persist subscription state
    updateNodeData(id, {
      wsConfig: {
        topic: topicTemplate,
        placeholderValues,
        status: connectionStatus,
        isSubscribed: newSubscribedState,
      },
    });
  };

  /**
   * Handle placeholder value change
   */
  const handlePlaceholderChange = (placeholder: string, value: string) => {
    const newValues = {
      ...placeholderValues,
      [placeholder]: value,
    };
    setPlaceholderValues(newValues);

    // Update node data to persist placeholder values
    updateNodeData(id, {
      wsConfig: {
        topic: topicTemplate,
        placeholderValues: newValues,
        status: connectionStatus,
      },
    });
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[260px] relative",
        "border-teal-400",
        data.isError && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-teal-600 shadow-lg ring-2 ring-teal-200"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio size={18} strokeWidth={1.5} className="text-teal-600" />
          <div className="font-semibold text-gray-900">{data.label}</div>
        </div>

        {/* Subscribe/Unsubscribe Toggle Button - Top Right */}
        {isTopicReady && (
          <button
            onClick={handleSubscribeToggle}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              isSubscribed
                ? "bg-red-500 hover:bg-red-600"
                : "bg-teal-500 hover:bg-teal-600",
              "text-white shadow-sm hover:shadow-md"
            )}
            title={isSubscribed ? "退订" : "订阅"}
          >
            {isSubscribed ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 mb-3">{data.description}</div>
      )}

      {/* WebSocket Configuration - Read-only display */}
      <div className="space-y-2">
        {/* Connection Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Status:</span>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded border",
              getStatusColor()
            )}
          >
            {getStatusText()}
          </span>
        </div>

        {/* Topic Display */}
        {topicTemplate && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Topic:</span>
              <span className="text-xs font-mono bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                {isTopicReady ? resolvedTopic : topicTemplate}
              </span>
            </div>

            {/* Placeholder Input Fields */}
            {placeholders.length > 0 && (
              <>
                <hr className="mt-2" />
                <div className="space-y-1.5 mt-2">
                  <div className="text-xs text-gray-600">Parameters:</div>
                  {placeholders.map((placeholder) => (
                    <div key={placeholder}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {placeholder}:
                      </label>
                      <input
                        type="text"
                        className="w-full text-xs font-mono bg-gray-50 text-gray-700 px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 nodrag"
                        placeholder={`Enter ${placeholder}`}
                        value={placeholderValues[placeholder] || ""}
                        onChange={(e) =>
                          handlePlaceholderChange(placeholder, e.target.value)
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                  {!isTopicReady && (
                    <div className="text-xs text-amber-600 mt-1">
                      Please fill all parameters to subscribe
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Source handles for each field - show when subscribed and data exists or connection is active */}
      {isSubscribed && (data.value || latestData) && !data.isError ? (
        fieldCount > 0 ? (
          responseFields.map((fieldPath, index) => (
            <Fragment key={fieldPath}>
              <Handle
                id={fieldPath}
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-teal-500"
                style={{
                  top:
                    HEADER_HEIGHT +
                    configSectionHeight +
                    HEADER_TO_FIRST_HANDLE_GAP +
                    6 +
                    index * HANDLE_GAP,
                }}
                title={fieldPath}
              />
              <span
                className="absolute text-[10px] rounded px-1 py-0.5 border text-teal-700 bg-teal-50 border-teal-200"
                style={{
                  top:
                    HEADER_HEIGHT -
                    4 +
                    configSectionHeight +
                    HEADER_TO_FIRST_HANDLE_GAP +
                    index * HANDLE_GAP,
                  right: 16,
                }}
              >
                {fieldPath}
              </span>
            </Fragment>
          ))
        ) : (
          // Show single handle when data exists but no structured fields
          <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-teal-500"
            style={{
              top:
                HEADER_HEIGHT +
                configSectionHeight +
                HEADER_TO_FIRST_HANDLE_GAP,
            }}
            title="Connect to InputNode or other nodes to pass WebSocket data"
          />
        )
      ) : isSubscribed && connectionStatus === "connected" ? (
        // Show single handle when subscribed and connected but no data yet
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-teal-500"
          style={{
            top:
              HEADER_HEIGHT + configSectionHeight + HEADER_TO_FIRST_HANDLE_GAP,
          }}
          title="Waiting for data..."
        />
      ) : null}
    </div>
  );
});
