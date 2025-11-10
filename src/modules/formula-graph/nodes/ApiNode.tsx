import { Handle, Position } from "reactflow";
import {
  memo,
  useEffect,
  useState,
  useRef,
  useMemo,
  Fragment,
  useCallback,
} from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "../../../lib/utils";
import { RefreshCw, Play, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useGraphStore } from "@/store/graphStore";
import { runnerManager } from "../services/runnerManager";

interface ApiNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

const HEADER_HEIGHT = 80;
const HANDLE_GAP = 24;
const HEADER_TO_FIRST_HANDLE_GAP = 12;
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
 * Extract path parameter names from URL (e.g., "{symbol}" -> ["symbol"])
 * @param url - URL string that may contain path parameters like {paramName}
 * @returns Array of parameter names found in the URL
 */
function extractPathParams(url: string): string[] {
  const paramRegex = /\{([^}]+)\}/g;
  const params: string[] = [];
  let match;
  while ((match = paramRegex.exec(url)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/**
 * Replace path parameters in URL with actual values
 * @param url - URL string with path parameters like {paramName}
 * @param params - Object containing parameter values (e.g., { symbol: "BTC" })
 * @returns URL with path parameters replaced, or original URL if replacement fails
 */
function replacePathParams(
  url: string,
  params: Record<string, unknown>
): string {
  let result = url;
  const pathParams = extractPathParams(url);

  for (const paramName of pathParams) {
    const value = params[paramName];
    if (value !== undefined && value !== null) {
      // Convert value to string for URL replacement
      const stringValue = String(value);
      result = result.replace(
        `{${paramName}}`,
        encodeURIComponent(stringValue)
      );
    }
  }

  return result;
}

/**
 * Check if API requires parameters (body, non-GET method, or path parameters)
 */
function requiresParams(
  method?: string,
  body?: unknown,
  url?: string
): boolean {
  const upperMethod = method?.toUpperCase() || "GET";
  const hasBody = body !== undefined && body !== null && body !== "";
  const hasPathParams = url ? extractPathParams(url).length > 0 : false;

  return upperMethod !== "GET" || hasBody || hasPathParams;
}

/**
 * Response transformation middleware to extract only the 'data' field from API responses
 * @param response - The raw API response object
 * @returns Transformed response containing only the 'data' field, or original response if no data field exists
 */
function transformResponse(response: unknown): unknown {
  // Check if response is an object and has a 'data' property
  if (
    response != null &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    "data" in response
  ) {
    return (response as { data: unknown }).data;
  }

  // Return original response if no 'data' field exists
  return response;
}

/**
 * ApiNode - Custom React Flow node for RESTful API requests
 * Supports automatic requests, field extraction, and manual triggering
 */
export const ApiNode = memo(function ApiNode({
  id,
  data,
  selected,
}: ApiNodeProps) {
  const { settings } = useSettingsStore();
  const { updateNodeData } = useGraphStore();

  const method = data.apiConfig?.method || "GET";
  const url = data.apiConfig?.url || "";
  const headers = useMemo(
    () => data.apiConfig?.headers || {},
    [data.apiConfig?.headers]
  );
  const body = data.apiConfig?.body;
  const responseFields = data.apiConfig?.responseFields || [];
  const storedParams = data.apiConfig?.requestParams;

  // Track if node has been mounted/requested
  const hasRequestedRef = useRef(false);
  const pathParams = useMemo(() => extractPathParams(url), [url]);
  const needsParams = useMemo(
    () => requiresParams(method, body, url),
    [method, body, url]
  );

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Path parameters: each parameter has its own input field
  const [pathParamValues, setPathParamValues] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    if (storedParams && typeof storedParams === "object") {
      const currentPathParams = extractPathParams(url);
      currentPathParams.forEach((param) => {
        const value = (storedParams as Record<string, unknown>)[param];
        if (value !== undefined && value !== null) {
          initial[param] = String(value);
        }
      });
    }
    return initial;
  });
  // Other request parameters (for body, etc.) - still uses JSON textarea
  const [requestParams, setRequestParams] = useState<string>(() => {
    if (!storedParams) return "";
    const currentPathParams = extractPathParams(url);
    const otherParams = Object.fromEntries(
      Object.entries(storedParams as Record<string, unknown>).filter(
        ([key]) => !currentPathParams.includes(key)
      )
    );
    return JSON.stringify(otherParams, null, 2);
  });

  // Re-initialize path params when URL changes
  useEffect(() => {
    const currentPathParams = extractPathParams(url);

    // Use functional update to access current state
    setPathParamValues((prev) => {
      const initial: Record<string, string> = {};

      // Preserve existing values for params that still exist in the new URL
      currentPathParams.forEach((param) => {
        if (prev[param]) {
          initial[param] = prev[param];
        } else if (storedParams && typeof storedParams === "object") {
          const value = (storedParams as Record<string, unknown>)[param];
          if (value !== undefined && value !== null) {
            initial[param] = String(value);
          }
        }
      });

      return initial;
    });

    // Update other params textarea if needed
    if (storedParams && typeof storedParams === "object") {
      const otherParams = Object.fromEntries(
        Object.entries(storedParams as Record<string, unknown>).filter(
          ([key]) => !currentPathParams.includes(key)
        )
      );
      setRequestParams(JSON.stringify(otherParams, null, 2));
    }
  }, [url, storedParams]); // Depend on url and storedParams

  /**
   * Execute API request
   */
  const executeRequest = useCallback(async () => {
    if (!url) {
      setError("URL is not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Collect path parameters from individual input fields
      const pathParamsObj: Record<string, string> = {};
      pathParams.forEach((param) => {
        const value = pathParamValues[param]?.trim();
        if (value) {
          pathParamsObj[param] = value;
        }
      });

      // Validate path parameters are provided
      const missingPathParams = pathParams.filter(
        (param) => !pathParamValues[param]?.trim()
      );
      if (missingPathParams.length > 0) {
        setError(`Missing path parameters: ${missingPathParams.join(", ")}`);
        setLoading(false);
        return;
      }

      // Replace path parameters in URL
      let finalUrl = url;
      if (pathParams.length > 0) {
        finalUrl = replacePathParams(url, pathParamsObj);
      }

      // Parse other request parameters (for body) if provided
      let otherParams: Record<string, unknown> = {};
      if (needsParams && requestParams.trim()) {
        try {
          otherParams = JSON.parse(requestParams);
        } catch {
          setError("Invalid JSON in request parameters");
          setLoading(false);
          return;
        }
      }

      // Merge path params and other params for storing
      const allParams = { ...pathParamsObj, ...otherParams };

      // Build full URL
      const apiBaseURL = settings.apiBaseURL || "";
      const fullUrl = apiBaseURL
        ? `${apiBaseURL.replace(/\/$/, "")}/${finalUrl.replace(/^\//, "")}`
        : finalUrl;

      // Parse request body if params are provided
      let requestBody: unknown = body;
      // For non-GET requests, use otherParams as body if no explicit body is set
      if (
        method.toUpperCase() !== "GET" &&
        body === undefined &&
        Object.keys(otherParams).length > 0
      ) {
        requestBody = otherParams;
      } else if (body !== undefined && body !== null) {
        requestBody = body;
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      // Add body for non-GET requests or if body exists
      if (
        method.toUpperCase() !== "GET" &&
        requestBody !== undefined &&
        requestBody !== null
      ) {
        fetchOptions.body = JSON.stringify(requestBody);
      }

      // Execute request
      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const rawResponseData = await response.json();

      // Apply response transformation middleware to extract only the 'data' field
      const responseData = transformResponse(rawResponseData);

      // Extract field paths
      const fields = extractFieldPaths(responseData);

      // Update node data
      updateNodeData(id, {
        value: responseData as
          | Record<string, unknown>
          | unknown[]
          | string
          | number
          | boolean,
        isError: false,
        apiConfig: {
          ...data.apiConfig,
          responseFields: fields,
          requestParams:
            needsParams && (pathParams.length > 0 || requestParams.trim())
              ? allParams
              : undefined,
        },
      });

      // 通知下游节点数据已更新（如果下游节点开启自动运行，会自动触发执行）
      runnerManager.notifyNodeDataChange(id, responseData);

      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch API";
      setError(errorMessage);
      updateNodeData(id, {
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }, [
    id,
    url,
    method,
    headers,
    body,
    needsParams,
    requestParams,
    pathParams,
    pathParamValues,
    settings.apiBaseURL,
    updateNodeData,
    data.apiConfig,
  ]);

  /**
   * Auto-request on mount if no parameters needed
   */
  useEffect(() => {
    if (!hasRequestedRef.current && !needsParams && url) {
      hasRequestedRef.current = true;
      executeRequest();
    }
  }, [needsParams, url, executeRequest]); // Only run once on mount

  /**
   * Handle manual trigger button click
   */
  const handleTriggerClick = () => {
    executeRequest();
  };

  /**
   * Calculate dynamic configuration section height
   */
  const configSectionHeight = useMemo(() => {
    let height = 0;

    // Base description and API configuration space
    height += 60; // Base space for description and endpoint display

    // Path parameters inputs
    if (pathParams.length > 0) {
      height += 20; // "Path Parameters:" label
      height += pathParams.length * 40; // Each path param input
    }

    // Other request parameters textarea
    if (needsParams && pathParams.length === 0) {
      height += 20; // "Request Parameters:" label
      height += 80; // Textarea height
    }

    // Error display
    if (error) {
      height += 30; // Error message height
    }

    return height;
  }, [pathParams.length, needsParams, error]);

  /**
   * Calculate container height based on fields and params
   */
  const fieldCount = responseFields.length;
  const containerMinHeight =
    HEADER_HEIGHT +
    configSectionHeight +
    HEADER_TO_FIRST_HANDLE_GAP +
    Math.max(1, fieldCount) * HANDLE_GAP +
    BOTTOM_PADDING;

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[260px] relative",
        "border-orange-400",
        data.isError && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-orange-600 shadow-lg ring-2 ring-orange-200"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className=" font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-sm">
            {method}
          </span>
          <div className="font-semibold text-gray-900">{data.label}</div>
          {loading && (
            <Loader2 size={16} className="text-orange-600 animate-spin" />
          )}
        </div>

        {/* Trigger/Refresh Button - Top Right */}
        <button
          onClick={handleTriggerClick}
          disabled={loading || !url}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            "bg-orange-500 hover:bg-orange-600 text-white",
            "disabled:bg-gray-300 disabled:cursor-not-allowed",
            "shadow-sm hover:shadow-md"
          )}
          title={loading ? "请求中..." : data.value ? "刷新" : "发送请求"}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : data.value ? (
            <RefreshCw size={14} />
          ) : (
            <Play size={14} />
          )}
        </button>
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600">{data.description}</div>
      )}

      {/* API Configuration */}
      <div className="space-y-2 mb-3">
        {/* URL Display */}
        <div className="flex items-center gap-1 text-xs">
          <span className=" text-gray-600">Endpoint:</span>
          <span className=" font-mono px-2 py-0.5 text-gray-500">
            {url || "Not configured"}
          </span>
        </div>

        {/* Path Parameters Input Fields */}
        {pathParams.length > 0 && (
          <>
            <hr className="mt-2" />
            <div className="space-y-2">
              <div className="text-xs text-gray-600 mb-1">Path Parameters:</div>
              {pathParams.map((param) => (
                <div key={param}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {param}:
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs font-mono bg-gray-50 text-gray-700 px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder={`Enter ${param}`}
                    value={pathParamValues[param] || ""}
                    onChange={(e) =>
                      setPathParamValues((prev) => ({
                        ...prev,
                        [param]: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Other Request Parameters Input (for body, etc.) */}
        {needsParams && pathParams.length === 0 && (
          <div>
            <div className="text-xs text-gray-600 mb-1">
              Request Parameters:
            </div>
            <textarea
              className="w-full min-h-[80px] text-xs font-mono bg-gray-50 text-gray-700 px-2 py-1.5 rounded border border-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder='{"key": "value"}'
              value={requestParams}
              onChange={(e) => setRequestParams(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      {/* Source handles for each field - only show when data is successfully fetched */}
      {data.value && !data.isError && fieldCount > 0 ? (
        responseFields.map((fieldPath, index) => (
          <Fragment key={fieldPath}>
            <Handle
              id={fieldPath}
              type="source"
              position={Position.Right}
              className="w-3 h-3 bg-orange-500"
              style={{
                top:
                  HEADER_HEIGHT +
                  configSectionHeight +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  6 +
                  index * HANDLE_GAP,
              }}
            />
            <span
              className="absolute text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 py-0.5"
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
      ) : data.value && !data.isError ? (
        // Show single handle when data exists but no structured fields
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-orange-500"
          style={{
            top:
              HEADER_HEIGHT + configSectionHeight + HEADER_TO_FIRST_HANDLE_GAP,
          }}
        />
      ) : null}
    </div>
  );
});
