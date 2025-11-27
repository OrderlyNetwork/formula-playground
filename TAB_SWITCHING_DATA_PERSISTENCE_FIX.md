# 修复：Tab 切换后数据丢失问题

## 问题描述

切换 tab 后再切换回来时，计算结果（`tabCalculationResults`）丢失，虽然输入数据（cell 中的值）还在。

**现象：**

```
1. 在 tab A (unrealizedPnL) 输入数据并计算 → 有结果 ✓
2. 切换到 tab B → tab B 正常
3. 切换回 tab A →
   - Cell 输入值还在 ✓
   - 计算结果消失了 ❌
   - Console: ****** unrealizedPnL unrealizedPnL_0 undefined
```

## 根本原因

在 `formulaDataSheet.tsx` 中，每次 `formula` 改变时都会清空该 formula 的计算结果：

```typescript
// ❌ 错误逻辑：每次 formula 改变都清空
useEffect(() => {
  const formulaChanged = previousFormulaIdRef.current !== formula?.id;
  previousFormulaIdRef.current = formula?.id;

  if (formula && formulaChanged) {
    clearTabResults(formula.id); // ❌ 清空了该 tab 的所有结果
    clearPreArgsCheckMessages(formula.id);
  }
}, [formula, clearTabResults, clearPreArgsCheckMessages]);
```

### 为什么会导致数据丢失？

1. **首次打开 tab A**：`formula.id` 变为 "unrealizedPnL" → `clearTabResults("unrealizedPnL")` → 清空（正常，因为还没数据）
2. **用户输入数据**：`tabCalculationResults["unrealizedPnL"]["unrealizedPnL_0"]` = {...result...} → 有数据了 ✓
3. **切换到 tab B**：`formula.id` 变为 "IMR" → `clearTabResults("IMR")` → 清空 tab B（正常）
4. **切换回 tab A**：`formula.id` 变为 "unrealizedPnL" → `clearTabResults("unrealizedPnL")` → **清空了 tab A 的数据** ❌

### 设计冲突

这个清空逻辑来自于单 tab 模式的设计，当时的意图是：

- 切换 formula 时总是显示空表格
- 用户需要重新输入数据

但在**多 tab 模式**下，这个逻辑是错误的：

- **多 tab 的目的就是保持每个 tab 的独立状态**
- 切换回某个 tab 应该看到之前的数据
- 每个 tab 都有自己的 `tabCalculationResults[formulaId]`

## 解决方案

**移除自动清空逻辑**，让每个 tab 的数据持久化：

```typescript
// ✅ 正确：移除自动清空，保持数据持久化
// Flatten formula inputs for column generation
const flattenedPaths = useMemo(() => {
  if (!formula) return [];
  return flattenFormulaInputs(formula.inputs);
}, [formula?.id]);

// Note: Removed auto-clear logic on formula change
// In multi-tab mode, switching between tabs should preserve each tab's data
// Results are only cleared when:
// 1. User explicitly clears them
// 2. Tab is closed (handled by tab management)
// 3. Formula definition itself changes (not implemented yet)
```

## 何时应该清空数据？

保留 `clearTabResults` 和 `clearTab` 方法，但只在以下场景调用：

### 1. 用户主动清空（需要实现）

```typescript
// 添加清空按钮
<Button onClick={() => clearTabResults(formulaId)}>Clear Results</Button>
```

### 2. 关闭 Tab（已由 tab 管理处理）

```typescript
// 在 formulaTabStore 或 tab 管理组件中
const closeTab = (tabId: string) => {
  clearTab(tabId); // 清空该 tab 的所有数据
  // ... 其他关闭逻辑
};
```

### 3. Formula 定义改变（未来实现）

```typescript
// 当 formula 的 inputs 结构改变时
useEffect(() => {
  if (formulaDefinitionChanged(oldFormula, newFormula)) {
    clearTabResults(formula.id);
  }
}, [formula.inputs]);
```

## 数据流说明

### 修复后的正确流程

```
Tab A (unrealizedPnL):
├── Input Data (GridStore)
│   └── unrealizedPnL_0: { param1: "10", param2: "20" }
└── Calculation Results (spreadsheetStore.tabCalculationResults)
    └── "unrealizedPnL" → "unrealizedPnL_0" → { result: 200, executionTime: 5 }

Tab B (IMR):
├── Input Data (GridStore)
│   └── IMR_0: { param1: "5", param2: "15" }
└── Calculation Results (spreadsheetStore.tabCalculationResults)
    └── "IMR" → "IMR_0" → { result: 75, executionTime: 3 }

切换 Tab A → B → A:
1. 切换到 B: currentFormula = IMR
   - 显示 Tab B 的输入和结果 ✓
2. 切换回 A: currentFormula = unrealizedPnL
   - 显示 Tab A 的输入和结果 ✓ (数据还在！)
```

### 状态管理架构

```typescript
// spreadsheetStore (Zustand)
{
  currentFormula: FormulaDefinition,  // 当前活动的 formula (全局)

  // Per-tab 隔离的数据
  tabCalculationResults: {
    "unrealizedPnL": {
      "unrealizedPnL_0": { result: 200, executionTime: 5 },
      "unrealizedPnL_1": { result: 150, executionTime: 4 }
    },
    "IMR": {
      "IMR_0": { result: 75, executionTime: 3 }
    }
  },

  tabRows: { ... },
  tabColumns: { ... },
  tabGridStores: { ... }
}
```

## 修复的文件

### `src/modules/formula-datasheet/formulaDataSheet.tsx`

- ❌ 移除了 `useEffect` 中的自动清空逻辑
- ❌ 移除了未使用的 imports (`useEffect`, `useRef`, `usePreArgsCheckStore`)
- ✅ 添加了注释说明何时应该清空数据

## 测试场景

✅ **场景 1：Tab 切换数据持久化**

1. 在 tab A 输入数据并计算 → 看到结果
2. 切换到 tab B → 看到 tab B（空或之前的数据）
3. 切换回 tab A → **应该看到之前的输入和计算结果**

✅ **场景 2：多个 Tab 独立状态**

1. 在 tab A 输入数据 A
2. 切换到 tab B，输入数据 B
3. 切换到 tab C，输入数据 C
4. 随意切换 A/B/C → **每个 tab 都保持自己的数据**

✅ **场景 3：新打开的 Tab**

1. 打开新的 tab D → 应该是空表格

## 性能考虑

由于数据现在会持久化在内存中，需要注意：

1. **内存使用**：每个打开的 tab 都保存完整的计算结果
2. **清理机制**：关闭 tab 时应该清理数据（通过 `clearTab`）
3. **未来优化**：可以考虑添加 LRU 缓存或数据持久化到 localStorage

## 相关问题

这个修复也解决了之前的 Zustand getter 响应式问题的**真正根源**：

- 之前认为是 getter 方法不响应式
- 实际上是数据被清空了，导致 getter 返回 `undefined`
- 修复数据持久化后，getter 方法的响应式问题也就不重要了（但仍然建议使用直接访问状态的方式）

## 总结

| 问题                    | 原因                    | 解决方案                  |
| ----------------------- | ----------------------- | ------------------------- |
| Tab 切换后数据丢失      | 每次 formula 改变都清空 | 移除自动清空逻辑          |
| 多 tab 无法保持独立状态 | 单 tab 模式的遗留逻辑   | Per-tab 隔离 + 数据持久化 |
| 内存泄漏风险            | 数据永久保存            | Tab 关闭时清理            |
