/**
 * Formula Runner Hook
 * 提供便捷的 FormulaNode 执行管理功能
 */

import { useEffect, useCallback } from 'react';
import { runnerManager } from '../services/runnerManager';
import { useGraphStore } from '@/store/graphStore';
import { useFormulaStore } from '@/store/formulaStore';

export interface UseFormulaRunnerOptions {
  autoInitialize?: boolean;
}

export const useFormulaRunner = (
  nodeId: string,
  options: UseFormulaRunnerOptions = {}
) => {
  console.log(`[useFormulaRunner] Hook called for ${nodeId}`);
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
    console.log(`[useFormulaRunner] initializeRunner called for ${nodeId}`);
    
    // 检查是否有 formula ID
    if (!formulaId) {
      console.log(`[useFormulaRunner] No formula ID found for node ${nodeId}`);
      return;
    }

    console.log(`[useFormulaRunner] Formula ID: ${formulaId}`);
    
    const formulaDefinition = getFormulaDefinition(formulaId);
    console.log(`[useFormulaRunner] Formula definition:`, formulaDefinition);
    
    if (formulaDefinition) {
      runnerManager.createNodeContext(nodeId, formulaDefinition);
    } else {
      console.log(`[useFormulaRunner] No formula definition found for formula ID: ${formulaId}`);
    }
  }, [nodeId, formulaId, getFormulaDefinition]);

  // 更新输入值
  const updateInputs = useCallback((inputValues: Record<string, any>) => {
    runnerManager.updateNodeInputs(nodeId, inputValues);
  }, [nodeId]);

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

  // 初始化
  useEffect(() => {
    console.log(`[useFormulaRunner] useEffect running for ${nodeId}`);

    // 调试：确保函数被定义
    console.log(`[useFormulaRunner] Hook initialized for ${nodeId}`, {
      hasStartAutoRun: !!startAutoRun,
      hasStopAutoRun: !!stopAutoRun,
      hasExecute: !!execute
    });

    if (autoInitialize) {
      console.log(`[useFormulaRunner] Auto-initializing for ${nodeId}`);
      runnerManager.initialize();
      initializeRunner();
    } else {
      console.log(`[useFormulaRunner] Auto-initialization disabled for ${nodeId}`);
    }

    return () => {
      console.log(`[useFormulaRunner] Cleanup for ${nodeId}`);
      runnerManager.disposeNode(nodeId);
    };
  }, [nodeId, autoInitialize, initializeRunner]); // 添加依赖数组，避免每次渲染都重新初始化

  // 监听状态变化
  useEffect(() => {
    console.log(`[useFormulaRunner] State changed for ${nodeId}:`, {
      isAutoRunning: executionState?.isAutoRunning,
      status: executionState?.status
    });
  }, [executionState]);

  return {
    // 状态
    isInitialized: !!executionState,
    isAutoRunning: executionState?.isAutoRunning ?? false,
    status: executionState?.status ?? 'idle',
    lastResult: executionState?.lastResult,
    lastExecutionTime: executionState?.lastExecutionTime,
    errorMessage: executionState?.errorMessage,
    inputValues: executionState?.inputValues ?? {},

    // 操作
    initializeRunner,
    updateInputs,
    startAutoRun,
    stopAutoRun,
    execute
  };
};