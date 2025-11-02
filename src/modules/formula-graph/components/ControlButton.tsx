/**
 * FormulaNode 控制按钮组件
 * 提供开始/停止自动运行功能和状态显示
 */

import React from "react";
import {
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";
import type { NodeExecutionStatus } from "../../../types/runner";
import { cn } from "@/lib/utils";

interface ControlButtonProps {
  nodeId?: string;
  status: NodeExecutionStatus;
  isAutoRunning: boolean;
  onStartAutoRun: () => void;
  onStopAutoRun: () => void;
  onManualExecute: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const statusIcons = {
  idle: Square,
  running: Loader2,
  success: CheckCircle,
  error: XCircle,
  stopped: Square,
};

const statusColors = {
  idle: "text-gray-500",
  running: "text-blue-500 animate-spin",
  success: "text-green-500",
  error: "text-red-500",
  stopped: "text-gray-400",
};

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const buttonSizeClasses = {
  sm: "h-6 w-6 p-0",
  md: "h-7 w-7 p-0",
  lg: "h-8 w-8 p-0",
};

export const ControlButton: React.FC<ControlButtonProps> = ({
  status,
  isAutoRunning,
  onStartAutoRun,
  onStopAutoRun,
  onManualExecute,
  disabled = false,
  size = "md",
  showTooltip = true,
  className,
}) => {
  const StatusIcon = statusIcons[status];
  const statusColorClass = statusColors[status];
  const sizeClass = sizeClasses[size];
  const buttonSizeClass = buttonSizeClasses[size];

  const handleToggleAutoRun = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发节点选择
    e.preventDefault();

    console.log(
      `[ControlButton] Clicked, isAutoRunning: ${isAutoRunning}, disabled: ${disabled}`
    );

    if (disabled) return;

    if (isAutoRunning) {
      console.log(`[ControlButton] Calling onStopAutoRun`);
      onStopAutoRun();
    } else {
      console.log(`[ControlButton] Calling onStartAutoRun`);
      onStartAutoRun();
    }
  };

  const handleManualExecute = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发节点选择
    e.preventDefault();

    if (disabled) return;

    onManualExecute();
  };

  const getTooltipText = () => {
    if (disabled) return "控制按钮已禁用";

    switch (status) {
      case "idle":
        return isAutoRunning ? "自动运行已启用" : "点击开始自动运行";
      case "running":
        return "正在执行计算...";
      case "success":
        return isAutoRunning ? "自动运行中 - 上次执行成功" : "上次执行成功";
      case "error":
        return isAutoRunning ? "自动运行中 - 上次执行失败" : "上次执行失败";
      case "stopped":
        return "自动运行已停止";
      default:
        return "未知状态";
    }
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        buttonSizeClass,
        "relative hover:bg-white/80 focus:bg-white/80",
        disabled && "opacity-50 cursor-not-allowed",
        status === "running" && "pointer-events-none",
        className
      )}
      onClick={handleToggleAutoRun}
      onDoubleClick={handleManualExecute}
      disabled={disabled}
      aria-label={getTooltipText()}
    >
      {/* 主要显示内容 */}
      {status === "running" ? (
        // 运行状态：显示加载动画
        <StatusIcon
          className={cn(
            sizeClass,
            statusColorClass,
            "transition-all duration-200"
          )}
        />
      ) : (
        // 非运行状态：根据状态显示不同颜色的控制图标
        <>
          {isAutoRunning ? (
            <Pause
              className={cn(
                sizeClass,
                "transition-all duration-200",
                status === "success" && "text-green-600",
                status === "error" && "text-red-600",
                status === "idle" && "text-gray-600",
                status === "stopped" && "text-gray-500"
              )}
            />
          ) : (
            <Play
              className={cn(
                sizeClass,
                "transition-all duration-200",
                status === "success" && "text-green-600",
                status === "error" && "text-red-600",
                status === "idle" && "text-gray-600",
                status === "stopped" && "text-gray-500"
              )}
            />
          )}
        </>
      )}
    </Button>
  );

  // 如果不需要 tooltip，直接返回按钮
  if (!showTooltip) {
    return buttonContent;
  }

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="bg-gray-800 text-white border-gray-700"
        >
          <p className="text-xs font-medium">{getTooltipText()}</p>
          <p className="text-xs text-gray-300 mt-1">双击手动执行</p>
          <TooltipArrow />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// 为快速访问提供的默认导出
export default ControlButton;
