# Per-Tab 隔离实现总结

## 概述

成功实现了完整的 per-tab 数据隔离，现在每个 formula tab 都有独立的数据存储，互不干扰。

## 实现的改动

### 1. **spreadsheetStore.ts** - 核心状态管理

#### 新增 Per-Tab 状态

```typescript
interface SpreadsheetState {
  // Per-tab UI state
  tabColumns: Record<string, ColumnDef[]>; // formulaId -> columns
  tabColumnsReady: Record<string, boolean>; // formulaId -> isReady
  tabRows: Record<string, RowDef[]>; // formulaId -> rows
  tabCalculationResults: Record<string, CalculationResults>; // formulaId -> results
  tabGridStores: Record<string, GridStore>; // formulaId -> GridStore instance

  // Legacy global state (保留向后兼容)
  columns;
  rows;
  calculationResults;
  isColumnsReady;
}
```

#### 新增方法

- **GridStore 管理**
  - `getOrCreateTabGridStore(formulaId, rows, columns, onCalculate)` - 获取或创建 tab 的 GridStore
  - `getTabGridStore(formulaId)` - 获取 GridStore 实例
- **Per-Tab 数据操作**
  - `setTabColumns(formulaId, columns)` / `getTabColumns(formulaId)`
  - `setTabRows(formulaId, rows)` / `getTabRows(formulaId)`
  - `setTabColumnsReady(formulaId, ready)` / `getTabColumnsReady(formulaId)`
  - `setTabCalculationResults(formulaId, results)` / `getTabCalculationResults(formulaId)`
  - `setTabRowResult(formulaId, rowId, result)` / `getTabRowResult(formulaId, rowId)`
- **Per-Tab 行操作**
  - `addTabRow(formulaId, afterRowId?, gridStore?, columns?)` - 添加行
  - `deleteTabRow(formulaId, rowId)` - 删除行
- **Per-Tab 清理**
  - `clearTabResults(formulaId)` - 清除特定 tab 的计算结果
  - `clearTab(formulaId)` - 清除特定 tab 的所有数据

### 2. **Spreadsheet.tsx** - 主要表格组件

#### 关键改动

```typescript
// Before: 使用全局状态
const columns = useSpreadsheetStore((state) => state.columns);
const rows = useSpreadsheetStore((state) => state.rows);

// After: 使用 per-tab 状态
const formulaId = currentFormula?.id || "default";
const columns = useSpreadsheetStore((state) => state.getTabColumns(formulaId));
const rows = useSpreadsheetStore((state) => state.getTabRows(formulaId));
```

#### GridStore 管理

- 从组件本地 `useRef` 改为从 store 获取/创建
- `getOrCreateTabGridStore(formulaId, ...)` 确保每个 tab 有独立的 GridStore 实例

#### 计算结果存储

```typescript
// Before: 全局
setRowResult(rowId, result);

// After: Per-tab
setTabRowResult(formulaId, rowId, result);
```

### 3. **FormulaDataSheet.tsx** - 公式数据表

#### 智能清理逻辑

```typescript
// Before: 清除所有 tabs 的数据
clearAllResults();

// After: 只清除当前 tab 的数据
clearTabResults(formula.id);
```

### 4. **Cell.tsx & ResultCell.tsx** - 单元格组件

#### Per-Tab 结果读取

```typescript
// Before: 全局查找
const result = useSpreadsheetStore((state) => state.calculationResults[rowId]);

// After: Per-tab 查找
const formulaId = currentFormula?.id || "default";
const result = useSpreadsheetStore((state) =>
  state.getTabRowResult(formulaId, rowId)
);
```

## 数据隔离架构

### 三层隔离结构

