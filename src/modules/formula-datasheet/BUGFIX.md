# Bug Fix: Formula切换时数据不更新

## 问题描述

重构后，点击公式跳转时，dataSheet没有渲染为新的公式数据，一直显示旧公式的数据。

## 根本原因分析

通过添加调试日志发现了真正的问题：

### 时序问题（主要问题）

**React渲染和状态更新的时序不同步：**

```
1. 用户点击切换formula (从totalValue切换到IMR)
2. formula prop立即变化 (同步)
3. 组件重新渲染 render 2-3
   - formulaId = 'imr' (新的)
   - rows = 'row-total_value-0' (旧的) ❌ 不匹配！
4. useEffect执行，检测到formula变化
5. setRows更新rows state (异步)
6. 组件重新渲染 render 4
   - formulaId = 'imr' (新的)
   - rows = 'row-imr-0' (新的) ✓ 匹配
```

**实际日志证据：**
```
Render 2: formulaId='imr', rows='row-total_value-0' ❌
Render 3: formulaId='imr', rows='row-total_value-0' ❌
[useEffect triggers, creates new row]
Render 4: formulaId='imr', rows='row-imr-0' ✓
```

**问题：** 在render 2-3期间，表格显示的是旧formula（totalValue）的列结构，但数据是新formula（IMR）的列名，造成数据错乱！

### 次要问题（已修复）

初始化时使用了store中可能过时的`currentInputs`、`tsResult`、`error`值。

## 修复方案

### 修复1：避免使用过时的store数据

修改`useDataSheetRows`中的初始化逻辑，总是创建空行：

```typescript
// Always create a default empty row when formula changes
// This prevents using stale data from previous formula
const defaultRow = {
  ...createInitialRow(formula, 0),  // ✅ 总是创建空行
  id: stableRowId,
};
setRows([defaultRow]);
```

### 修复2：防止渲染不匹配的数据（关键修复）

在`formulaDataSheet.tsx`中添加检查，确保rows属于当前formula：

```typescript
// Check if rows belong to current formula
// This prevents showing stale data during formula switches
const rowsBelongToCurrentFormula = rows.length === 0 || 
  rows[0]?.id.includes(formula.id);

return (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-hidden">
      {rowsBelongToCurrentFormula ? (
        <DataSheetTable ... />  // ✅ 只有匹配时才渲染
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading...  // ✅ 不匹配时显示loading
        </div>
      )}
    </div>
  </div>
);
```

**工作原理：**
1. formula prop变化（同步）
2. 组件渲染，检测到 `rows[0].id` 不包含 `formula.id`
3. 显示 "Loading..." 而不是错误的表格
4. useEffect执行，更新rows（异步）
5. 重新渲染，rows匹配，显示正确的表格

## 修复效果

✅ Formula切换时不会显示错误的旧数据
✅ 在rows更新前显示"Loading..."过渡状态
✅ 避免旧formula列结构和新formula数据混合显示
✅ 总是显示新formula的空行（避免使用过时store数据）
✅ 自动计算逻辑会在需要时填充结果
✅ 保持了stable row ID的功能

## 修复前后对比

### 修复前
```
1. 点击切换formula (totalValue -> IMR)
2. Render: formulaId='imr', rows='row-total_value-0' ❌
   显示：IMR的列名 + totalValue的数据结构 = 错乱
3. Render: formulaId='imr', rows='row-total_value-0' ❌
   显示：IMR的列名 + totalValue的数据结构 = 错乱
4. [useEffect更新rows]
5. Render: formulaId='imr', rows='row-imr-0' ✓
   显示：IMR的正确数据
```

### 修复后
```
1. 点击切换formula (totalValue -> IMR)
2. Render: formulaId='imr', rows='row-total_value-0'
   检测不匹配 -> 显示 "Loading..." ✓
3. Render: formulaId='imr', rows='row-total_value-0'
   检测不匹配 -> 显示 "Loading..." ✓
4. [useEffect更新rows]
5. Render: formulaId='imr', rows='row-imr-0'
   匹配 -> 显示 IMR的正确数据 ✓
```

## 测试建议

手动测试以下场景：
1. ✅ 切换不同的formula，确认短暂显示Loading后显示新formula空行
2. ✅ 在formula A输入数据，切换到formula B，确认显示Loading然后是空行
3. ✅ 快速切换多个formula，确认不会出现数据错乱
4. ✅ 切换回formula A，确认是空行（数据不会保留）
5. ✅ 输入数据后，自动计算功能正常工作

## 相关文件

- `src/modules/formula-datasheet/hooks/useDataSheetRows.ts` - 修复1：初始化逻辑
- `src/modules/formula-datasheet/formulaDataSheet.tsx` - 修复2：添加匹配检查（关键）

## 学到的经验

1. **React渲染是同步的，但状态更新是异步的**
   - Props变化立即触发重新渲染
   - setState更新要等到下次渲染才生效
   - useEffect在渲染后执行

2. **需要考虑状态转换期间的UI**
   - 不要假设props和state总是同步的
   - 添加过渡状态（loading）来处理不一致

3. **调试日志非常重要**
   - 添加详细的日志帮助定位时序问题
   - 记录render次数和状态变化

