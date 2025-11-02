/**
 * Global Runner Manager
 * 管理所有 FormulaNode 的 RunnerService 实例和事件通信
 */

import { RunnerService } from './runnerService';
import type { RunnerDependencies } from '../../../types/runner';
import type { FormulaDefinition } from '../../../types/formula';
import { useGraphStore } from '../../../store/graphStore';

class RunnerManager {
  private runnerService: RunnerService;
  private nodeDependencies = new Map<string, RunnerDependencies>();
  private initialized = false;

  constructor() {
    this.runnerService = new RunnerService();
    this.setupEventListeners();
  }

  /**
   * 初始化 RunnerManager
   */
  initialize(): void {
    if (this.initialized) return;

    // 监听 React Flow 的节点和边变化
    this.setupReactFlowListeners();
    this.initialized = true;
  }

  /**
   * 为 FormulaNode 创建执行上下文
   */
  createNodeContext(
    nodeId: string,
    formulaDefinition: FormulaDefinition
  ): void {
    console.log(`[RunnerManager] createNodeContext called for ${nodeId}`, {
      formulaDefinition: formulaDefinition.name
    });

    // 获取节点的依赖关系
    const dependencies = this.getNodeDependencies(nodeId);
    this.nodeDependencies.set(nodeId, dependencies);

    // 创建 runner context
    this.runnerService.createContext(
      nodeId,
      formulaDefinition,
      dependencies
    );

    // 设置状态更新回调
    this.runnerService.setUpdateCallback(nodeId, (state) => {
      this.handleNodeStateUpdate(nodeId, state);
    });

    console.log(`[RunnerManager] createNodeContext completed for ${nodeId}`);
  }

  /**
   * 更新节点的输入值
   */
  updateNodeInputs(nodeId: string, inputValues: Record<string, any>): void {
    this.runnerService.updateInputValues(nodeId, inputValues);
  }

  /**
   * 开始节点自动运行
   */
  startNodeAutoRun(nodeId: string): void {
    this.runnerService.startAutoRun(nodeId);
  }

  /**
   * 停止节点自动运行
   */
  stopNodeAutoRun(nodeId: string): void {
    this.runnerService.stopAutoRun(nodeId);
  }

  /**
   * 通知节点数据变化
   * 当节点（如 ApiNode、WebSocketNode）的数据更新时调用此方法
   * 会自动更新下游 FormulaNode 的输入值并触发执行（如果启用自动运行）
   */
  notifyNodeDataChange(nodeId: string, result: unknown): void {
    this.runnerService.notifyUpstreamNodeChange(nodeId, result);
  }

  /**
   * 更新节点的依赖关系（当边变化时调用）
   */
  updateNodeDependencies(nodeId: string): void {
    const dependencies = this.getNodeDependencies(nodeId);
    this.nodeDependencies.set(nodeId, dependencies);
    
    // 更新 runner context 中的依赖关系
    const context = this.runnerService.getContext(nodeId);
    if (context) {
      context.dependencies = dependencies;
    }
  }

  /**
   * 手动执行节点
   */
  async executeNode(nodeId: string): Promise<void> {
    await this.runnerService.executeNode(nodeId);
  }

  /**
   * 清理节点上下文
   */
  disposeNode(nodeId: string): void {
    this.runnerService.disposeContext(nodeId);
    this.nodeDependencies.delete(nodeId);
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.runnerService.dispose();
    this.nodeDependencies.clear();
    this.removeEventListeners();
    this.initialized = false;
  }

  // 私有方法

  private setupEventListeners(): void {
    // 监听 FormulaNode 的控制按钮事件
    window.addEventListener('formulaNode:startAutoRun', this.handleStartAutoRun);
    window.addEventListener('formulaNode:stopAutoRun', this.handleStopAutoRun);
    window.addEventListener('formulaNode:manualExecute', this.handleManualExecute);
  }

  private removeEventListeners(): void {
    window.removeEventListener('formulaNode:startAutoRun', this.handleStartAutoRun);
    window.removeEventListener('formulaNode:stopAutoRun', this.handleStopAutoRun);
    window.removeEventListener('formulaNode:manualExecute', this.handleManualExecute);
  }

  private setupReactFlowListeners(): void {
    // 这里可以监听 React Flow 的节点和边变化
    // 更新节点依赖关系
  }

  private getNodeDependencies(nodeId: string): RunnerDependencies {
    const { edges } = useGraphStore.getState();

    // 找到所有输入连接（target 是当前节点）
    const inputNodes = edges
      .filter(edge => edge.target === nodeId)
      .map(edge => ({
        nodeId: edge.source,
        handleId: edge.sourceHandle || undefined
      }));

    // 找到所有输出连接（source 是当前节点）
    const outputNodes = edges
      .filter(edge => edge.source === nodeId)
      .map(edge => ({
        nodeId: edge.target,
        handleId: edge.targetHandle || undefined
      }));

    return {
      inputNodes,
      outputNodes
    };
  }

  private handleNodeStateUpdate(nodeId: string, state: any): void {
    console.log(`[RunnerManager] Updating state for ${nodeId}:`, {
      isAutoRunning: state.isAutoRunning,
      status: state.status
    });

    const store = useGraphStore.getState();

    // 更新 graph store 中的节点执行状态
    store.updateNodeExecutionState(nodeId, {
      status: state.status,
      isAutoRunning: state.isAutoRunning,
      lastExecutionTime: state.lastExecutionTime,
      lastResult: state.lastResult,
      errorMessage: state.errorMessage,
      inputValues: state.inputValues
    });

    // 验证更新后的状态
    const updatedState = store.nodeExecutionStates.get(nodeId);
    console.log(`[RunnerManager] State after update:`, {
      isAutoRunning: updatedState?.isAutoRunning,
      status: updatedState?.status
    });
  }

  private handleStartAutoRun = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const { nodeId } = customEvent.detail;
    this.startNodeAutoRun(nodeId);
  };

  private handleStopAutoRun = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const { nodeId } = customEvent.detail;
    this.stopNodeAutoRun(nodeId);
  };

  private handleManualExecute = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const { nodeId } = customEvent.detail;
    this.executeNode(nodeId);
  };
}

// 创建全局单例
export const runnerManager = new RunnerManager();