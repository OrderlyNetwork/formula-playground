# Bug修复总结：Formula切换时数据错乱问题

## ✅ 已修复

Formula切换时DataSheet不再显示旧formula的数据。

## 🐛 问题描述

切换formula时，DataSheet会短暂显示旧formula的数据，导致：
- 新formula的列名 + 旧formula的数据结构 = 数据错乱
- 用户看到不正确的信息

## 🔍 根本原因

**React渲染时序问题：**

```
Props更新（同步） → 组件重新渲染 → useEffect执行 → State更新（异步） → 再次渲染
      ↓                   ↓                                    ↓
  formula='imr'      formula='imr'                       formula='imr'  
                  rows='row-total_value-0' ❌           rows='row-imr-0' ✓
```

在useEffect执行前的渲染期间，formula已经是新的，但rows还是旧的！

## ✅ 解决方案

### 修复1：避免使用过时的Store数据
**文件：** `hooks/useDataSheetRows.ts`

```typescript
// 总是创建空行，不使用可能过时的store数据
const defaultRow = {
  ...createInitialRow(formula, 0),
  id: stableRowId,
};
setRows([defaultRow]);
```

### 修复2：添加匹配检查（关键）
**文件：** `formulaDataSheet.tsx`

```typescript
// 检查rows是否属于当前formula
const rowsBelongToCurrentFormula = rows.length === 0 || 
  rows[0]?.id.includes(formula.id);

// 只有匹配时才渲染表格，否则显示Loading
{rowsBelongToCurrentFormula ? (
  <DataSheetTable ... />
) : (
  <div>Loading...</div>
)}
```

## 📊 修复效果对比

| 修复前 | 修复后 |
|--------|--------|
| ❌ 显示旧formula数据 | ✅ 显示"Loading..." |
| ❌ 列名和数据不匹配 | ✅ 短暂过渡后显示正确数据 |
| ❌ 数据错乱 | ✅ 数据一致 |

## 🧪 测试验证

请测试以下场景：
- [x] 在不同formula之间快速切换
- [x] 切换时观察是否出现数据错乱
- [x] 确认只看到短暂的"Loading..."

## 📝 修改的文件

1. `src/modules/formula-datasheet/formulaDataSheet.tsx` - 添加匹配检查
2. `src/modules/formula-datasheet/hooks/useDataSheetRows.ts` - 初始化逻辑优化
3. `src/modules/formula-datasheet/BUGFIX.md` - 详细的技术文档
4. `src/modules/formula-datasheet/BUGFIX-SUMMARY.md` - 本文档

## 💡 经验教训

1. **Props是同步的，State是异步的** - 需要考虑过渡状态
2. **添加调试日志帮助定位时序问题** - 看到了真实的渲染顺序
3. **永远不要假设Props和State总是同步的** - 添加验证逻辑

## 🎯 后续改进建议

- 可以改进Loading UI，使用骨架屏而不是简单文字
- 考虑使用`useSyncExternalStore`优化状态同步
- 添加单元测试覆盖formula切换场景

