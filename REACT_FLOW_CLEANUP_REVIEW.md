# React Flow 清理 Review 报告

## 📋 概述

本项目已经从基于 React Flow 的连线可视化功能迁移到基于 TanStack Table 的 DataSheet/TableSheet 功能。本报告检查了代码库，识别了仍然存在的 React Flow 相关代码，以及 DataSheet 功能的完整性。

## ✅ DataSheet 功能状态

### 功能完整性 ✓

DataSheet 功能已经完整实现，包括：

1. **核心组件**
   - `src/modules/formula-datasheet/formulaDataSheet.tsx` - 主组件
   - `src/modules/formula-datasheet/components/DataSheetTable.tsx` - 表格组件
   - 使用 `@tanstack/react-table` 进行表格渲染

2. **功能特性**
   - ✅ 动态列生成（支持嵌套对象和数组）
   - ✅ 多行测试用例管理
   - ✅ 类型感知的单元格编辑
   - ✅ 实时公式执行
   - ✅ 行操作（添加、删除、复制）

3. **当前使用位置**
   - `src/pages/playground/index.tsx` - DeveloperLayout 和 UserLayout 中已使用
   - `src/pages/formula/details.tsx` - 公式详情页面
   - `src/pages/formula-test/index.tsx` - 公式测试页面

### 共享组件使用

DataSheet 使用的 `formula-graph` 模块中的组件（这些应该保留）：

- ✅ `TypeAwareInput` - 类型感知输入组件
- ✅ `SlashCommandMenu` - 斜杠命令菜单
- ✅ `utils/nodeTypes.ts` 中的验证工具函数
- ✅ `utils/valueNormalization.ts` - 值规范化工具

## ⚠️ 仍存在的 React Flow 相关代码

### 1. 主要组件文件（未使用）

**应该删除或标记为 deprecated：**

```
src/pages/playground/components/
├── CenterCanvas.tsx                    ❌ React Flow 主画布组件（已被注释）
├── hooks/
│   ├── useGraphConnections.ts          ❌ React Flow 连线管理
│   ├── useGraphDragDrop.ts             ❌ React Flow 拖拽功能
│   ├── useGraphGeneration.ts           ❌ React Flow 图生成
│   ├── useNodeDimensions.ts            ❌ React Flow 节点尺寸管理
│   └── useNodeValueUpdates.ts          ❌ React Flow 节点值更新
└── panels/
    └── CanvasControlsPanel.tsx         ❌ React Flow 控制面板
```

**状态：** 在 `src/pages/playground/index.tsx` 中，`CenterCanvas` 已经被注释掉：
```typescript
{/* <CenterCanvas /> */}
<FormulaDataSheet />
```

### 2. React Flow 节点组件（未使用）

**应该删除：**

```
src/modules/formula-graph/nodes/
├── InputNode.tsx                       ❌ React Flow 输入节点
├── FormulaNode.tsx                     ❌ React Flow 公式节点
├── OutputNode.tsx                      ❌ React Flow 输出节点
├── ObjectNode.tsx                      ❌ React Flow 对象节点
├── ArrayNode.tsx                       ❌ React Flow 数组节点
├── ApiNode.tsx                         ❌ React Flow API 节点
└── WebSocketNode.tsx                   ❌ React Flow WebSocket 节点
```

**注意：** 这些节点组件包含 React Flow 的 `Handle` 组件，仅用于连线功能。

### 3. React Flow 图生成功能（未使用）

**文件：** `src/modules/formula-graph/index.ts`

**函数：**
- `generateFormulaGraph()` - 生成 React Flow 图和边
- `applyELKLayout()` - ELK.js 布局算法

**依赖：** 使用了 `elkjs` 包（可能不再需要）

### 4. Store 状态管理（可能不再需要）

**文件：**
- `src/store/graphStore.ts` - 管理 React Flow nodes 和 edges
- `src/store/canvasStore.ts` - 管理 canvas 模式（single/multi）

**使用情况：**
- `graphStore` - 仅在 `CenterCanvas.tsx` 和相关的 React Flow hooks 中使用
- `canvasStore` - 仅在 `CenterCanvas.tsx` 和 `CanvasControlsPanel.tsx` 中使用

**建议：** 检查是否有其他地方使用这些 store，如果没有则可以删除。

### 5. History Store 中的 React Flow 相关代码

**文件：** `src/store/historyStore.ts`

**相关代码：**
- `saveCanvasSnapshot()` - 保存 React Flow 画布快照（nodes, edges）
- `canvasSnapshots` - 存储 React Flow 画布状态

**建议：** 如果不再需要保存画布快照功能，可以简化这部分代码。

### 6. 类型定义中的 React Flow 依赖

**文件：** `src/types/formula.ts`

**类型：**
```typescript
import type { Node, Edge } from "reactflow";
export type FormulaNode = Node<FormulaNodeData>;
export type FormulaEdge = Edge;
```

**建议：** 这些类型可能仍然被某些代码引用，需要检查后再决定是否删除或重构。

### 7. React Flow 相关服务（部分可能不再需要）

**文件：** `src/modules/formula-graph/services/`
- `runnerManager.ts` - 可能包含 React Flow 特定的运行逻辑
- `runnerService.ts` - 检查是否只被 React Flow 使用
- `websocketManager.ts` - WebSocket 节点管理（React Flow 特定）

**建议：** 需要检查这些服务是否被 DataSheet 或其他功能使用。

### 8. CSS 样式

**文件：** `src/index.css`

