# 代码审查报告 - FormulaServiceFactory 及相关代码

## 📋 审查范围

- `src/services/FormulaServiceFactory.ts`
- `src/modules/formula-executor/index.ts`
- `src/modules/formula-graph/services/runnerService.ts`
- `src/store/BaseFormulaStore.ts`
- 相关依赖文件

---

## 🔍 发现的问题

### 1. 重复逻辑 (Code Duplication)

#### 1.1 FormulaServiceFactory 中的重复单例模式

**位置**: `FormulaServiceFactory.ts:17-32`

```17:32:src/services/FormulaServiceFactory.ts
  static getParser(): FormulaParser {
    if (!this.parserInstance) {
      this.parserInstance = new FormulaParser();
    }
    return this.parserInstance;
  }

  /**
   * Get or create the FormulaExecutor singleton instance
   */
  static getExecutor(): FormulaExecutor {
    if (!this.executorInstance) {
      this.executorInstance = new FormulaExecutor();
    }
    return this.executorInstance;
  }
```

**问题**: `getParser()` 和 `getExecutor()` 使用相同的懒加载单例模式，存在重复代码。

**影响**:

- 代码可维护性差，如需修改单例逻辑需要修改多处
- 违反 DRY 原则

---

#### 1.2 FormulaExecutor 中 Worker 执行的重复逻辑

**位置**: `formula-executor/index.ts:46-111`

```46:76:src/modules/formula-executor/index.ts
  async executeTS(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    if (!this.tsWorker) {
      return {
        success: false,
        error: "TS Worker not initialized",
        durationMs: 0,
        engine: "ts",
      };
    }

    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent<FormulaExecutionResult>) => {
        if (this.tsWorker) {
          this.tsWorker.removeEventListener("message", handleMessage);
        }
        resolve(event.data);
      };

      if (this.tsWorker) {
        this.tsWorker.addEventListener("message", handleMessage);
      }

      const request: FormulaExecutionRequest = { formula, inputs };
      if (this.tsWorker) {
        this.tsWorker.postMessage(request);
      }
    });
  }
```

`executeLocal()` 方法（81-111 行）有几乎相同的实现，只是使用了 `localWorker` 而不是 `tsWorker`。

**问题**: 两个方法有 90%以上的重复代码，仅差异在于：

- Worker 实例 (`tsWorker` vs `localWorker`)
- 错误消息中的引擎名称 ("TS Worker" vs "Local Worker")
- 返回结果中的 `engine` 字段 ("ts" vs "local")

**影响**:

- 代码冗余，增加维护成本
- 如果需要在 Worker 通信中添加重试、超时等功能，需要修改多处

---

#### 1.3 BaseFormulaStore 中重复的错误处理模式

**位置**: `BaseFormulaStore.ts` 多个方法

在 `executeFormulaBase()`, `loadHistoryBase()`, `clearHistoryBase()`, `replayHistoryRecordBase()`, `parseFormulasBase()` 中都存在相同的错误处理模式：

```typescript
try {
  // ... 业务逻辑 ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Failed to ...";
  return {
    success: false,
    error: errorMessage,
  };
}
```

**问题**: 错误处理逻辑重复，每个方法都需要手动处理错误转换。

**影响**:

- 错误消息不一致的风险
- 如果需要添加错误日志、错误上报等功能，需要修改多处

---

#### 1.4 RunnerService 中重复的 Context 获取和验证

**位置**: `runnerService.ts` 多个方法

在 `updateInputValues()`, `startAutoRun()`, `stopAutoRun()`, `executeNode()`, `setUpdateCallback()` 等方法中都存在：

```typescript
const context = this.contexts.get(nodeId);
if (!context) {
  // 返回或跳过
  return;
}
```

**问题**: Context 获取和空值检查逻辑重复。

**影响**:

- 代码冗余
- 如果需要添加更复杂的验证逻辑，需要修改多处

---

### 2. 相互冲突的逻辑 (Conflicting Logic)

#### 2.1 单例模式被绕过

**位置**: `runnerService.ts:25-27`

```25:27:src/modules/formula-graph/services/runnerService.ts
  constructor() {
    this.formulaExecutor = new FormulaExecutor();
  }
```

**问题**: `RunnerService` 直接创建了新的 `FormulaExecutor` 实例，而不是使用 `FormulaServiceFactory.getExecutor()`，破坏了单例模式的设计意图。

**影响**:

