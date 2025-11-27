# Zustand Getter 方法修复说明

## 问题描述

切换 tab 后无法获取原本有数据的 result，即使使用相同的 `formulaId` 和 `rowId`。

## 根本原因

在 `spreadsheetStore.ts` 中使用了 **不响应式的 getter 方法**：

```typescript
// ❌ 错误的方式 - 不响应式
getTabRowResult: (formulaId, rowId) => {
  const state = get();
  const tabResults = state.tabCalculationResults[formulaId] || {};
  return tabResults[rowId];
};

// 组件中使用
const calculationResult = useSpreadsheetStore(
  (state) => state.getTabRowResult(formulaId, rowId) // ❌ Zustand 无法追踪依赖
);
```

### 为什么会出问题？

根据 Zustand 官方文档：

1. **Getter 方法不是响应式的**：当你在 selector 中调用 `state.getTabRowResult(formulaId, rowId)` 时，Zustand 只知道你访问了 `getTabRowResult` 这个函数属性
2. **无法追踪内部依赖**：Zustand 不知道这个 getter 内部实际访问了 `state.tabCalculationResults[formulaId][rowId]`
3. **不会触发重新渲染**：当 `tabCalculationResults[formulaId][rowId]` 更新时，组件不会重新渲染，因为 Zustand 认为你只订阅了 `getTabRowResult` 函数本身

### Zustand 的工作原理

Zustand 使用**浅比较**来检测 selector 返回值的变化：

```typescript
// Zustand 内部逻辑（简化版）
const selector = (state) => state.getTabRowResult(formulaId, rowId);
const oldValue = selector(oldState); // 返回 function getTabRowResult
const newValue = selector(newState); // 返回 function getTabRowResult
// oldValue === newValue (函数引用没变) -> 不重新渲染 ❌
```

## 解决方案

### ✅ 正确方式：直接访问状态

让 Zustand 能够正确追踪依赖：

```typescript
// ✅ 正确的方式 - 响应式
const calculationResult = useSpreadsheetStore((state) => {
  const tabResults = state.tabCalculationResults[formulaId];
  return tabResults ? tabResults[rowId] : undefined;
});
```

现在 Zustand 可以正确追踪：

- 访问了 `state.tabCalculationResults`
- 访问了 `tabResults[rowId]`
- 当这些值变化时会触发重新渲染 ✅

## 修复的文件

### 1. `src/store/spreadsheetStore.ts`

- ✅ 保留 `getTabRowResult` 和 `getRowResult` 方法（用于非响应式场景，如在 actions 中使用）
- ✅ 添加文档注释说明在组件中应该直接访问状态

### 2. `src/pages/datasheet/components/spreadsheet/Cell.tsx`

```typescript
// 修改前 ❌
const calculationResult = useSpreadsheetStore((state) =>
  column.id === "result" ? state.getTabRowResult(formulaId, rowId) : undefined
);

// 修改后 ✅
const calculationResult = useSpreadsheetStore((state) => {
  if (column.id !== "result") return undefined;
  const tabResults = state.tabCalculationResults[formulaId];
  return tabResults ? tabResults[rowId] : undefined;
});
```

### 3. `src/pages/datasheet/components/spreadsheet/ResultCell.tsx`

```typescript
// 修改前 ❌
const calculationResult = useSpreadsheetStore((state) =>
  state.getTabRowResult(formulaId, rowId)
);

// 修改后 ✅
const calculationResult = useSpreadsheetStore((state) => {
  const tabResults = state.tabCalculationResults[formulaId];
  return tabResults ? tabResults[rowId] : undefined;
});
```

## 何时可以使用 getter 方法

Getter 方法仍然可以在**非响应式场景**中使用：

```typescript
// ✅ 在 actions 中使用（不需要响应式）
const someAction = () => {
  const result = get().getTabRowResult(formulaId, rowId);
  // 处理逻辑...
};

// ✅ 在外部函数中使用（不需要响应式）
const result = useSpreadsheetStore.getState().getTabRowResult(formulaId, rowId);
```

## 关键要点

1. **组件中订阅状态**：直接访问 `state.xxx`，让 Zustand 追踪依赖
2. **Actions 中读取状态**：可以使用 `get()` 或 getter 方法
3. **响应式 vs 非响应式**：
   - 需要响应式（组件）→ 直接访问状态
   - 不需要响应式（actions）→ 可以用 getter

## 参考

- [Zustand 官方文档 - Reading State](https://github.com/pmndrs/zustand)
- [Zustand 最佳实践 - Selectors](https://docs.pmnd.rs/zustand/guides/auto-generating-selectors)
