# FormulaDataSheet Refactoring

## 概述

将原来的单一大文件（850行）重构为多个小文件，提高可维护性和可测试性。

## 重构前后对比

### 重构前
```
formulaDataSheet.tsx (850 lines)
├── 所有类型定义
├── 所有状态管理
├── 所有hooks逻辑
└── 所有渲染逻辑
```

### 重构后
```
src/modules/formula-datasheet/
├── formulaDataSheet.tsx (107 lines) - 主组件，协调各部分
├── types.ts - 类型定义
├── constants.ts - 常量定义
├── index.ts - 统一导出
├── hooks/
│   ├── useStableRowIds.ts - 管理稳定的行ID
│   ├── useDataSheetRows.ts - 行数据管理（CRUD操作）
│   ├── useAutoCalculation.ts - 自动计算逻辑
│   └── useDataSheetMetrics.ts - 指标计算
├── components/
│   ├── DataSheetTable.tsx - 表格渲染
│   └── EmptyState.tsx - 空状态组件
├── services/
│   └── dataSheetStateTracker.ts (已存在)
└── helpers/
    └── calculationHelpers.ts (已存在)
```

## 文件说明

### 核心文件

#### `formulaDataSheet.tsx` (主组件)
- **职责**: 协调各个hooks和子组件
- **大小**: 从 850行 减少到 107行
- **改进**: 更清晰的组件结构，易于理解和维护

#### `types.ts`
- **职责**: 定义所有TypeScript类型
- **导出**:
  - `TableRow` - 表格行数据结构
  - `MetricsData` - 指标数据结构
  - `RowCalculationResult` - 计算结果结构

#### `constants.ts`
- **职责**: 定义常量
- **导出**:
  - `DEBOUNCE_DELAY_MS` - 防抖延迟
  - `AUTO_TRIGGER_DELAY_MS` - 自动触发延迟
  - `RECENT_UPDATE_WINDOW_MS` - 最近更新时间窗口
  - `MIN_COLUMN_WIDTH` - 最小列宽

### Hooks

#### `useStableRowIds.ts`
- **职责**: 管理跨公式切换的稳定行ID
- **返回**: `getStableRowId(formulaId, rowIndex)`
- **优点**: 确保切换公式时行ID保持一致

#### `useDataSheetRows.ts`
- **职责**: 管理行数据和CRUD操作
- **返回**:
  - `rows` - 当前行数据
  - `setRows` - 更新行数据
  - `rowsRef` - 行数据引用（用于异步访问）
  - `updateCell` - 更新单元格
  - `updateRowData` - 批量更新行数据
  - `deleteRow` - 删除行
  - `duplicateRow` - 复制行
  - `addNewRow` - 添加新行
- **优点**: 集中管理所有行操作，易于测试

#### `useAutoCalculation.ts`
- **职责**: 管理自动计算逻辑
- **功能**:
  - 防抖计算（用户输入后延迟触发）
  - 自动触发计算（行变为有效时）
  - 批量计算（执行所有行）
- **返回**:
  - `handleCellUpdate` - 处理单元格更新的计算
  - `executeAllRows` - 执行所有有效行的计算
- **优点**: 复杂的计算逻辑独立管理

#### `useDataSheetMetrics.ts`
- **职责**: 计算和更新执行指标
- **功能**: 自动计算总时间、平均时间、已计算行数
- **优点**: 自动化指标追踪，避免手动更新

### Components

#### `DataSheetTable.tsx`
- **职责**: 渲染表格UI
- **功能**:
  - 使用TanStack Table渲染
  - 支持列固定（index列左固定，result列右固定）
  - 响应式布局
  - 验证状态显示
- **优点**: UI逻辑与业务逻辑分离

#### `EmptyState.tsx`
- **职责**: 显示空状态消息
- **组件**:
  - `NoFormulaState` - 未选择公式
  - `NoRowsState` - 无行数据
- **优点**: 统一的空状态管理

### 向后兼容

#### `utils/formulaTableUtils.tsx`
- **更新**: 从 `@/modules/formula-datasheet/types` 导入 `TableRow`
- **导出**: 重新导出 `TableRow` 保持向后兼容
- **影响**: 现有代码无需修改导入路径

## 重构收益

### 1. 可维护性 ✅
- **文件大小**: 主文件从 850行 减少到 107行（减少87%）
- **职责分离**: 每个文件有明确的单一职责
- **易于定位**: 问题更容易定位到具体文件

### 2. 可测试性 ✅
- **Hooks独立**: 可以单独测试每个hook
- **组件隔离**: UI组件可以独立测试
- **Mock友好**: 更容易mock依赖

### 3. 可读性 ✅
- **清晰结构**: 文件组织清晰，易于导航
- **注释完整**: 每个文件都有详细注释
- **类型安全**: 类型定义集中管理

### 4. 可扩展性 ✅
- **新功能**: 容易添加新hook或组件
- **不影响现有**: 修改单个文件不影响其他部分
- **团队协作**: 多人可并行开发不同部分

## 使用方式

### 导入主组件
```typescript
import { FormulaDataSheet } from "@/modules/formula-datasheet";
```

### 导入类型
```typescript
import type { TableRow, MetricsData } from "@/modules/formula-datasheet";
```

### 导入常量
```typescript
import { DEBOUNCE_DELAY_MS } from "@/modules/formula-datasheet";
```

### 使用Hooks（如需自定义）
```typescript
import { useDataSheetRows } from "@/modules/formula-datasheet/hooks/useDataSheetRows";
```

## 测试建议

### 1. 单元测试
- 测试每个hook的独立功能
- 测试类型安全性
- 测试边界条件

### 2. 集成测试
- 测试主组件的完整流程
- 测试hooks之间的交互
- 测试公式切换场景

### 3. 性能测试
- 测试大量行数据的渲染性能
- 测试频繁更新的性能
- 测试内存泄漏

## 注意事项

1. **向后兼容**: 保持了与现有代码的兼容性
2. **类型定义**: `TableRow` 已移至 `@/modules/formula-datasheet/types`
3. **导入路径**: 推荐使用 `@/modules/formula-datasheet` 统一导入
4. **Hook依赖**: hooks之间有依赖关系，注意调用顺序

## 未来改进

1. 将 `TableRow` 类型完全迁移到新位置，移除 `formulaTableUtils` 中的重新导出
2. 考虑添加更多单元测试
3. 考虑使用状态管理库（如Zustand）替代多个useState
4. 优化渲染性能（使用虚拟滚动）

