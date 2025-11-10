/**
 * FormulaNode Runner Service
 * 管理单个 FormulaNode 的执行上下文和自动运行逻辑
 */

import { NodeExecutionStatus } from "../../../types/runner";
import type {
  RunnerConfig,
  RunnerContext,
  RunnerResult,
  NodeExecutionState,
  RunnerDependencies,
} from "@/types/runner";
import type { FormulaDefinition } from "@/types/formula";
import type { FormulaNode, FormulaEdge } from "@/types/formula";
import { useFormulaStore } from "@/store/formulaStore";
import { useGraphStore } from "@/store/graphStore";
import { FormulaServiceFactory } from "../../../services/FormulaServiceFactory";
import type { FormulaExecutor } from "../../formula-executor";

export class RunnerService {
  private contexts = new Map<string, RunnerContext>();
  private formulaExecutor: FormulaExecutor;
  private debounceTimers = new Map<string, number>();

  constructor() {
    // Use Factory to get singleton instance instead of creating new instance
    // This ensures consistent resource management and prevents multiple Worker instances
    this.formulaExecutor = FormulaServiceFactory.getExecutor();
  }

  /**
   * 为 FormulaNode 创建并初始化 runner context
   * 如果 context 已存在，会先清理旧状态（停止自动运行、清除结果和错误）
   */
  createContext(
    nodeId: string,
    formulaDefinition: FormulaDefinition,
    dependencies: RunnerDependencies,
    config?: Partial<RunnerConfig>
  ): RunnerContext {
    // 如果 context 已存在，先清理旧状态
    const existingContext = this.contexts.get(nodeId);
    if (existingContext) {
      // 如果正在自动运行，先停止
      if (
        existingContext.config.autoRun ||
        existingContext.state.isAutoRunning
      ) {
        this.stopAutoRun(nodeId);
      }

      // 清除防抖定时器
      const timer = this.debounceTimers.get(nodeId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(nodeId);
      }
    }

    const fullConfig: RunnerConfig = {
      nodeId,
      formulaId: formulaDefinition.id,
      autoRun: false, // 默认关闭自动运行
      debounceMs: 300,
      maxRetries: 3,
      timeout: 10000,
      ...config,
    };

    // 重置为初始状态，清除所有旧的结果和错误
    const initialState: NodeExecutionState = {
      nodeId,
      status: NodeExecutionStatus.IDLE,
      isAutoRunning: false,
      inputValues: {},
      pendingExecution: false,
      lastResult: undefined,
      errorMessage: undefined,
      lastExecutionTime: undefined,
    };

    const context: RunnerContext = {
      nodeId,
      config: fullConfig,
      dependencies,
      state: initialState,
      worker: null,
      updateCallback: existingContext?.updateCallback, // 保留原有的回调函数
    };

    this.contexts.set(nodeId, context);

    return context;
  }

  /**
   * 获取指定节点的执行上下文
   */
  getContext(nodeId: string): RunnerContext | undefined {
    return this.contexts.get(nodeId);
  }

  /**
   * 更新节点的输入值并触发执行（如果启用自动运行）
   */
  updateInputValues(nodeId: string, inputValues: Record<string, any>): void {
    const context = this.contexts.get(nodeId);
    if (!context) return;

    const oldInputValues = context.state.inputValues;
    context.state.inputValues = inputValues;

    // 如果启用自动运行且输入值发生变化，则触发执行
    if (
      context.config.autoRun &&
      this.hasInputValuesChanged(oldInputValues, inputValues)
    ) {
      this.scheduleExecution(nodeId);
    }
  }

  /**
   * 开始自动运行
   */
  startAutoRun(nodeId: string): void {
    const context = this.contexts.get(nodeId);
    if (!context) {
      return;
    }

    context.config.autoRun = true;
    context.state.isAutoRunning = true;

    // 立即更新状态并触发回调
    this.notifyStateUpdate(nodeId);
    this.updateExecutionState(nodeId, NodeExecutionStatus.IDLE);

    // 立即执行一次
    this.scheduleExecution(nodeId);
  }

