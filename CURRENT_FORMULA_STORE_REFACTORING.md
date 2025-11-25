# CurrentFormula Store 重构总结

## 问题描述

在 `Spreadsheet.tsx` 组件中，`currentFormula` 为 `undefined`，导致公式计算功能无法正常工作。

## 根本原因

在 **playground 页面**和其他一些页面中，`FormulaDataSheet` 组件没有接收到 `formula` prop，导致 `spreadsheetStore` 中的 `currentFormula` 始终为 `undefined`。

## 解决方案

将 `currentFormula` 的管理完全交给 `spreadsheetStore`，各页面负责设置当前公式到 store，组件统一从 store 读取。

## 修改内容

### 1. 修改 `FormulaDataSheet` 组件
**文件**: `src/modules/formula-datasheet/formulaDataSheet.tsx`

- ❌ 删除 `formula` prop
- ✅ 从 `spreadsheetStore` 读取 `currentFormula`
- 📝 添加注释说明 `currentFormula` 由 store 管理

```typescript
// Before:
interface FormulaDataSheetProps {
  formula?: FormulaDefinition;
  className?: string;
}

export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  formula,
  className = "",
}) => {
  // ...
}

// After:
interface FormulaDataSheetProps {
  className?: string;
}

export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  className = "",
}) => {
  // Get formula from store (set by parent components)
  const formula = useSpreadsheetStore((state) => state.currentFormula);
  // ...
}
```

### 2. 修改 `FormulaDetails` 页面
**文件**: `src/pages/formula/details.tsx`

- ✅ 导入 `useSpreadsheetStore`
- ✅ 获取 `setCurrentFormula` 方法
- ✅ 使用 `useEffect` 同步 `currentFormula` 到 store
- ❌ 移除 `<FormulaDataSheet formula={currentFormula} />` 的 prop

```typescript
// 添加导入
import { useSpreadsheetStore } from "@/store/spreadsheetStore";

// 在组件中
const setCurrentFormula = useSpreadsheetStore(
  (state) => state.setCurrentFormula
);

// 计算 currentFormula
const currentFormula = useMemo(() => {
  if (!activeTabId) return undefined;
  return formulaDefinitions.find((f) => f.id === activeTabId);
}, [activeTabId, formulaDefinitions]);

// 同步到 store
useEffect(() => {
  setCurrentFormula(currentFormula);
}, [currentFormula, setCurrentFormula]);

// 使用组件（不传 prop）
<FormulaDataSheet />
```

### 3. 修改 `Playground` 页面
**文件**: `src/pages/playground/index.tsx`

- ✅ 导入 `useSpreadsheetStore`
- ✅ 在 `UserLayout` 中添加公式同步逻辑
- ✅ 从 `formulaStore` 获取 `selectedFormulaId` 和 `formulaDefinitions`
- ✅ 使用 `useEffect` 同步当前公式到 store

```typescript
function UserLayout() {
  useFormulaUrlSync();

  // Get selected formula from formula store
  const { selectedFormulaId, formulaDefinitions } = useFormulaStore();
  
  // Get setCurrentFormula from spreadsheet store
  const setCurrentFormula = useSpreadsheetStore(
    (state) => state.setCurrentFormula
  );

  // Sync currentFormula to spreadsheetStore when selection changes
  useEffect(() => {
    const formula = selectedFormulaId
      ? formulaDefinitions.find((f) => f.id === selectedFormulaId)
      : undefined;
    setCurrentFormula(formula);
  }, [selectedFormulaId, formulaDefinitions, setCurrentFormula]);

  // ... render FormulaDataSheet without prop
  <FormulaDataSheet />
}
```

### 4. 修改 `FormulaTest` 页面
**文件**: `src/pages/formula-test/index.tsx`

- ✅ 导入 `useSpreadsheetStore` 和 `useEffect`
- ✅ 添加公式同步逻辑
- ❌ 移除 `<FormulaDataSheet formula={currentFormula} />` 的 prop

```typescript
// 添加导入
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useEffect } from "react";

// 在组件中
const setCurrentFormula = useSpreadsheetStore(
  (state) => state.setCurrentFormula
);

// Sync currentFormula to spreadsheetStore
useEffect(() => {
  setCurrentFormula(currentFormula);
}, [currentFormula, setCurrentFormula]);

// 使用组件（不传 prop）
<FormulaDataSheet />
```

### 5. 更新文档
**文件**: `src/modules/formula-datasheet/SUMMARY.md`

更新使用示例，说明新的使用方式。

## 架构优势

### Before（旧架构）
```
FormulaDetails
  ├─ 计算 currentFormula (local state)
  └─ <FormulaDataSheet formula={currentFormula}>
       └─ useEffect: setFormulaAndRows()
            └─ spreadsheetStore.currentFormula ✓

Playground
  └─ <FormulaDataSheet> ❌ 没有 formula prop
       └─ spreadsheetStore.currentFormula = undefined ❌
```

### After（新架构）
```
FormulaDetails
  ├─ 计算 currentFormula (local)
  ├─ useEffect: setCurrentFormula(formula) ✓
  └─ <FormulaDataSheet>
       └─ 从 store 读取 ✓

Playground
  ├─ 计算 currentFormula (from selectedFormulaId)
  ├─ useEffect: setCurrentFormula(formula) ✓
  └─ <FormulaDataSheet>
       └─ 从 store 读取 ✓

所有组件都能访问 spreadsheetStore.currentFormula ✓
```

## 好处

1. **✅ 统一数据源**: 所有组件都从同一个 store 读取 `currentFormula`
2. **✅ 解耦**: `FormulaDataSheet` 不再依赖 prop，更加独立
3. **✅ 共享状态**: 其他组件（如 `Spreadsheet`）可以轻松访问当前公式
4. **✅ 一致性**: 不同页面使用相同的模式管理公式
5. **✅ 可维护性**: 逻辑清晰，易于理解和维护

## 测试要点

1. ✅ Formula Details 页面：切换公式 tab 时，表格应该正确更新
2. ✅ Playground 页面：选择公式后，`FormulaDataSheet` 应该正确显示
3. ✅ Formula Test 页面：公式数据应该正确加载
4. ✅ 所有页面：`Spreadsheet` 组件中的 `currentFormula` 不应该为 `undefined`
5. ✅ 计算功能：输入数据后，公式计算应该正常工作

## 兼容性

- ✅ 无 breaking changes（对外部使用者透明）
- ✅ 保持了相同的功能
- ✅ 代码更加清晰和一致

## 相关文件

- `src/pages/formula/details.tsx`
- `src/pages/playground/index.tsx`
- `src/pages/formula-test/index.tsx`
- `src/modules/formula-datasheet/formulaDataSheet.tsx`
- `src/pages/datasheet/components/spreadsheet/Spreadsheet.tsx`
- `src/store/spreadsheetStore.ts`
- `src/modules/formula-datasheet/SUMMARY.md`

---

**日期**: 2025-11-25  
**原因**: 解决 `currentFormula` 为 `undefined` 的问题  
**影响**: 所有使用 `FormulaDataSheet` 的页面