- 可能存在多个 `FormulaExecutor` 实例，每个实例都有自己的 Worker，浪费资源
- 违背了 `FormulaServiceFactory` 的设计目的
- 可能导致 Worker 管理混乱

**同样的问题**:

- `generateFormulaConfig.ts:216`: `const parser = new FormulaParser();`
- `github-ast-worker.ts:38`: `const parser = new FormulaParser();`

---

#### 2.2 reset() 方法不完整

**位置**: `FormulaServiceFactory.ts:44-47`

```44:47:src/services/FormulaServiceFactory.ts
  static reset(): void {
    this.parserInstance = null;
    this.executorInstance = null;
  }
```

**问题**:

- `reset()` 方法只重置了 `parserInstance` 和 `executorInstance`，但没有重置 `historyManagerInstance`
- 如果 `FormulaExecutor` 有 `destroy()` 方法（确实有），`reset()` 应该调用它来清理 Worker

**影响**:

- 测试时可能导致资源泄漏
- 不完整的重置可能影响测试的隔离性

---

#### 2.3 FormulaExecutor 的 Worker 生命周期管理不一致

**位置**: `formula-executor/index.ts`

**问题**:

- `FormulaExecutor` 有 `destroy()` 方法来清理 Worker
- 但 `FormulaServiceFactory.reset()` 只是将引用设为 `null`，没有调用 `destroy()`
- 如果 `FormulaExecutor` 被重新创建，旧的 Worker 可能仍然存在

**影响**:

- 资源泄漏风险
- Worker 可能无法正确清理

---

### 3. 设计模式问题 (Design Pattern Issues)

#### 3.1 单例模式实现不够严格

**位置**: `FormulaServiceFactory.ts`

**问题**:

- 使用静态方法实现单例，但无法防止外部直接 `new FormulaParser()` 或 `new FormulaExecutor()`
- 单例的生命周期管理不完整

**建议**:

- 考虑使用更严格的单例模式（如私有构造函数 + 静态实例）
- 或者接受现状，但确保所有地方都通过 Factory 获取实例

---

#### 3.2 Worker 执行逻辑缺乏抽象

**位置**: `formula-executor/index.ts`

**问题**: `executeTS()` 和 `executeLocal()` 的重复代码表明需要更高级的抽象。

**建议**:

- 使用**模板方法模式**（Template Method Pattern）提取公共逻辑
- 或使用**策略模式**（Strategy Pattern）封装不同 Worker 的执行策略

---

#### 3.3 错误处理缺乏统一机制

**位置**: `BaseFormulaStore.ts`

**问题**: 每个方法都重复实现错误处理。

**建议**:

- 使用**装饰器模式**（Decorator Pattern）或**AOP**思想统一错误处理
- 或创建通用的错误处理工具函数

---

## 🎯 优化建议和重构方向

### 建议 1: 提取通用的单例获取逻辑

**重构**: `FormulaServiceFactory.ts`

```typescript
/**
 * Generic singleton getter using a factory function
 */
private static getOrCreateSingleton<T>(
  instance: T | null,
  factory: () => T
): T {
  if (!instance) {
    instance = factory();
  }
  return instance;
}
```

**好处**:

- 消除重复代码
- 统一单例创建逻辑
- 易于扩展新的服务

---

### 建议 2: 提取 Worker 执行通用逻辑

**重构**: `formula-executor/index.ts`

创建私有方法 `executeWithWorker()`:

```typescript
private async executeWithWorker(
  worker: Worker | null,
  formula: FormulaDefinition,
  inputs: Record<string, any>,
  engine: "ts" | "local"
): Promise<FormulaExecutionResult> {
  if (!worker) {
    return {
      success: false,
      error: `${engine.toUpperCase()} Worker not initialized`,
      durationMs: 0,
      engine,
    };
  }

  return new Promise((resolve) => {
    const handleMessage = (event: MessageEvent<FormulaExecutionResult>) => {
      worker.removeEventListener("message", handleMessage);
      resolve(event.data);
    };

    worker.addEventListener("message", handleMessage);
    const request: FormulaExecutionRequest = { formula, inputs };
    worker.postMessage(request);
  });
}
```

然后 `executeTS()` 和 `executeLocal()` 可以简化为：

