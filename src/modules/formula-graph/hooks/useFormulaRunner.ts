/**
 * Formula Runner Hook
 * 提供便捷的 FormulaNode 执行管理功能
 * 
 * @deprecated React Flow functionality has been removed.
 * This hook was designed for FormulaNode execution in React Flow graphs.
 * Most functionality has been replaced by DataSheet-based execution.
 * This file is kept for compatibility but should not be used for new code.
 */

import { useEffect, useCallback } from "react";
import { runnerManager } from "../services/runnerManager";
import { useGraphStore } from "@/store/graphStore";
import { useFormulaStore } from "@/store/formulaStore";

export interface UseFormulaRunnerOptions {
  autoInitialize?: boolean;
}

export const useFormulaRunner = (
  nodeId: string,
  options: UseFormulaRunnerOptions = {}
) => {
  const { autoInitialize = true } = options;
  const { getFormulaDefinition } = useFormulaStore();

  // 只提取 formula definition ID，避免对象引用变化导致的重复渲染
  const formulaId = useGraphStore((state) => {
    const node = state.nodes.find((n) => n.id === nodeId);
    return node?.data?.id;
  });

  // 使用 selector 来确保状态变化时组件重新渲染
  // 浅比较整个 Map 来检测变化
  const executionState = useGraphStore((state) => {
    const nodeState = state.nodeExecutionStates.get(nodeId);
    return nodeState;
  });

  // 初始化节点 runner
  const initializeRunner = useCallback(() => {
    // 检查是否有 formula ID
    if (!formulaId) {
      // 如果没有 formulaId，清理旧状态
      runnerManager.disposeNode(nodeId);
      return;
    }

    const formulaDefinition = getFormulaDefinition(formulaId);

    if (formulaDefinition) {
      // createNodeContext 内部会处理公式切换时的状态清理
      runnerManager.createNodeContext(nodeId, formulaDefinition);
    } else {
      // 如果找不到公式定义，清理旧状态
      runnerManager.disposeNode(nodeId);
    }
  }, [nodeId, formulaId, getFormulaDefinition]);

  // 更新输入值
  const updateInputs = useCallback(
    (inputValues: Record<string, unknown>) => {
      runnerManager.updateNodeInputs(nodeId, inputValues);
    },
    [nodeId]
  );

  // 开始自动运行
  const startAutoRun = useCallback(() => {
    runnerManager.startNodeAutoRun(nodeId);
  }, [nodeId]);

  // 停止自动运行
  const stopAutoRun = useCallback(() => {
    runnerManager.stopNodeAutoRun(nodeId);
  }, [nodeId]);

  // 手动执行
  const execute = useCallback(async () => {
    await runnerManager.executeNode(nodeId);
  }, [nodeId]);

  // 初始化：当 nodeId 或 autoInitialize 变化时
  useEffect(() => {
    if (autoInitialize) {
      runnerManager.initialize();
      initializeRunner();
    }

    return () => {
      runnerManager.disposeNode(nodeId);
    };
  }, [nodeId, autoInitialize, initializeRunner]); // 只在 nodeId 或 autoInitialize 变化时重新初始化

  // 监听 formulaId 变化：当公式切换时重新初始化
  useEffect(() => {
    if (autoInitialize && formulaId) {
      // 公式切换时，initializeRunner 会处理状态清理
      initializeRunner();
    }
  }, [formulaId, nodeId, autoInitialize, initializeRunner]);

  return {
    // 状态
    isInitialized: !!executionState,
    isAutoRunning: executionState?.isAutoRunning ?? false,
    status: executionState?.status ?? "idle",
    lastResult: executionState?.lastResult,
    lastExecutionTime: executionState?.lastExecutionTime,
    errorMessage: executionState?.errorMessage,
    inputValues: executionState?.inputValues ?? {},

    // 操作
    initializeRunner,
    updateInputs,
    startAutoRun,
    stopAutoRun,
    execute,
  };
};