```
┌─────────────────────────────────────────────────────────┐
│ SpreadsheetStore (Zustand)                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Formula Tab 1 (formulaId: "sum")                    │ │
│ │ - tabColumns["sum"]: ColumnDef[]                    │ │
│ │ - tabRows["sum"]: RowDef[]                          │ │
│ │ - tabCalculationResults["sum"]: {rowId -> result}   │ │
│ │ - tabGridStores["sum"]: GridStore instance          │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Formula Tab 2 (formulaId: "average")                │ │
│ │ - tabColumns["average"]: ColumnDef[]                │ │
│ │ - tabRows["average"]: RowDef[]                      │ │
│ │ - tabCalculationResults["average"]: {...}           │ │
│ │ - tabGridStores["average"]: GridStore instance      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 数据流

1. **输入数据**: GridStore (per-tab instance) - 单一数据源
2. **行结构**: `tabRows[formulaId]` - per-tab 行定义
3. **列定义**: `tabColumns[formulaId]` - per-tab 列定义
4. **计算结果**: `tabCalculationResults[formulaId][rowId]` - per-tab 结果映射

## 向后兼容性

保留了全局状态和方法，以支持可能还在使用旧 API 的组件：

- `columns`, `rows`, `calculationResults` (legacy global state)
- `setColumns()`, `setRows()`, `setRowResult()` (legacy methods)

## 测试建议

### 多 Tab 隔离测试

1. 打开多个 formula tabs
2. 在每个 tab 中输入不同的数据
3. 切换 tabs，验证数据互不影响
4. 在一个 tab 中添加/删除行，其他 tab 不受影响
5. 计算结果应该按 tab 隔离存储

### 清理逻辑测试

1. 切换 formula，验证只清除当前 tab 的结果
2. 关闭 tab，验证对应的数据被清理
3. 重新打开 tab，验证数据重新初始化

## 性能优化

1. **O(1) 查找**: 使用 `Record<formulaId, Record<rowId, result>>` 结构
2. **惰性创建**: GridStore 只在需要时创建 (`getOrCreateTabGridStore`)
3. **精确更新**: 只更新当前 tab 的数据，不触发其他 tab 重渲染

## 下一步改进

### 优先级改进

1. **Tab 生命周期管理**: 实现 tab 关闭时自动清理数据
2. **数据持久化**: 考虑将 per-tab 数据保存到 IndexedDB
3. **内存优化**: 实现 tab 数据的懒加载和卸载策略
4. **类型安全**: 添加更严格的 TypeScript 类型检查

### 可扩展的 Per-Tab 功能清单

#### 1. 数据持久化与恢复

- `saveTabState(formulaId)` - 将 tab 状态保存到 IndexedDB
- `restoreTabState(formulaId)` - 从 IndexedDB 恢复 tab 状态
- `exportTabData(formulaId, format)` - 导出为 CSV/JSON/Excel
- `importTabData(formulaId, data)` - 从文件导入数据

#### 2. Tab 生命周期管理

- `activateTab(formulaId)` - 激活 tab（懒加载数据）
- `deactivateTab(formulaId)` - 休眠 tab（释放内存但保留元数据）
- `closeTab(formulaId)` - 完全关闭并清理 tab
- `duplicateTab(formulaId, newFormulaId)` - 复制 tab 的所有数据

#### 3. 批量操作

- `copyRowsBetweenTabs(sourceFormulaId, targetFormulaId, rowIds)` - 跨 tab 复制行
- `moveRowsBetweenTabs(...)` - 跨 tab 移动行
- `mergeTabResults(formulaIds)` - 合并多个 tab 的计算结果
- `compareTabData(formulaId1, formulaId2)` - 对比两个 tab 的数据差异

#### 4. 撤销/重做 (Per-Tab)

```typescript
tabHistory: Record<formulaId, HistoryStack>; // 每个 tab 独立的历史记录
```

- `undoTabAction(formulaId)` - tab 级别的撤销
- `redoTabAction(formulaId)` - tab 级别的重做
- `getTabHistory(formulaId)` - 获取 tab 的操作历史
- `clearTabHistory(formulaId)` - 清空历史记录

#### 5. 性能监控 (Per-Tab)

```typescript
tabMetrics: Record<
  formulaId,
  {
    calculationTime: number[];
    memoryUsage: number;
    rowCount: number;
    columnCount: number;
    lastActiveTime: number;
  }
