# 未清理文件对 AI 代码生成准确性的影响分析

## 🎯 核心问题

**是的，未清理的文件会影响 AI 生成代码的准确性。** 主要原因如下：

## ⚠️ 主要影响

### 1. **类型定义混淆**

**问题：**

```typescript
// src/types/formula.ts
import type { Node, Edge } from "reactflow"; // ❌ 已删除的依赖
export type FormulaNode = Node<FormulaNodeData>;
export type FormulaEdge = Edge;
```

**影响：**

- AI 搜索代码库时仍能找到 `FormulaNode` 和 `FormulaEdge` 类型
- AI 可能会误认为项目还在使用 React Flow
- AI 生成的代码可能包含 React Flow 相关的导入和使用
- **当前会导致编译错误**（reactflow 已从 package.json 删除）

**示例：**
如果问 AI："如何创建一个公式节点？"

- ❌ AI 可能回答：使用 `<FormulaNode>` 组件（已删除）
- ✅ 应该回答：使用 DataSheet 表格

### 2. **代码搜索噪音**

**当前状态：**

- `FormulaNode` 在 **11 个文件**中仍有引用（73 处匹配）
- `runnerManager` 等服务的代码仍然存在
- `graphStore` 和 `canvasStore` 仍在运行

**影响：**

- AI 语义搜索会返回过时的代码模式
- AI 可能会推荐使用 `useGraphStore()` 而不是正确的方案
- AI 可能基于 React Flow 架构生成代码，而不是 DataSheet 架构

**示例：**
如果问 AI："如何管理公式状态？"

- ❌ AI 可能推荐：`useGraphStore()`（用于 React Flow）
- ✅ 应该推荐：`useFormulaStore()`（用于 DataSheet）

### 3. **架构理解错误**

**问题：**
项目中同时存在两套架构的痕迹：

- **旧架构**：React Flow 节点图（已删除组件，但类型/Store 仍存在）
- **新架构**：DataSheet 表格（当前使用的）

**影响：**

- AI 可能混淆两套架构
- AI 生成的代码可能混合使用两套架构
- AI 可能无法正确理解项目的当前状态

**示例：**
如果问 AI："如何添加公式执行功能？"

- ❌ AI 可能生成：基于 `runnerManager` 和节点的代码
- ✅ 应该生成：基于 DataSheet 行的代码

### 4. **依赖关系混乱**

**问题：**

```typescript
// src/modules/formula-graph/services/runnerManager.ts
// 大量未使用的代码，但仍被导入和引用
```

**影响：**

- AI 可能认为这些服务仍在使用
- AI 可能生成使用这些服务的代码
- AI 可能创建不必要的依赖关系

### 5. **类型检查失败**

**当前问题：**

```bash
# 由于 reactflow 已删除，但类型仍在使用，会导致：
import type { Node, Edge } from "reactflow";  # ❌ Module not found
```

**影响：**

- **立即影响**：项目可能无法编译
- **长期影响**：类型系统提供错误信息，误导 AI

## 📊 具体数据

### 未清理的引用统计

| 类型/概念       | 引用文件数 | 引用次数 | 影响级别          |
| --------------- | ---------- | -------- | ----------------- |
| `FormulaNode`   | 11         | 73       | 🔴 高             |
| `FormulaEdge`   | 7          | 14       | 🔴 高             |
| `graphStore`    | 6          | 9        | 🟡 中             |
| `canvasStore`   | 2          | 8        | 🟡 中             |
| `runnerManager` | 3          | 17       | 🟡 中             |
| React Flow 导入 | 1          | 2        | 🔴 高（编译错误） |

### 关键文件状态

```
✅ 已删除（组件）
├── CenterCanvas.tsx
├── InputNode.tsx - FormulaNode.tsx
├── OutputNode.tsx - ObjectNode.tsx
└── ...

⚠️ 仍存在（类型/Store/服务）
├── types/formula.ts          # ❌ 导入 reactflow（编译错误）
├── store/graphStore.ts       # ⚠️ 使用 FormulaNode（未使用）
├── store/canvasStore.ts      # ⚠️ 用于 React Flow 模式
├── services/runnerManager.ts # ⚠️ 大量未使用代码
└── ...
```

## 🎯 AI 理解问题的示例

### 场景 1：代码补全

**用户输入：**

```typescript
const node = ...
```

**AI 可能建议：**

```typescript
// ❌ 错误：基于 React Flow
const node: FormulaNode = {
  id: "formula-1",
  type: "formula",
  position: { x: 0, y: 0 },
  data: { ... }
};
```

**应该建议：**

```typescript
// ✅ 正确：基于 DataSheet
const row: TableRow = {
  id: "row-1",
  data: { ... }
};
```

### 场景 2：架构问题

**用户问题：** "如何实现公式的可视化编辑？"