```typescript
async executeTS(formula: FormulaDefinition, inputs: Record<string, any>) {
  return this.executeWithWorker(this.tsWorker, formula, inputs, "ts");
}

async executeLocal(formula: FormulaDefinition, inputs: Record<string, any>) {
  return this.executeWithWorker(this.localWorker, formula, inputs, "local");
}
```

**好处**:

- 消除重复代码
- 统一 Worker 通信逻辑
- 易于添加超时、重试等功能

---

### 建议 3: 统一错误处理

**重构**: `BaseFormulaStore.ts`

创建工具方法：

```typescript
/**
 * Wrap async operation with standard error handling
 */
private async withErrorHandling<T>(
  operation: () => Promise<T>,
  defaultErrorMessage: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : defaultErrorMessage;
    return { success: false, error: errorMessage };
  }
}
```

**好处**:

- 统一错误处理逻辑
- 易于添加错误日志、上报等功能
- 代码更简洁

---

### 建议 4: 修复单例模式破坏问题

**重构**: `runnerService.ts`

```typescript
import { FormulaServiceFactory } from "../../services/FormulaServiceFactory";

export class RunnerService {
  private formulaExecutor: FormulaExecutor;

  constructor() {
    // 使用 Factory 获取单例实例
    this.formulaExecutor = FormulaServiceFactory.getExecutor();
  }
}
```

**同样修复**:

- `generateFormulaConfig.ts`: 使用 `FormulaServiceFactory.getParser()`
- `github-ast-worker.ts`: 这个文件在 Worker 中，可能需要特殊处理（Worker 中可能无法使用单例）

**好处**:

- 确保单例模式的一致性
- 减少资源浪费
- 统一管理服务实例

---

### 建议 5: 完善 reset() 方法

**重构**: `FormulaServiceFactory.ts`

```typescript
static reset(): void {
  // 清理 Executor 的 Worker 资源
  if (this.executorInstance) {
    this.executorInstance.destroy();
  }

  this.parserInstance = null;
  this.executorInstance = null;

  // historyManager 通常是全局单例，不需要重置
  // 如果需要重置，可以添加清理逻辑
}
```

**好处**:

- 正确清理资源
- 避免资源泄漏
- 测试隔离性更好

---

### 建议 6: 添加 Context 获取辅助方法

**重构**: `runnerService.ts`

```typescript
/**
 * Get context with validation, throw error if not found
 */
private getContextOrThrow(nodeId: string): RunnerContext {
  const context = this.contexts.get(nodeId);
  if (!context) {
    throw new Error(`Context not found for node: ${nodeId}`);
  }
  return context;
}

/**
 * Get context, return null if not found (for optional operations)
 */
private getContext(nodeId: string): RunnerContext | null {
  return this.contexts.get(nodeId) || null;
}
```

**好处**:

- 统一 Context 获取逻辑
- 更好的错误信息
- 减少重复代码

---

## 📊 优先级建议

### 高优先级 (立即修复)

1. ✅ **修复单例模式破坏问题** - 影响资源管理和设计一致性
2. ✅ **提取 Worker 执行通用逻辑** - 消除大量重复代码
3. ✅ **完善 reset() 方法** - 避免资源泄漏

### 中优先级 (计划修复)

4. ✅ **统一错误处理** - 提高代码质量和可维护性
5. ✅ **提取单例获取逻辑** - 改善代码结构

### 低优先级 (可选优化)

6. ✅ **添加 Context 辅助方法** - 代码质量改进
7. ✅ **考虑更严格的单例模式** - 长期架构改进

---

## 🎨 代码质量评估

### 可读性: ⭐⭐⭐⭐ (4/5)

- 代码结构清晰
- 注释充分
- 命名规范

### 可维护性: ⭐⭐⭐ (3/5)

- 存在重复代码
- 单例模式使用不一致
- 需要改进

### 可扩展性: ⭐⭐⭐⭐ (4/5)

- 整体架构合理
- Factory 模式便于扩展
- 部分重复代码可能影响扩展

### 性能: ⭐⭐⭐⭐ (4/5)

- 单例模式使用不一致可能导致资源浪费
- Worker 管理需要优化

---

## 📝 总结

代码整体质量良好，但存在以下主要问题：

1. **重复逻辑**：多处存在可抽取的重复代码
2. **单例模式不一致**：部分代码绕过了 Factory，破坏了设计意图
3. **资源管理不完整**：reset() 方法未正确清理资源

建议按照优先级逐步重构，重点解决单例模式破坏和 Worker 执行逻辑重复的问题。