>;
```

- `getTabPerformanceReport(formulaId)` - 获取性能报告
- `trackTabMetrics(formulaId, metric)` - 追踪性能指标
- `resetTabMetrics(formulaId)` - 重置性能统计

#### 6. 数据验证 (Per-Tab)

```typescript
tabValidationRules: Record<formulaId, Record<columnId, ValidationRule>>;
```

- `validateTabData(formulaId)` - 验证整个 tab 的数据
- `getTabValidationErrors(formulaId)` - 获取验证错误列表
- `setTabValidationRule(formulaId, columnId, rule)` - 设置列级验证规则
- `removeTabValidationRule(formulaId, columnId)` - 移除验证规则

#### 7. 过滤和排序 (Per-Tab)

```typescript
tabFilters: Record<formulaId, FilterConfig>;
tabSortConfig: Record<formulaId, SortConfig>;
```

- `filterTabRows(formulaId, predicate)` - 过滤行
- `sortTabRows(formulaId, columnId, direction)` - 排序
- `clearTabFilters(formulaId)` - 清除过滤器
- `getFilteredTabRows(formulaId)` - 获取过滤后的行

#### 8. 协作功能 (Per-Tab)

```typescript
tabLocks: Record<formulaId, { userId: string; timestamp: number }>;
tabCollaborators: Record<formulaId, Set<string>>;
```

- `lockTab(formulaId, userId)` - 锁定 tab（多人协作）
- `unlockTab(formulaId)` - 解锁 tab
- `getTabCollaborators(formulaId)` - 获取正在编辑的用户
- `broadcastTabChange(formulaId, change)` - 广播变更

#### 9. 版本控制 (Per-Tab)

```typescript
tabVersions: Record<
  formulaId,
  Array<{
    id: string;
    timestamp: number;
    label: string;
    snapshot: TabState;
  }>
>;
```

- `createTabSnapshot(formulaId, label)` - 创建快照
- `restoreTabVersion(formulaId, versionId)` - 恢复到某个版本
- `compareTabVersions(formulaId, v1, v2)` - 对比版本差异
- `listTabVersions(formulaId)` - 列出所有版本

#### 10. 智能建议 (Per-Tab)

```typescript
tabSuggestions: Record<formulaId, Record<columnId, string[]>>;
```

- `getTabAutocomplete(formulaId, columnId, prefix)` - 列的自动完成选项
- `detectTabPatterns(formulaId)` - 检测数据模式
- `suggestTabOptimizations(formulaId)` - 优化建议
- `learnFromTabInput(formulaId, columnId, value)` - 从输入学习

#### 11. 条件格式化 (Per-Tab)

```typescript
tabFormatRules: Record<
  formulaId,
  Array<{
    condition: (value: any) => boolean;
    style: CellStyle;
  }>
>;
```

- `setTabCellFormat(formulaId, condition, style)` - 设置条件格式
- `highlightTabErrors(formulaId)` - 高亮错误单元格
- `applyTabTheme(formulaId, theme)` - 应用主题
- `clearTabFormatting(formulaId)` - 清除所有格式

#### 12. 数据分析 (Per-Tab)

- `getTabStatistics(formulaId, columnId)` - 获取统计信息（均值、中位数等）
- `generateTabChart(formulaId, config)` - 生成图表数据
- `detectTabOutliers(formulaId, columnId)` - 检测异常值
- `getTabDataQuality(formulaId)` - 数据质量评分
- `analyzeTabTrends(formulaId, columnId)` - 趋势分析

#### 13. 搜索和导航 (Per-Tab)

- `searchTabCells(formulaId, query)` - 全文搜索
- `findTabReferences(formulaId, value)` - 查找引用
- `getTabCellDependencies(formulaId, rowId)` - 获取单元格依赖关系
- `jumpToTabCell(formulaId, rowId, colId)` - 跳转到指定单元格
- `highlightTabMatches(formulaId, searchTerm)` - 高亮匹配项

#### 14. 批注和备注 (Per-Tab)

```typescript
tabComments: Record<
  formulaId,
  Record<
    cellKey,
    Array<{
      id: string;
      author: string;
      text: string;
      timestamp: number;
      resolved: boolean;
    }>
  >
>;
```

- `addTabCellComment(formulaId, rowId, colId, comment)` - 添加批注
- `getTabComments(formulaId)` - 获取所有批注
- `resolveTabComment(formulaId, commentId)` - 标记批注为已解决
- `deleteTabComment(formulaId, commentId)` - 删除批注

#### 15. 内存管理

```typescript
tabMemoryUsage: Record<
  formulaId,
  {
    gridStoreSize: number;
    rowDataSize: number;
    calculationResultsSize: number;
    totalSize: number;
  }