**AI 可能回答：**

```typescript
// ❌ 错误：使用 React Flow 节点
<FormulaNode data={formulaData} />
```

**应该回答：**

```typescript
// ✅ 正确：使用 DataSheet 表格
<FormulaDataSheet formula={formula} />
```

### 场景 3：状态管理

**用户问题：** "如何存储公式的状态？"

**AI 可能回答：**

```typescript
// ❌ 错误：使用 graphStore
const { nodes, edges } = useGraphStore();
```

**应该回答：**

```typescript
// ✅ 正确：使用 formulaStore
const { selectedFormulaId, currentInputs } = useFormulaStore();
```

## ✅ 建议的清理优先级

### 优先级 1：立即处理（影响编译）

1. **修复类型定义**

   - `src/types/formula.ts` - 移除 React Flow 类型导入
   - 定义自己的 `FormulaNode` 和 `FormulaEdge` 类型（如果仍需要）
   - 或者完全删除这些类型定义

2. **检查编译错误**
   ```bash
   pnpm run build  # 检查是否有编译错误
   ```

### 优先级 2：高优先级（影响 AI 准确性）

3. **简化或删除 graphStore**

   - 如果不再需要，完全删除
   - 如果仍需保留，添加清晰的注释说明其用途

4. **简化或删除 canvasStore**

   - 如果不使用 multi-formula 模式，可以删除
   - 或重构以支持 DataSheet 相关功能

5. **清理 runnerManager/runnerService**
   - 检查是否真的不再使用
   - 如果不再使用，删除或标记为 deprecated

### 优先级 3：中优先级（减少噪音）

6. **添加代码注释**

   - 在保留的文件中添加清晰注释
   - 说明为什么保留这些代码

7. **创建架构文档**
   - 明确说明当前架构（DataSheet）
   - 说明已废弃的架构（React Flow）

## 📝 实际影响评估

### 对 AI 的影响程度

| 影响类型     | 严重程度 | 频率 | 影响范围     |
| ------------ | -------- | ---- | ------------ |
| 类型混淆     | 🔴 高    | 经常 | 所有代码生成 |
| 架构混淆     | 🔴 高    | 经常 | 架构相关问题 |
| 代码建议错误 | 🟡 中    | 偶尔 | 特定功能问题 |
| 依赖推荐错误 | 🟡 中    | 偶尔 | 导入相关     |
| 搜索结果噪音 | 🟢 低    | 总是 | 语义搜索     |

### 当前代码库状态

```
当前状态：
├── ✅ DataSheet 功能完整
├── ⚠️ React Flow 类型仍存在（会导致编译错误）
├── ⚠️ 大量未使用的 Store 和服务
└── ⚠️ 两套架构的痕迹并存

AI 理解：
├── ❓ 不确定应该使用哪套架构
├── ❓ 看到 React Flow 类型但找不到组件
└── ❓ 可能生成混合架构的代码
```

## 🎯 建议

### 立即行动（如果关心 AI 准确性）

1. **修复编译错误**

   ```typescript
   // src/types/formula.ts
   // 移除 reactflow 导入，定义自己的类型
   export interface FormulaNode {
     id: string;
     type: string;
     data: FormulaNodeData;
   }
   ```

2. **标记未使用的代码**

   ```typescript
   /**
    * @deprecated React Flow functionality has been removed.
    * This store is kept for compatibility but should not be used for new code.
    */
   export const useGraphStore = ...
   ```

3. **创建清晰的架构文档**
   - 说明当前使用 DataSheet
   - 说明已废弃 React Flow
   - 帮助 AI 理解项目结构

### 长期建议

- **彻底清理**：删除所有 React Flow 相关代码
- **类型重构**：定义自己的类型系统
- **文档完善**：为每个主要模块添加清晰说明

## 🔍 测试 AI 理解的方法

可以尝试问 AI 以下问题，检查其理解是否准确：

1. "如何创建一个新的公式编辑界面？"

   - ✅ 期望：提到 DataSheet
   - ❌ 错误：提到 FormulaNode 或 React Flow

2. "如何管理公式的状态？"

   - ✅ 期望：提到 useFormulaStore
   - ❌ 错误：提到 useGraphStore

3. "如何可视化公式？"
   - ✅ 期望：提到表格视图
   - ❌ 错误：提到节点图或连线

## 📊 结论

**未清理的文件会显著影响 AI 代码生成的准确性**，特别是：

1. **类型定义** - 会导致编译错误和类型混淆
2. **架构混淆** - AI 可能推荐错误的架构模式
3. **代码搜索噪音** - 过时的代码会污染搜索结果
4. **依赖关系** - AI 可能生成使用不存在依赖的代码

**建议优先处理类型定义问题**，因为这会立即导致编译错误，然后逐步清理其他未使用的代码。
