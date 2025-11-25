# React Flow 清理总结

## ✅ 已完成的清理

### 1. 删除 React Flow 组件

- ✅ `src/pages/playground/components/CenterCanvas.tsx` - React Flow 主画布组件
- ✅ 删除 playground/index.tsx 中的 CenterCanvas 导入

### 2. 删除 React Flow Hooks

- ✅ `src/pages/playground/components/hooks/useGraphConnections.ts`
- ✅ `src/pages/playground/components/hooks/useGraphDragDrop.ts`
- ✅ `src/pages/playground/components/hooks/useGraphGeneration.ts`
- ✅ `src/pages/playground/components/hooks/useNodeDimensions.ts`
- ✅ `src/pages/playground/components/hooks/useNodeValueUpdates.ts`
- ✅ `src/pages/playground/components/hooks/index.ts` - Hooks 导出文件

### 3. 删除 React Flow 节点组件

- ✅ `src/modules/formula-graph/nodes/InputNode.tsx`
- ✅ `src/modules/formula-graph/nodes/FormulaNode.tsx`
- ✅ `src/modules/formula-graph/nodes/OutputNode.tsx`
- ✅ `src/modules/formula-graph/nodes/ObjectNode.tsx`
- ✅ `src/modules/formula-graph/nodes/ArrayNode.tsx`
- ✅ `src/modules/formula-graph/nodes/ApiNode.tsx`
- ✅ `src/modules/formula-graph/nodes/WebSocketNode.tsx`
- ✅ `src/modules/formula-graph/nodes/index.ts` - 节点导出文件

### 4. 删除控制面板

- ✅ `src/pages/playground/components/panels/CanvasControlsPanel.tsx`

### 5. 删除 React Flow CSS 样式

- ✅ `src/index.css` - 删除 `.react-flow__node-*` 样式

### 6. 清理图生成功能

- ✅ `src/modules/formula-graph/index.ts` - 删除 `generateFormulaGraph` 和 `applyELKLayout` 实现
- ✅ 保留 `updateNodeData` 函数（用于 graphStore 兼容性）

### 7. 删除依赖包

- ✅ `package.json` - 删除 `reactflow` 依赖
- ✅ `package.json` - 删除 `elkjs` 依赖

## ⚠️ 需要后续处理

### 1. GraphStore 和 CanvasStore

**文件：**

- `src/store/graphStore.ts` - 管理 React Flow nodes 和 edges
- `src/store/canvasStore.ts` - 管理 canvas 模式（single/multi）

**使用情况：**

- `useFormulaUrlSync` 使用了 `useGraphStore`（检查节点是否生成）和 `useCanvasStore`（multi-formula 模式）
- `runnerManager` 和 `runnerService` 使用了 `graphStore`
- `historyStore` 使用了 `graphStore` 和 `canvasStore`

**建议：**

1. 简化 `useFormulaUrlSync`，移除对 graphStore 的依赖（不再需要检查节点是否生成）
2. 如果不再需要 multi-formula 模式，可以简化或删除 canvasStore
3. 如果 runnerManager 和 runnerService 不再需要，可以考虑删除或简化

### 2. React Flow 类型定义

**文件：** `src/types/formula.ts`

**问题：**

```typescript
import type { Node, Edge } from "reactflow";
export type FormulaNode = Node<FormulaNodeData>;
export type FormulaEdge = Edge;
```

**建议：**

- 如果不再使用 React Flow，需要移除对 `reactflow` 类型的依赖
- 可以定义自己的类型或使用更通用的类型
- 但需要考虑这些类型仍然被 graphStore、historyStore 等使用

### 3. RunnerManager 和 RunnerService

**文件：**

- `src/modules/formula-graph/services/runnerManager.ts`
- `src/modules/formula-graph/services/runnerService.ts`
- `src/modules/formula-graph/hooks/useFormulaRunner.ts`

**使用情况：**

- 这些服务主要用于 React Flow 节点的执行管理
- 如果没有节点组件，这些服务可能不再需要

**建议：**

- 检查是否还有其他地方使用这些服务
- 如果没有，可以考虑删除

### 4. WebSocket Manager

**文件：** `src/modules/formula-graph/services/websocketManager.ts`

**使用情况：**

- 主要用于 WebSocketNode（已删除）

**建议：**

- 如果不再需要 WebSocket 功能，可以删除
- 如果需要保留 WebSocket 功能但不在 React Flow 中使用，需要重构

