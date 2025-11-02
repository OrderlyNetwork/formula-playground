/**
 * Runner 相关类型定义
 * 用于管理 FormulaNode 的执行状态和上下文
 */

export const NodeExecutionStatus = {
  IDLE: 'idle',           // 空闲状态
  RUNNING: 'running',     // 运行中
  SUCCESS: 'success',     // 执行成功
  ERROR: 'error',         // 执行错误
  STOPPED: 'stopped'      // 已停止
} as const;

export type NodeExecutionStatus = typeof NodeExecutionStatus[keyof typeof NodeExecutionStatus];

export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  lastExecutionTime?: number;
  lastResult?: any;
  errorMessage?: string;
  isAutoRunning: boolean;
  inputValues: Record<string, any>;
  pendingExecution?: boolean; // 标记是否有待执行的请求（当节点正在执行时）
}

export interface RunnerConfig {
  nodeId: string;
  formulaId: string;
  autoRun: boolean;
  debounceMs?: number;     // 防抖延迟（毫秒）
  maxRetries?: number;     // 最大重试次数
  timeout?: number;        // 执行超时时间
}

export interface RunnerResult {
  success: boolean;
  value?: any;
  executionTime: number;
  timestamp: Date;
  error?: string;
}

export interface RunnerDependencies {
  inputNodes: Array<{
    nodeId: string;
    handleId?: string;
  }>;
  outputNodes: Array<{
    nodeId: string;
    handleId?: string;
  }>;
}

export interface RunnerContext {
  nodeId: string;
  config: RunnerConfig;
  dependencies: RunnerDependencies;
  state: NodeExecutionState;
  worker: Worker | null;
  updateCallback?: (state: NodeExecutionState) => void;
}