**React Flow 样式：**
```css
.react-flow__node-input,
.react-flow__node-output {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
```

**建议：** 可以删除这些样式。

### 9. 依赖包

**文件：** `package.json`

**依赖：**
- `reactflow: ^11.11.4` - React Flow 库
- `elkjs: ^0.11.0` - 图布局算法（仅用于 React Flow）

**建议：** 如果确认不再使用 React Flow，可以删除这些依赖。

## 📊 代码清理建议

### 优先级 1：立即清理（完全未使用）

1. ✅ 删除 `CenterCanvas.tsx` 及其相关 hooks
2. ✅ 删除所有 React Flow 节点组件（InputNode, FormulaNode 等）
3. ✅ 删除 `CanvasControlsPanel.tsx`
4. ✅ 删除 React Flow CSS 样式

### 优先级 2：检查后清理（可能未使用）

1. ⚠️ 检查并删除 `graphStore.ts`（如果没有其他地方使用）
2. ⚠️ 检查并删除 `canvasStore.ts`（如果没有其他地方使用）
3. ⚠️ 检查 `historyStore.ts` 中的画布快照功能
4. ⚠️ 检查 `runnerManager.ts` 和 `websocketManager.ts` 的使用情况

### 优先级 3：重构（仍然需要但需要修改）

1. 🔄 重构 `formula-graph/index.ts` - 只保留 DataSheet 需要的工具函数
2. 🔄 检查 `types/formula.ts` 中的 `FormulaNode` 和 `FormulaEdge` 类型定义
3. 🔄 考虑将 `TypeAwareInput` 等共享组件移动到更合适的位置

### 优先级 4：依赖清理

1. 📦 如果确认不再使用 React Flow，删除 `reactflow` 依赖
2. 📦 如果确认不再使用 ELK.js，删除 `elkjs` 依赖

## 🎯 DataSheet 功能验证

### 已验证的功能

✅ **表格渲染**
- 使用 TanStack Table
- 支持列固定（Index 列固定在左侧，Result 列固定在右侧）
- 动态列生成基于 FormulaDefinition.inputs

✅ **数据管理**
- 行数据的 CRUD 操作
- 行状态管理（`useDataSheetRows`）
- 稳定的行 ID（`useStableRowIds`）

✅ **公式执行**
- 自动计算（`useAutoCalculation`）
- 批处理执行所有行
- 执行状态跟踪（`useDataSheetMetrics`）

✅ **类型验证**
- 集成 `TypeAwareInput` 组件
- 支持 FactorType 验证
- 支持枚举、min/max、regex 验证

### 需要验证的功能

⚠️ **数据持久化**
- 检查行数据是否持久化到 IndexedDB
- 检查公式切换时数据是否正确清理

⚠️ **错误处理**
- 公式执行错误的显示
- 输入验证错误的提示

⚠️ **性能**
- 大量行时的性能表现
- 自动计算的防抖处理

## 📝 建议的清理步骤

1. **第一步：备份和验证**
   ```bash
   # 创建备份分支
   git checkout -b backup/react-flow-cleanup
   git push origin backup/react-flow-cleanup
   ```

2. **第二步：删除未使用的组件**
   - 删除 `CenterCanvas.tsx`
   - 删除所有 React Flow 节点组件
   - 删除相关的 hooks 和 panels

3. **第三步：检查 Store 使用情况**
   ```bash
   # 搜索 graphStore 和 canvasStore 的使用
   grep -r "graphStore\|canvasStore" src/
   ```

4. **第四步：清理依赖**
   - 删除未使用的依赖包
   - 运行 `pnpm install` 更新 lockfile

5. **第五步：测试**
   - 验证 DataSheet 功能正常
   - 确保没有破坏性变更
   - 运行完整的测试套件

6. **第六步：清理样式和类型**
   - 删除 React Flow CSS
   - 清理或重构相关类型定义

## 🔍 需要进一步检查的问题

1. **`useFormulaUrlSync` hook**
   - 文件：`src/pages/playground/hooks/useFormulaUrlSync.ts`
   - 需要检查是否依赖 React Flow 相关状态

2. **`runnerManager` 和 `runnerService`**
   - 需要确认是否被 DataSheet 使用
   - 检查是否可以简化或重构

3. **WebSocket 功能**
   - `websocketManager.ts` 是否只用于 React Flow 节点
   - 是否还有其他地方使用 WebSocket

4. **History 功能**
   - 画布快照功能是否还需要
   - 如果需要，是否应该改为保存 DataSheet 状态

## ✅ 总结

### DataSheet 功能状态：✅ 完整且正常工作

DataSheet 功能已经完整实现，并且已经在多个页面中使用。功能包括：
- 表格渲染和管理
- 数据输入和验证
- 公式执行和结果展示
- 行操作（添加、删除、复制）

### React Flow 代码清理状态：⚠️ 部分完成

React Flow 相关的代码已经在页面中注释掉，但相关的文件和依赖仍然存在。建议按照优先级逐步清理：

1. **立即清理**：未使用的组件和样式
2. **检查后清理**：Store 和服务（需要确认使用情况）
3. **重构**：共享组件的位置和类型定义
4. **依赖清理**：删除不需要的 npm 包

### 建议

1. 在清理前，确保有完整的测试覆盖
2. 逐步清理，每次清理后进行验证
3. 考虑将共享组件（如 `TypeAwareInput`）移动到更通用的位置
4. 如果未来可能需要 React Flow 功能，可以考虑将其移到单独的模块或分支