### 5. History Store 中的画布快照

**文件：** `src/store/historyStore.ts`

**问题：**

- `saveCanvasSnapshot` 保存 React Flow 画布快照（nodes, edges）
- 如果不再需要画布快照功能，可以简化这部分代码

**建议：**

- 如果不再需要画布快照，可以删除相关功能
- 或者改为保存 DataSheet 状态

## 📋 清理统计

### 已删除文件（19 个）

1. `src/pages/playground/components/CenterCanvas.tsx`
2. `src/pages/playground/components/hooks/useGraphConnections.ts`
3. `src/pages/playground/components/hooks/useGraphDragDrop.ts`
4. `src/pages/playground/components/hooks/useGraphGeneration.ts`
5. `src/pages/playground/components/hooks/useNodeDimensions.ts`
6. `src/pages/playground/components/hooks/useNodeValueUpdates.ts`
7. `src/pages/playground/components/hooks/index.ts`
8. `src/pages/playground/components/panels/CanvasControlsPanel.tsx`
9. `src/modules/formula-graph/nodes/InputNode.tsx`
10. `src/modules/formula-graph/nodes/FormulaNode.tsx`
11. `src/modules/formula-graph/nodes/OutputNode.tsx`
12. `src/modules/formula-graph/nodes/ObjectNode.tsx`
13. `src/modules/formula-graph/nodes/ArrayNode.tsx`
14. `src/modules/formula-graph/nodes/ApiNode.tsx`
15. `src/modules/formula-graph/nodes/WebSocketNode.tsx`
16. `src/modules/formula-graph/nodes/index.ts`

### 已修改文件（4 个）

1. `src/pages/playground/index.tsx` - 删除 CenterCanvas 导入
2. `src/index.css` - 删除 React Flow 样式
3. `src/modules/formula-graph/index.ts` - 简化为只保留 updateNodeData
4. `package.json` - 删除 reactflow 和 elkjs 依赖

### 已删除依赖包（2 个）

- `reactflow: ^11.11.4`
- `elkjs: ^0.11.0`

## ✅ 保留的组件（被 DataSheet 使用）

以下组件仍然保留，因为它们被 DataSheet 功能使用：

1. **`TypeAwareInput`** - 类型感知输入组件

   - 位置：`src/modules/formula-graph/components/TypeAwareInput.tsx`
   - 使用：DataSheet 表格单元格编辑

2. **`SlashCommandMenu`** - 斜杠命令菜单

   - 位置：`src/modules/formula-graph/components/SlashCommandMenu.tsx`
   - 使用：被 TypeAwareInput 使用

3. **验证工具函数**

   - 位置：`src/modules/formula-graph/utils/nodeTypes.ts`
   - 函数：`validateValueForFactorType`, `getInputDisplayType`, `getEnumOptions`
   - 使用：被 TypeAwareInput 使用

4. **值规范化工具**
   - 位置：`src/modules/formula-graph/utils/valueNormalization.ts`
   - 使用：数据规范化

## 🎯 下一步行动

1. **运行测试**

   ```bash
   pnpm install  # 更新依赖
   pnpm dev      # 启动开发服务器
   ```

2. **验证 DataSheet 功能**

   - 确保表格渲染正常
   - 确保单元格编辑正常
   - 确保公式执行正常

3. **处理后续清理项**
   - 重构 useFormulaUrlSync（移除 graphStore 依赖）
   - 简化或删除 graphStore 和 canvasStore（如果不再需要）
   - 处理 React Flow 类型定义
   - 检查并清理 runnerManager/runnerService

## 📝 注意事项

1. **类型兼容性**

   - `FormulaNode` 和 `FormulaEdge` 类型仍然在 graphStore 中使用
   - 需要确保类型定义仍然可用，或者重构相关代码

2. **向后兼容性**

   - 如果历史数据中保存了画布快照，需要考虑如何处理

3. **功能完整性**
   - DataSheet 功能应该完全独立于 React Flow
   - 确保没有破坏性变更

## 🔍 验证清单

- [ ] 项目能够正常启动
- [ ] DataSheet 表格正常渲染
- [ ] 单元格编辑功能正常
- [ ] 公式执行功能正常
- [ ] 没有 TypeScript 错误
- [ ] 没有运行时错误
- [ ] 依赖包已正确更新