  /**
   * 停止自动运行
   */
  stopAutoRun(nodeId: string): void {
    const context = this.contexts.get(nodeId);
    if (!context) return;

    context.config.autoRun = false;
    context.state.isAutoRunning = false;

    // 立即更新状态并触发回调
    this.notifyStateUpdate(nodeId);
    this.updateExecutionState(nodeId, NodeExecutionStatus.STOPPED);

    // 清除防抖定时器
    const timer = this.debounceTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(nodeId);
    }
  }

  /**
   * 手动执行节点
   */
  async executeNode(
    nodeId: string,
    inputValues?: Record<string, any>
  ): Promise<RunnerResult> {
    const context = this.contexts.get(nodeId);
    if (!context) {
      return {
        success: false,
        executionTime: 0,
        timestamp: new Date(),
        error: "Context not found",
      };
    }

    // 如果提供了输入值，则更新；否则从上游节点收集数据
    if (inputValues) {
      context.state.inputValues = inputValues;
    } else {
      // 自动收集上游节点的数据
      const collectedInputs = this.collectInputValues(nodeId);
      context.state.inputValues = collectedInputs;
    }

    try {
      this.updateExecutionState(nodeId, NodeExecutionStatus.RUNNING);
      const startTime = performance.now();

      // 获取公式定义并执行
      const formulaStore = useFormulaStore.getState();
      const formulaDefinition = formulaStore.getFormulaDefinition(
        context.config.formulaId
      );

      if (!formulaDefinition) {
        throw new Error(
          `Formula definition not found for ID: ${context.config.formulaId}`
        );
      }

      const result = await this.formulaExecutor.execute(
        formulaDefinition,
        context.state.inputValues
      );

      const executionTime = performance.now() - startTime;

      if (result.success) {
        // 从 outputs 中获取第一个结果作为主要值（用于兼容性）
        const resultValue = result.outputs
          ? Object.values(result.outputs)[0]
          : undefined;
        context.state.lastResult = resultValue;
        context.state.errorMessage = undefined;
        this.updateExecutionState(nodeId, NodeExecutionStatus.SUCCESS);

        // 触发下游节点执行，传递完整的 outputs 对象以便正确更新 OutputNode
        this.triggerDownstreamNodes(nodeId, result.outputs || {});

        return {
          success: true,
          value: resultValue,
          executionTime,
          timestamp: new Date(),
        };
      } else {
        context.state.errorMessage = result.error;
        this.updateExecutionState(nodeId, NodeExecutionStatus.ERROR);

        return {
          success: false,
          executionTime,
          timestamp: new Date(),
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      context.state.errorMessage = errorMessage;
      this.updateExecutionState(nodeId, NodeExecutionStatus.ERROR);

      return {
        success: false,
        executionTime: 0,
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * 清理节点上下文
   */
  disposeContext(nodeId: string): void {
    const context = this.contexts.get(nodeId);
    if (context?.worker) {
      context.worker.terminate();
    }

    const timer = this.debounceTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(nodeId);
    }

    this.contexts.delete(nodeId);
  }

  /**
   * 清理所有上下文
   */
  dispose(): void {
    // 清理所有 worker
    for (const context of this.contexts.values()) {
      if (context.worker) {
        context.worker.terminate();
      }
    }

    // 清理所有定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.contexts.clear();
    this.debounceTimers.clear();
  }

  /**
   * 设置状态更新回调
   */
  setUpdateCallback(
    nodeId: string,
    callback: (state: NodeExecutionState) => void
  ): void {
    const context = this.contexts.get(nodeId);
    if (context) {
      context.updateCallback = callback;
    }
  }

  // 私有方法

  private hasInputValuesChanged(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): boolean {
    const oldKeys = Object.keys(oldValues);
    const newKeys = Object.keys(newValues);

    if (oldKeys.length !== newKeys.length) {
      return true;
    }

    for (const key of oldKeys) {
      if (oldValues[key] !== newValues[key]) {
        return true;
      }
    }

    return false;
  }

  private scheduleExecution(nodeId: string): void {
    const context = this.contexts.get(nodeId);
    if (!context) return;

    // 如果节点正在执行，标记需要重新执行，但不立即安排
    // 这样可以避免在执行过程中重复触发
    if (context.state.status === NodeExecutionStatus.RUNNING) {
      // 清除之前的定时器（如果有）
      const timer = this.debounceTimers.get(nodeId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(nodeId);
      }
      // 标记需要重新执行，executeNode 完成后会检查
      context.state.pendingExecution = true;
      return;
    }

    // 清除之前的定时器
    const timer = this.debounceTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
    }

    // 设置新的防抖定时器
    const newTimer = window.setTimeout(() => {
      this.executeNode(nodeId).finally(() => {
        // 执行完成后检查是否需要重新执行
        const ctx = this.contexts.get(nodeId);
        if (ctx?.state.pendingExecution) {
          ctx.state.pendingExecution = false;
          // 重新收集输入值并执行（因为执行过程中可能有新的输入变化）
          this.scheduleExecution(nodeId);
        }
      });
      this.debounceTimers.delete(nodeId);
    }, context.config.debounceMs);

    this.debounceTimers.set(nodeId, newTimer);
  }

  private updateExecutionState(
    nodeId: string,
    status: NodeExecutionStatus
  ): void {
    const context = this.contexts.get(nodeId);
    if (!context) return;

    context.state.status = status;
    context.state.lastExecutionTime = Date.now();

    // 调用更新回调，传递完整的状态
    if (context.updateCallback) {
      context.updateCallback({ ...context.state });
    }
  }

  /**
   * 通知状态更新（不改变状态，仅触发回调）
   */
  private notifyStateUpdate(nodeId: string): void {
    const context = this.contexts.get(nodeId);
    if (!context) {
      return;
    }

    if (!context.updateCallback) {
      return;
    }

    context.updateCallback({ ...context.state });
  }

  /**
   * 收集上游节点的输入值
   * 根据连接的 edges 和 handleId 映射到对应的输入参数
   * 对于 ObjectNode：收集所有字段并合并成对象
   */
  private collectInputValues(nodeId: string): Record<string, unknown> {
    const context = this.contexts.get(nodeId);
    const { nodes, edges } = useGraphStore.getState();

    // 如果没有 context，可能是非 FormulaNode（如 ObjectNode）
    // 检查节点类型
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return {};

    // 如果是 ObjectNode，需要特殊处理：收集所有字段并合并成对象
    if (node.type === "object") {
      return this.collectObjectNodeValues(nodeId, edges, nodes);
    }

    // FormulaNode 的处理逻辑
    if (!context) return {};

    const inputValues: Record<string, unknown> = {};

    // 遍历所有输入节点
    for (const inputNode of context.dependencies.inputNodes) {
      const sourceNode = nodes.find((n) => n.id === inputNode.nodeId);
      if (!sourceNode) continue;

      // 获取连接边信息，找到对应的 targetHandle（即当前节点的输入参数 key）
      const edge = edges.find(
        (e) =>
          e.source === inputNode.nodeId &&
          e.target === nodeId &&
          e.sourceHandle === inputNode.handleId
      );

      if (!edge) continue;

      // 获取源节点的值
      let sourceValue = sourceNode.data?.value;

      // 如果源节点是 FormulaNode 且有 lastResult，使用 lastResult
      const sourceContext = this.contexts.get(inputNode.nodeId);
      if (sourceContext?.state.lastResult !== undefined) {
        sourceValue = sourceContext.state.lastResult;
      }

      // 如果有 sourceHandle（字段路径），从源值中提取对应字段
      if (inputNode.handleId && sourceValue) {
        sourceValue = this.getByPath(sourceValue, inputNode.handleId);
      }

      // 根据 targetHandle（输入参数 key）映射到输入值
      // 如果没有 targetHandle，使用默认的 "value" 或第一个输入参数
      const inputKey =
        edge.targetHandle || context.dependencies.inputNodes.length === 1
          ? edge.targetHandle || "value"
          : undefined;

      if (inputKey !== undefined) {
        inputValues[inputKey] = sourceValue;
      } else {
        // 如果有多个输入但没有明确的 targetHandle，尝试使用公式定义的输入顺序
        const formulaStore = useFormulaStore.getState();
        const formulaDefinition = formulaStore.getFormulaDefinition(
          context.config.formulaId
        );
        if (formulaDefinition?.inputs) {
          // 找到第一个未设置的输入参数
          const unsetInput = formulaDefinition.inputs.find(
            (input) => inputValues[input.key] === undefined
          );
          if (unsetInput) {
            inputValues[unsetInput.key] = sourceValue;
          }
        }
      }
    }

    return inputValues;
  }

  /**
   * 收集 ObjectNode 的所有字段值并合并成对象
   * ObjectNode 接收多个字段输入，输出一个对象
   */
  private collectObjectNodeValues(
    nodeId: string,
    edges: FormulaEdge[],
    nodes: FormulaNode[]
  ): Record<string, unknown> {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== "object") return {};

    const inputs = node.data?.inputs || [];
    const objectValue: Record<string, unknown> = {};

    // 遍历所有输入字段定义
    for (const input of inputs) {
      const fieldKey = input.key;

      // 找到连接到这个字段的边
      const edge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === fieldKey
      );

      if (!edge) {
        // 如果没有连接，使用默认值
        if (input.default !== undefined) {
          objectValue[fieldKey] = input.default;
        }
        continue;
      }

      // 获取源节点的值
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      let sourceValue = sourceNode.data?.value;

      // 如果源节点是 FormulaNode 且有 lastResult，使用 lastResult
      const sourceContext = this.contexts.get(edge.source);
      if (sourceContext?.state.lastResult !== undefined) {
        sourceValue = sourceContext.state.lastResult;
      }

      // 如果有 sourceHandle（字段路径），从源值中提取对应字段
      if (edge.sourceHandle && sourceValue) {
        sourceValue = this.getByPath(sourceValue, edge.sourceHandle);
      }

      // 将值添加到对象中
      objectValue[fieldKey] = sourceValue;
    }

    return objectValue;
  }

  /**
   * 辅助方法：根据路径获取嵌套对象的值
   */
  private getByPath(obj: unknown, path: string): unknown {
    if (obj == null || typeof obj !== "object") return undefined;
    return path.split(".").reduce<unknown>((acc, key) => {
      if (
        acc &&
        typeof acc === "object" &&
        key in (acc as Record<string, unknown>)
      ) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * 处理上游节点数据变化
   * 当上游节点执行完成或数据更新时，更新下游节点的输入值
   * 对于 ObjectNode：当任何字段变化时，重新合并对象并通知下游
   * 对于 OutputNode：更新其 value 属性以显示公式计算结果
   *
   * @param sourceNodeId - 源节点 ID
   * @param result - 源节点的输出结果（可能是单个值或 outputs 对象）
   * @param visitedNodes - 已访问的节点集合，用于防止循环依赖
   */
  notifyUpstreamNodeChange(
    sourceNodeId: string,
    result: unknown,
    visitedNodes: Set<string> = new Set()
  ): void {
    // 防止循环依赖：如果节点已经在访问路径中，跳过
    if (visitedNodes.has(sourceNodeId)) {
      console.warn(
        `[RunnerService] Circular dependency detected for node: ${sourceNodeId}`
      );
      return;
    }

    // 将当前节点添加到已访问集合
    const currentVisited = new Set(visitedNodes);
    currentVisited.add(sourceNodeId);

    const { edges, nodes } = useGraphStore.getState();

    // 找到所有以 sourceNodeId 作为源的下游节点
    const downstreamEdges = edges.filter(
      (edge) => edge.source === sourceNodeId
    );

    for (const edge of downstreamEdges) {
      const downstreamNodeId = edge.target;
      const downstreamNode = nodes.find((n) => n.id === downstreamNodeId);

      if (!downstreamNode) continue;

      // 如果是 ObjectNode，需要特殊处理：收集所有字段并合并成对象
      if (downstreamNode.type === "object") {
        const objectValue = this.collectObjectNodeValues(
          downstreamNodeId,
          edges,
          nodes
        );

        // 深比较：只有当对象值真正变化时才更新
        const oldValue = downstreamNode.data?.value;
        const hasChanged = this.deepCompare(oldValue, objectValue);

        if (hasChanged) {
          // 更新 ObjectNode 的数据
          const graphStore = useGraphStore.getState();
          graphStore.updateNodeData(downstreamNodeId, {
            value: objectValue,
          });

          // 通知 ObjectNode 的下游节点（传递已访问节点集合）
          this.notifyUpstreamNodeChange(
            downstreamNodeId,
            objectValue,
            currentVisited
          );
        }
        continue;
      }

      // 如果是 OutputNode，需要从 FormulaNode 的 outputs 中提取对应的值
      if (downstreamNode.type === "output") {
        const graphStore = useGraphStore.getState();

        // 优先使用 edge 的 sourceHandle 来指定要传递的 output key（更解耦）
        // 如果没有 sourceHandle，则从 OutputNode 的 id 中提取（向后兼容）
        let outputKey: string;
        if (edge?.sourceHandle) {
          // 使用 edge 的 sourceHandle 作为 output key（解耦方式）
          outputKey = edge.sourceHandle;
        } else {
          // 向后兼容：从 OutputNode 的 id 中提取（格式：output-${key}）
          outputKey = downstreamNodeId.replace("output-", "");
        }

        // 如果 result 是对象（outputs），提取对应的 output 值
        let outputValue: unknown;
        if (result && typeof result === "object" && !Array.isArray(result)) {
          // result 是 outputs 对象，提取对应的 key
          outputValue = (result as Record<string, unknown>)[outputKey];
        } else {
          // result 是单个值（兼容旧逻辑），直接使用
          outputValue = result;
        }

        // 更新 OutputNode 的 value（使用深比较确保正确更新）
        const currentValue = downstreamNode.data?.value;
        const shouldUpdate =
          outputValue !== currentValue ||
          (outputValue === undefined && currentValue !== undefined) ||
          (outputValue !== undefined && currentValue === undefined);

        if (shouldUpdate) {
          graphStore.updateNodeData(downstreamNodeId, {
            value: outputValue,
          });
        }
        continue;
      }

      // FormulaNode 的处理逻辑
      const downstreamContext = this.contexts.get(downstreamNodeId);
      if (!downstreamContext) continue;

      // 收集当前下游节点的所有输入值
      const currentInputs = this.collectInputValues(downstreamNodeId);

      // 根据 targetHandle 更新对应的输入值
      const updatedInputs = { ...currentInputs };

      // 确定要传递的值：如果 result 是 outputs 对象，根据 sourceHandle 提取对应值
      let valueToPass: unknown = result;
      if (result && typeof result === "object" && !Array.isArray(result)) {
        // result 是 outputs 对象
        if (edge?.sourceHandle) {
          // 如果有 sourceHandle，从 outputs 中提取对应的值
          valueToPass = (result as Record<string, unknown>)[edge.sourceHandle];
        } else {
          // 如果没有 sourceHandle，使用第一个值（兼容旧逻辑）
          const outputs = result as Record<string, unknown>;
          valueToPass = Object.values(outputs)[0];
        }
      }

      if (edge?.targetHandle) {
        // 如果有明确的 targetHandle，更新对应参数
        updatedInputs[edge.targetHandle] = valueToPass;
      } else {
        // 如果没有 targetHandle，尝试使用公式定义的第一个输入参数
        const formulaStore = useFormulaStore.getState();
        const formulaDefinition = formulaStore.getFormulaDefinition(
          downstreamContext.config.formulaId
        );
        if (formulaDefinition?.inputs && formulaDefinition.inputs.length > 0) {
          updatedInputs[formulaDefinition.inputs[0].key] = valueToPass;
        } else {
          // 最后兜底：使用 "value" 作为 key
          updatedInputs.value = valueToPass;
        }
      }

      // 更新输入值（如果启用了自动运行，会自动触发执行）
      this.updateInputValues(downstreamNodeId, updatedInputs);
    }
  }

  /**
   * 深比较两个值是否相等
   * 用于检测 ObjectNode 的值是否真正变化
   */
  private deepCompare(value1: unknown, value2: unknown): boolean {
    // 快速路径：引用相等
    if (value1 === value2) return false;

    // null/undefined 检查
    if (value1 == null || value2 == null) {
      return value1 !== value2;
    }

    // 类型检查
    if (typeof value1 !== typeof value2) return true;

    // 原始类型直接比较
    if (
      typeof value1 !== "object" ||
      typeof value2 !== "object" ||
      Array.isArray(value1) !== Array.isArray(value2)
    ) {
      return value1 !== value2;
    }

    // 对象深比较
    try {
      return JSON.stringify(value1) !== JSON.stringify(value2);
    } catch {
      // 如果无法序列化，认为不同
      return true;
    }
  }

  private triggerDownstreamNodes(nodeId: string, result: unknown): void {
    // 通知所有下游节点上游数据已变化
    // notifyUpstreamNodeChange 会收集所有输入值并更新，如果开启自动运行则触发执行
    this.notifyUpstreamNodeChange(nodeId, result);
  }
}