>;
```

- `getTabMemoryUsage(formulaId)` - 获取内存使用情况
- `optimizeTabMemory(formulaId)` - 优化内存使用
- `unloadInactiveTabs(thresholdMs)` - 卸载不活跃的 tabs
- `preloadTab(formulaId)` - 预加载 tab 数据
- `estimateTabSize(formulaId)` - 估算 tab 大小

#### 16. 自定义视图 (Per-Tab)

```typescript
tabViews: Record<
  formulaId,
  Record<
    viewName,
    {
      filters: FilterConfig;
      sort: SortConfig;
      hiddenColumns: string[];
      columnWidths: Record<string, number>;
    }
  >
>;
```

- `saveTabView(formulaId, viewName, config)` - 保存当前视图
- `loadTabView(formulaId, viewName)` - 加载保存的视图
- `deleteTabView(formulaId, viewName)` - 删除视图
- `shareTabView(formulaId, viewId)` - 分享视图配置

#### 17. 公式依赖追踪 (Per-Tab)

```typescript
tabDependencyGraph: Record<
  formulaId,
  {
    nodes: Map<rowId, DependencyNode>;
    edges: Array<{ from: rowId; to: rowId }>;
  }
>;
```

- `trackTabCalculationChain(formulaId)` - 追踪计算链
- `findTabCircularDependencies(formulaId)` - 检测循环依赖
- `optimizeTabCalculationOrder(formulaId)` - 优化计算顺序
- `visualizeTabDependencies(formulaId)` - 可视化依赖关系

#### 18. 数据同步 (Per-Tab)

```typescript
tabSyncStatus: Record<
  formulaId,
  {
    lastSyncTime: number;
    isDirty: boolean;
    pendingChanges: Change[];
    conflictCount: number;
  }
>;
```

- `syncTabToServer(formulaId)` - 同步到服务器
- `pullTabUpdates(formulaId)` - 拉取更新
- `resolveTabConflicts(formulaId, strategy)` - 解决冲突
- `getTabSyncStatus(formulaId)` - 获取同步状态
- `enableTabAutoSync(formulaId, interval)` - 启用自动同步

#### 19. 快捷操作 (Per-Tab)

- `fillTabDown(formulaId, rowId, colId)` - 向下填充
- `clearTabRange(formulaId, startRow, endRow)` - 清除范围
- `insertTabRows(formulaId, position, count)` - 批量插入行
- `deleteTabRows(formulaId, rowIds)` - 批量删除行
- `duplicateTabRows(formulaId, rowIds)` - 复制行

#### 20. 数据完整性 (Per-Tab)

- `validateTabIntegrity(formulaId)` - 验证数据完整性
- `repairTabData(formulaId)` - 修复损坏的数据
- `backupTabData(formulaId)` - 创建备份
- `restoreTabFromBackup(formulaId, backupId)` - 从备份恢复
- `getTabDataHealth(formulaId)` - 获取数据健康状态

### 实现优先级建议

**P0 (必须):**

- Tab 生命周期管理（1-2 周）
- 数据持久化与恢复（2-3 周）
- 内存管理基础（1 周）

**P1 (重要):**

- 撤销/重做功能（2 周）
- 过滤和排序（1-2 周）
- 搜索和导航（1 周）

**P2 (有用):**

- 性能监控（1 周）
- 数据验证（1-2 周）
- 批量操作（1 周）

**P3 (增强):**

- 版本控制（2-3 周）
- 协作功能（3-4 周）
- 数据分析（2 周）

**P4 (锦上添花):**

- 智能建议（2-3 周）
- 条件格式化（1-2 周）
- 批注和备注（1 周）
- 自定义视图（1-2 周）

## 总结

✅ 完整的 per-tab 数据隔离已实现
✅ 每个 formula tab 拥有独立的 GridStore 实例
✅ 计算结果按 tab 隔离存储
✅ 智能清理逻辑，避免数据污染
✅ 向后兼容，渐进式迁移
✅ 可扩展架构，支持 20+ 类功能扩展
