import { Fragment } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 格式化值用于显示
 */
const formatValue = (value: unknown, depth = 0): { text: string; isExpanded?: boolean } => {
  const maxDepth = 2;
  const maxStringLength = 50;

  if (value === null) {
    return { text: 'null' };
  }

  if (value === undefined) {
    return { text: 'undefined' };
  }

  if (typeof value === 'string') {
    const truncated = value.length > maxStringLength ?
      `"${value.substring(0, maxStringLength)}..."` :
      `"${value}"`;
    return { text: truncated };
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const items = value.slice(0, 3).map(item =>
        formatValue(item, depth + 1).text
      );
      const remaining = value.length - 3;
      const arrayText = `[${items.join(', ')}${remaining > 0 ? ` ... +${remaining}` : ''}]`;
      return { text: arrayText };
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const items = entries.slice(0, 3).map(([key, val]) =>
      `${key}: ${formatValue(val, depth + 1).text}`
    );
    const remaining = entries.length - 3;
    const objText = `{${items.join(', ')}${remaining > 0 ? ` ... +${remaining}` : ''}}`;
    return { text: objText, isExpanded: depth < maxDepth };
  }

  return { text: String(value) };
};

export interface ErrorDisplayProps {
  errorMessage: string;
  inputValues: Record<string, unknown>;
  className?: string;
}

/**
 * ErrorDisplay - 显示公式执行错误和相关参数信息的组件
 */
export const ErrorDisplay = ({
  errorMessage,
  inputValues,
  className
}: ErrorDisplayProps) => {
  const parameterCount = Object.keys(inputValues).length;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 cursor-help",
            className
          )}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2 flex-1">
              {errorMessage}
              {parameterCount > 0 && (
                <span className="text-red-500 font-medium"> (参数: {parameterCount})</span>
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="bg-red-600 text-white border-red-700 max-w-[400px]"
        >
          <p className="text-xs font-medium mb-2">执行错误</p>
          <p className="text-xs whitespace-pre-wrap break-words mb-3">
            {errorMessage}
          </p>
          {parameterCount > 0 && (
            <div className="border-t border-red-500 pt-2">
              <p className="text-xs font-medium mb-1">当前参数:</p>
              <div className="space-y-2">
                {Object.entries(inputValues).map(([key, value]) => {
                  const formatted = formatValue(value);
                  return (
                    <Fragment key={key}>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-mono bg-red-700 px-1 py-0.5 rounded text-red-100 flex-shrink-0">
                            {key}
                          </span>
                          <span className="text-red-100 flex-shrink-0">:</span>
                          <span className="text-red-200 text-xs flex-shrink-0">
                            ({typeof value})
                          </span>
                        </div>
                        <div className="ml-2 text-xs">
                          <span className="font-mono text-yellow-200 break-all">
                            {formatted.text}
                          </span>
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}
          <TooltipArrow className="fill-red-600" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};