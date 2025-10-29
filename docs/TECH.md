# Formula Playground 技术设计文档

## 1. 项目概述

### 1.1 项目信息

- **项目名称：** Formula Playground
- **项目类型：** 数字货币交易公式验证工具
- **技术栈：** React 19+ / TypeScript / Zustand / React Flow / Tailwind CSS 4+ / Shadcn UI
- **文档版本：** v1.0.0
- **最后更新：** 2024-01-XX

### 1.2 项目目标

构建一个交互式的数字货币交易公式验证工具，通过可视化方式实时计算、校验并解释各类交易所 SDK 中的公式逻辑。

### 1.3 项目定位

该工具不是单纯的计算器，而是用于验证 SDK 逻辑正确性与跨语言一致性的校验系统。

### 1.4 核心能力

- 从 TS 代码（通过 JSDoc）自动推导公式结构与依赖关系
- 以 React Flow 节点形式可视化公式
- 调用 SDK 中的真实实现（TS / Rust via WASM）进行计算
- 支持两端结果对比、误差检测
- 记录历史执行数据并离线保存

## 2. 核心目标

| 目标           | 描述                                                           |
| -------------- | -------------------------------------------------------------- |
| **公式验证**   | 对 SDK 内公式逻辑进行实时验证，发现精度或逻辑差异              |
| **自动推导**   | 从 TS 源码解析出公式定义（通过 JSDoc），自动生成节点图         |
| **多引擎执行** | 支持 TS 与 Rust(WASM) 双版本执行结果切换与对比                 |
| **结果可追溯** | 通过 IndexedDB 记录所有运行历史，支持回放与对拍                |
| **直观可视化** | 使用 React Flow 展示公式的输入、依赖与结果                     |
| **可扩展性**   | 支持未来添加更多语言实现与 AI 自动解释，并能接入更多外部数据源 |

## 3. 用户角色

| 角色           | 主要需求                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| **SDK 开发者** | 验证公式实现与预期逻辑一致，追踪不同语言版本差异，确认多语言实现兼容性     |
| **QA / 测试**  | 对比 TS 与 Rust 结果，回放历史用例，定位精度或逻辑问题                     |
| **产品/PM**    | 直观理解公式的逻辑与依赖关系，辅助文档说明，便于业务沟通                   |
| **量化研究员** | 修改参数快速实验，验证交易策略中公式计算的合理性与敏感度，探索不同参数影响 |

## 4. 功能清单

### 4.1 基础功能

| 模块               | 功能描述                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **公式加载**       | 配置 SDK 源码路径，工具启动时自动遍历并识别可验证的公式列表                                                                                                                                                                      |
| **公式解析**       | 从 TS 源码中，通过 JSDoc 标签（如 `@formulaId`, `@param`, `@returns` 等）提取公式定义（函数名、参数、类型、注释、单位、默认值等），构建 `FormulaDefinition` 对象。通过函数命名约定（如 `calculate*` 前缀）或配置规则识别公式函数 |
| **公式可视化**     | 使用 React Flow 渲染公式结构图，包括输入节点、主公式节点和输出节点。支持自动布局，确保清晰可读                                                                                                                                   |
| **实时执行**       | 当用户修改输入参数时，通过 Web Worker 异步调度 TS 和 Rust(WASM) 引擎实时重新计算并展示输出结果                                                                                                                                   |
| **结果比较**       | 同时运行 TS 与 Rust 引擎，展示两者计算结果的绝对误差和相对误差。在 UI 中高亮显示超过预设阈值的差异                                                                                                                               |
| **单位与精度控制** | 支持在公式定义中通过 JSDoc 标注参数和结果的单位。支持在 `FormulaDefinition` 中定义 `engineHints`（如 `rounding` 策略和 `scale`），用于计算结果的统一化处理                                                                       |
| **历史记录**       | 使用 IndexedDB 本地保存所有运行记录 (`RunRecord`)。记录包括输入参数、输出结果、执行引擎、耗时、误差对比等信息。支持按公式过滤、按时间排序，可回放（将历史输入参数重新填充到当前输入）与导出                                      |

### 4.2 进阶功能

| 模块              | 功能描述                                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| **AI 公式解释器** | 调用 AI 服务（如 OpenAI API），自动生成自然语言解释，说明公式用途与逻辑              |
| **错误检测**      | 检测循环依赖（在复杂图谱中）、单位冲突、精度偏差（基于用户配置的阈值）               |
| **可视化报告**    | 展示误差分布直方图、性能统计（执行耗时、误差率）图表，帮助快速定位问题               |
| **快照对比**      | 从历史记录中选择两次执行结果（可以是不同版本、不同引擎、不同参数），进行详细对比     |
| **代码导出**      | 将节点图或 `FormulaDefinition` 导出为 TypeScript 类型定义、Markdown 文档或 JSON 格式 |
| **公式版本管理**  | 按 SDK 版本（通过 Git Commit Hash 或版本号）管理公式定义，支持回退与差异比较         |

## 5. 系统架构

### 5.1 前端架构

#### 技术栈

- **框架：** React 18+ / TypeScript
- **状态管理：** Zustand
- **可视化：** React Flow
- **样式：** Tailwind CSS
- **存储：** IndexedDB (基于 Dexie.js)

#### 执行引擎

- 直接调用 SDK (TS) 函数
- 调用 Rust WASM 模块
- 所有计算均在 Web Worker 中执行

#### 核心模块

| 模块                   | 职责                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **FormulaGraph**       | 公式可视化编辑区，基于 React Flow，负责节点和边的渲染与交互                             |
| **FormulaExecutor**    | 执行网关，负责接收执行请求，调度不同的 `SDKAdapter` 进行计算                            |
| **SDKAdapterRegistry** | 引擎适配层，注册并管理 `TSAdapter` 和 `RustWasmAdapter` 实例，提供统一的 `execute` 接口 |
| **FormulaParser**      | 负责从 TS 源码（通过 JSDoc）解析 `FormulaDefinition`                                    |
| **HistoryManager**     | 基于 IndexedDB 的运行记录模块，提供增删改查、批量导入导出等功能                         |
| **FormulaInspector**   | 右侧属性面板，用于展示和编辑输入参数、显示输出结果、误差对比及公式说明                  |
| **AIExplainer**        | 自然语言生成公式说明的模块（可选）                                                      |
| **DataSourceRegistry** | 提供外部行情数据等模拟或真实数据输入源（未来）                                          |

### 5.2 后端架构（可选）

#### 技术栈

- **框架：** NestJS
- **数据库：** PostgreSQL

#### 主要接口

- `GET /formulas`：获取所有公式定义
- `POST /runs`：上传执行结果
- `GET /versions`：获取 SDK/公式版本差异

> **注意：** 后端在 MVP 阶段可不实现，主要用于存储共享公式定义与快照、用户认证、跨设备同步等。

## 6. 数据模型

### 6.1 FormulaDefinition

```typescript
// src/types/formula.ts
export type FormulaInputType = "number" | "string" | "boolean";
export type RoundingStrategy = "floor" | "ceil" | "round" | "trunc";

/**
 * @description 计算因子类型定义
 */
export interface FactorType {
  baseType: FormulaInputType;
  constraints?: {
    min?: number;
    max?: number;
    enum?: string[];
    pattern?: string; // 正则表达式
  };
  nullable?: boolean;
  array?: boolean;
}

/**
 * @description 公式定义，从 SDK 源码（通过 JSDoc）解析而来
 */
export interface FormulaDefinition {
  id: string; // 公式唯一标识符，如 "funding_fee"
  name: string; // 公式显示名称，如 "Funding Fee Calculation"
  version: string; // SDK 版本或公式版本，从 JSDoc @version 提取
  description?: string; // 公式用途的自然语言描述，从 JSDoc @description 提取
  tags?: string[]; // 标签，用于分类或搜索，从 JSDoc @tags 提取（JSON 数组格式）
  engineHints?: {
    // 针对特定引擎的计算提示，从 JSDoc @engineHint.xxx 提取
    ts?: { rounding?: RoundingStrategy; scale?: number };
    rust?: { rounding?: RoundingStrategy; scale?: number };
  };
  inputs: Array<{
    key: string; // 参数名
    type: FormulaInputType; // 基础类型
    factorType: FactorType; // 详细的计算因子类型信息
    unit?: string; // 单位，从 JSDoc @param 中的 @unit 提取
    default?: any; // 默认值，从 JSDoc @param 中的 @default 提取
    description?: string; // 参数描述，从 JSDoc @param 提取
  }>;
  outputs: Array<{
    key: string; // 输出结果名，默认为 'result'
    type: FormulaInputType; // 基础类型
    factorType: FactorType; // 详细的输出因子类型信息
    unit?: string; // 单位，从 JSDoc @returns 中的 @unit 提取
    description?: string; // 描述，从 JSDoc @returns 提取
  }>;
  formulaText?: string; // 原始公式函数体代码的字符串表示
  sourceCode?: string; // 原始公式函数的完整源码字符串
  examples?: Array<{
    inputs: Record<string, any>;
    outputs: Record<string, any>;
  }>; // 示例用例
}
```

### 6.2 RunRecord（IndexedDB）

```typescript
// src/types/history.ts
/**
 * @description 单次公式运行记录
 */
export interface RunRecord {
  id: string; // UUID
  timestamp: number; // 执行时间戳
  formulaId: string;
  formulaVersion: string;
  engine: "ts" | "rust"; // 执行引擎
  sdkVersion: string; // SDK 版本
  inputs: Record<string, any>; // 输入参数快照
  outputs: Record<string, any>; // 输出结果快照
  durationMs: number; // 执行耗时
  compare?: {
    // 与另一引擎的对比结果
    otherEngine: "ts" | "rust";
    absDiff?: Record<string, number>; // 绝对误差 (key -> 绝对值)
    relDiff?: Record<string, number>; // 相对误差 (key -> 相对百分比或小数)
    // 更多对比维度，如精度、舍入差异等
  };
  hash?: string; // 可选，输入+公式+引擎的哈希，用于去重或快速查找
  note?: string; // 用户备注
}
```

### 6.3 FormulaNodeData（React Flow 节点）

```typescript
// src/types/formula.ts
import { Node, Edge, Position } from "reactflow"; // 引入 React Flow 类型

/**
 * @description React Flow 节点数据
 */
export interface FormulaNodeData {
  id: string; // 对应公式ID或参数/输出KEY
  type: "formula" | "input" | "output" | "operator"; // 节点类型
  label: string; // 节点显示文本
  value?: any; // 运行时参数或结果值
  unit?: string; // 单位
  description?: string; // 描述
  isError?: boolean; // 是否有错误
  diff?: number; // 与另一引擎的差异 (例如，绝对误差)
  // 更多自定义数据...
}
```

## 7. 用户交互流程

```mermaid
flowchart LR
    A[应用启动] --> B{加载SDK源码并解析公式定义};
    B --> C[展示公式列表];
    C --> D[用户选择一个公式];
    D --> E[渲染公式节点图];
    E --> F[加载并显示历史记录];
    E --> G[初始化输入参数面板];
    G --> H[用户修改输入参数];
    H -- 自动触发/手动点击 --> I[执行SDK计算 (TS/Rust 在 Web Worker 中)];
    I -- 计算完成 --> J[展示结果与误差对比 (更新节点值、高亮差异)];
    J --> K[记录执行结果到 IndexedDB];
    K -- IndexedDB 更新 --> L[刷新历史记录面板];
    L --> M[用户可选择历史记录回放];
    M --> H;
```

## 8. UI 布局

```
+---------------------------------------------------------------------------------------+
| Toolbar                                                                               |
| [Logo] [Formula Name Dropdown] | Engine: [TS (Active) | Rust] | [Run Button] [Compare Snapshots] [Export] [AI Explain] | [Settings] |
+---------------------------------------------------------------------------------------+
| Left Panel (20%)                               | Center Canvas (React Flow) (60%)     | Right Panel (20%)             |
| --------------------------                     | ------------------------------------ | --------------------------    |
| **Formula List**                               | [Formula Graph Visualization]        | **Input Parameters**          |
| - Funding Fee (selected)                       |                                      |   - positionSize: [ 100 ]     |
| - Liquidation Price                            | [InputNode: Position Size] --------->|   - fundingRate: [ 0.0001 ]   |
| - ...                                          |                                      |                               |
| --------------------------                     | [InputNode: Funding Rate]   ---------| **Outputs (TS)**              |
| **History / Snapshots**                        |                                      |   - result: [ 0.01 ]          |
| - TS Run (2023-10-26 14:30)                    | [FormulaNode: Funding Fee] --------->| **Outputs (Rust)**            |
| - Rust Run (2023-10-26 14:29, diff 1e-10)      |                                      |   - result: [ 0.0100000001 ]  |
| - ...                                          | [OutputNode: Funding Fee Result]     |                               |
|                                                |                                      | **Comparison**                |
|                                                |                                      |   - absDiff: [ 1e-10 ]        |
|                                                |                                      |   - relDiff: [ 1e-08 ]        |
|                                                |                                      |   [Highight if > threshold]   |
|                                                |                                      |                               |
|                                                |                                      | **Formula Details**           |
|                                                |                                      |   - Description: ...          |
|                                                |                                      |   - Tags: ...                 |
|                                                |                                      |   - Engine Hints: ...         |
+---------------------------------------------------------------------------------------+
```

## 9. 技术实现要点

### 9.1 项目结构与文件组织

```
formula-playground/
├── public/
├── src/
│   ├── api/                     # 后端 API 接口定义（如果需要）
│   ├── assets/                  # 静态资源，如图片、图标等
│   ├── components/              # 可复用的 UI 组件
│   │   ├── common/              # 通用组件，如 Button, Modal
│   │   └── formula-ui/          # 与公式领域相关的 UI 组件，如 FormulaCard, NodeToolbar
│   ├── constants/               # 全局常量
│   ├── hooks/                   # 自定义 React Hooks
│   ├── lib/                     # 工具函数库，如精度计算、单位转换
│   │   ├── utils.ts
│   │   ├── math.ts
│   │   └── dexie.ts             # IndexedDB 封装
│   ├── modules/                 # 核心业务逻辑模块
│   │   ├── formula-parser/      # 公式源码解析（TS Compiler API / ts-morph）
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── formula-executor/    # 公式执行器，调度不同引擎
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── adapters/        # 引擎适配器
│   │   │   │   ├── ts-adapter.ts
│   │   │   │   └── rust-wasm-adapter.ts
│   │   │   └── workers/         # Web Worker 相关文件
│   │   │       ├── ts-worker.ts
│   │   │       └── rust-worker.ts
│   │   ├── formula-graph/       # React Flow 图形相关逻辑
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── nodes/           # 自定义 React Flow 节点
│   │   │   └── edges/           # 自定义 React Flow 边
│   │   ├── history-manager/     # IndexedDB 历史记录管理
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── sdk-registry/        # SDK 引擎注册与管理
│   │   │   └── index.ts
│   │   └── ai-explainer/        # AI 公式解释器（如果实现）
│   ├── pages/                   # 页面组件
│   │   ├── playground/          # 公式验证主页面
│   │   │   ├── index.tsx
│   │   │   ├── components/      # 页面特有组件，如 LeftPanel, RightPanel
│   │   │   └── hooks/           # 页面特有 hooks
│   │   └── home/                # 首页
│   ├── store/                   # Zustand 状态管理
│   │   ├── index.ts
│   │   ├── formulaStore.ts      # 公式列表、当前选中公式等
│   │   ├── graphStore.ts        # React Flow 状态
│   │   └── historyStore.ts      # 历史记录 UI 状态
│   ├── types/                   # 全局 TypeScript 类型定义
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── sdk-mock/                    # 模拟 SDK，用于开发和测试
│   ├── ts/                      # TypeScript SDK 实现
│   │   ├── formulas.ts
│   │   └── utils.ts
│   └── rust-wasm/               # Rust WASM SDK 实现
│       ├── src/
│       │   └── lib.rs
│       ├── Cargo.toml
│       └── build.sh
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

### 9.2 TS 源码到节点图（FormulaParser & FormulaGraph）

- **TS → FormulaDefinition (FormulaParser)：**
  - **核心：** 使用 `ts-morph` 库解析 SDK TypeScript 源码的抽象语法树 (AST)。
  - **识别机制：** 遍历所有 `export function` 声明。通过以下方式识别公式函数：
    - 函数命名约定：以 `calculate`、`compute`、`formula` 等前缀开头的函数
    - JSDoc 标签：包含 `@formulaId` 标签的函数
    - 配置规则：在 `formulaConfig.json` 中明确指定的函数列表
    - 返回类型：返回数值类型的纯函数（无副作用）
  - **配置文件支持：** 支持 `formulaConfig.json` 配置文件，允许用户自定义公式识别规则和元数据覆盖
  - **类型驱动的因子提取：**
    - **参数类型分析：** 通过 `ts-morph` 的 `getTypeNode()` 和 `getType()` 方法分析每个参数的类型信息
    - **计算因子识别：** 根据参数类型自动识别计算因子类型：
      - `number` → `FormulaInputType.number` (数值因子)
      - `string` → `FormulaInputType.string` (字符串因子，如货币对、交易对)
      - `boolean` → `FormulaInputType.boolean` (布尔因子，如是否启用某功能)
      - 自定义类型 → 通过类型定义解析，提取基础类型
    - **返回类型分析：** 分析函数返回类型，确定输出因子的类型和数量
    - **类型约束提取：** 从 TypeScript 类型定义中提取约束信息（如数值范围、枚举值等）
  - **元数据提取：**
    - `id`：从 `@formulaId` JSDoc 标签中提取；如果不存在，则将函数名转换为 `snake_case` 作为 ID。
    - `name`、`description`、`tags`、`version`：分别从 `@name`、`@description`、`@tags` (JSON 格式字符串)、`@version` JSDoc 标签中提取。
    - `engineHints`：从 `@engineHint.ts.rounding`、`@engineHint.ts.scale` 等 JSDoc 标签中解析。
    - `inputs`：遍历函数参数，结合类型分析和 JSDoc 信息：
      - 参数类型通过 `param.getTypeNode().getText()` 获取
      - 从 `@param` JSDoc 标签中提取 `description`、`@unit` 和 `@default` 子标签
      - 自动推断参数的计算因子类型和约束
    - `outputs`：根据函数返回类型推断，从 `@returns` JSDoc 标签中提取 `description` 和 `@unit` 子标签。
    - `formulaText`：提取函数体的字符串内容。
    - `sourceCode`：存储整个函数的原始源码字符串。
- **FormulaDefinition → React Flow Nodes & Edges (FormulaGraph)：**
  - **节点创建：** 为 `FormulaDefinition` 创建一个 `formula` 类型的中心节点；为每个 `input` 创建一个 `input` 类型的节点；为每个 `output` 创建一个 `output` 类型的节点。
  - **布局：** 使用 `ELK.js`（基于 `elk.bundled.js`）进行自动图布局，确保节点和边的清晰排列，方向为从左到右 (`'elk.direction': 'RIGHT'`)。
  - **自定义节点：** 设计 `InputNode`, `FormulaNode`, `OutputNode` 等 React 组件，通过 `FormulaNodeData` 渲染节点标签、当前值、单位、错误状态和差异。
  - **数据更新：** 运行时节点的 `value`、`isError`、`diff` 属性将根据计算结果动态更新。

### 9.3 双引擎执行与 SDK 适配器（FormulaExecutor & SDKAdapterRegistry）

- **SDK 适配器接口 (`SDKAdapter`)：** 定义统一的 `id` (`'ts' | 'rust'`)、`name`、`version` 以及核心方法 `execute(formula: FormulaDefinition, inputs: Record<string, any>): Promise<FormulaExecutionResult>`。
- **注册中心 (`SDKAdapterRegistry`)：** 在应用启动时注册 `TSAdapter` 和 `RustWasmAdapter` 实例，提供 `getAdapter(id)` 方法供执行器调用。
- **Web Worker 封装：**
  - **目标：** 将所有耗时的公式计算（尤其是 WASM 初始化和执行）隔离到 Web Worker 中，防止阻塞主线程，保持 UI 响应。
  - **实现：** 为 TS 和 Rust WASM 各自创建一个 Worker 文件 (`ts-worker.ts`, `rust-worker.ts`)。这些 Worker 文件将导入并实例化各自的 `SDKAdapter`。
  - **通信：** 主线程通过 `postMessage` 发送 `FormulaExecutionRequest` 到 Worker，Worker 执行计算后，通过 `postMessage` 返回 `FormulaExecutionResult`。
- **TS 适配器 (`TSAdapter`)：**
  - **原理：** 直接导入并调用模拟 SDK 中的 TypeScript 公式函数（例如 `import * as TsFormulas from '../../../../sdk-mock/ts/formulas';`）。
  - **映射：** 维护 `formula.id` 到实际 TS 函数的映射（通过函数名转换或预设映射表）。
  - **参数：** 根据 `FormulaDefinition.inputs` 的顺序和键名，将 `inputs` 对象转换为函数调用所需的参数数组。
- **Rust WASM 适配器 (`RustWasmAdapter`)：**
  - **原理：** 使用 `wasm-bindgen` 导入预编译的 Rust WASM 模块。
  - **初始化：** 在 Worker 中异步调用 `init()` 函数初始化 WASM，确保在执行计算前完成。
  - **映射：** 维护 `formula.id` 到 WASM 导出函数的映射（通常 WASM 导出函数会遵循 `calculate_xxx` 的命名约定）。
  - **参数：** WASM 函数通常接受一个 JSON 序列化的对象作为参数。适配器负责将 `inputs` 对象转换为 WASM 可理解的结构 (`JsValue`)。
  - **结果：** 将 WASM 返回的 `JsValue` 反序列化为 `FormulaExecutionResult`。
- **执行网关 (`FormulaExecutor` 或直接在 `formulaStore` 中实现)：**
  - 接收 `formulaId` 和 `inputs`。
  - 并发调用 `TSAdapter` 和 `RustWasmAdapter` 的 `execute` 方法（通过 Web Worker）。
  - 收集两个引擎的结果，并计算 `absDiff` 和 `relDiff`。
  - 将结果更新到 Zustand 状态，并触发 UI 刷新。

### 9.4 IndexedDB 历史记录（HistoryManager）

- **库：** `Dexie.js`，提供简洁的 API 封装 IndexedDB。
- **数据库结构：** 定义 `FormulaPlaygroundDB`，包含 `runRecords` 表，主键 `++id`，并建立 `timestamp`, `formulaId`, `engine`, `sdkVersion` 等索引以优化查询。
- **API：** `HistoryManager` 封装 `Dexie.js` 操作，提供 `addRecord`, `getAllRecords`, `getRecordsByFormulaId`, `getRecordById`, `clearAllRecords`, `deleteRecord` 等方法。
- **集成：** 在 `formulaStore` 的 `executeFormula` 方法中，计算完成后调用 `historyManager.addRecord` 保存 `RunRecord`。`loadHistory` 方法用于加载并更新 Zustand 中的 `runHistory` 状态。

### 9.5 状态管理（Zustand）

- **`formulaStore`：** 存储核心状态，如 `formulaDefinitions` 列表、`selectedFormulaId`、`currentInputs`、`tsResult`、`rustResult`、`activeEngine`、`loading`、`error` 和 `runHistory`。包含用于选择公式、更新输入、切换引擎、执行计算和加载历史记录的 actions。
- **`graphStore`：** 存储 React Flow 的节点 (`nodes`) 和边 (`edges`) 状态。
- **`historyStore`：** 可用于管理历史记录面板的 UI 状态，如过滤条件、排序方式等。

## 10. 风险与解决方案

| 风险                         | 解决方案                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TS 与 Rust 精度差异**      | 1. 在 `FormulaDefinition.engineHints` 中定义 `rounding` 策略 (`floor`/`ceil`/`round`/`trunc`) 和 `scale` (小数位数)，在结果对比前，根据这些提示对结果进行统一的精度处理<br>2. UI 上提供可配置的误差阈值，允许用户自定义判断 "一致" 的标准 |
| **WASM 初始化耗时**          | 1. 在应用启动时（或首次访问 Playground 页面时）异步初始化 WASM，并显示加载动画<br>2. 缓存 WASM 实例，避免重复初始化<br>3. 将 WASM 加载和初始化放在 Web Worker 中，避免阻塞主线程                                                          |
| **TS AST/JSDoc 推导不完整**  | 1. 优先依赖清晰的 JSDoc 规范。文档要求 SDK 开发者遵循严格的 JSDoc 格式<br>2. 对于无法自动推导或推导错误的情况，提供 UI 界面允许用户手动编辑和保存 `FormulaDefinition`，这些修改可以持久化到 IndexedDB 或后端                              |
| **IndexedDB 存储上限**       | 1. 设置自动清理策略，如只保留最近 N 条记录或只保留 N 天内的记录<br>2. 提供"导出备份"功能，允许用户将历史记录导出为 JSON/CSV 文件<br>3. 提示用户定期清理旧的记录                                                                           |
| **SDK 版本更新导致公式变更** | 1. `FormulaDefinition` 中包含 `version` 字段，`RunRecord` 记录执行时的 `formulaVersion` 和 `sdkVersion`<br>2. 未来可实现与 Git 集成，记录 Commit Hash，提供"按版本运行"和差异对比功能                                                     |
| **UI 性能瓶颈（复杂图表）**  | 1. `ReactFlow` 本身性能较好，但对于包含数百甚至上千节点的图表，需注意<br>2. 优化自定义节点渲染，避免复杂计算<br>3. ELK 布局计算放到 Worker 中执行，减少主线程负担                                                                         |

## 11. 测试计划

| 测试项                   | 内容                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| **对拍测试**             | 相同输入下 TS/Rust 输出差异 ≤ 误差阈值（如 1e-12）。覆盖各种边界条件和异常值                 |
| **性能测试**             | 计算耗时：平均单次执行（TS+Rust）< 100ms；WASM 初始化 < 1s。UI 响应性：用户交互无明显卡顿    |
| **快照复算**             | 从历史记录中选择历史用例，重新运行后，结果应与原记录一致，成功率 ≥ 99%                       |
| **AST/JSDoc 解析准确率** | 自动从 SDK 源码解析出 `FormulaDefinition` 的正确率（字段提取、类型识别、单位描述等）≥ 90%    |
| **UI 功能测试**          | 所有节点交互、输入参数更新、执行按钮、引擎切换、历史记录加载/回放/删除等功能可用性与用户体验 |
| **存储测试**             | IndexedDB 的数据读写、查询、存储上限、数据清理机制是否正常工作                               |

## 12. 成功指标

| 指标                      | 目标       |
| ------------------------- | ---------- |
| **TS 与 Rust 计算一致率** | ≥ 99%      |
| **TS 代码自动推导正确率** | ≥ 90%      |
| **历史回放通过率**        | ≥ 99.5%    |
| **平均验证时间**          | < 30 秒    |
| **用户满意度**            | ≥ 90%      |
| **Bug 密度**              | < 0.1/kLOC |

## 13. 里程碑

| 阶段                   | 时间      | 交付物                                                                                                                                    |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1 - MVP**      | 第 1 个月 | **核心功能实现：** TS 引擎计算、JSDoc 公式解析、React Flow 节点图可视化、IndexedDB 历史记录基本功能、基础 UI 布局、用户可手动修改输入参数 |
| **Phase 2 - 对拍系统** | 第 2 个月 | **双引擎集成与对比：** Rust WASM 引擎集成、TS/Rust 双引擎切换与并发执行、结果差异分析与高亮、历史记录中误差数据的持久化、优化 Web Worker  |
| **Phase 3 - 进阶功能** | 第 3 个月 | **增强与体验优化：** AI 公式解释集成（调用外部服务）、快照对比功能、可视化报告（误差/性能图表）、更完善的错误检测、代码导出功能           |

## 14. 非功能性要求

| 类别         | 要求                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **性能**     | 计算延迟：核心公式计算（TS/Rust）在 Web Worker 中执行，平均单次执行（包含数据传递）< 100ms。UI 响应性：主线程在任何操作下均应保持流畅，无卡顿。内存占用：浏览器内存占用 < 200MB（在典型使用场景下）。WASM 初始化：首次加载 WASM 模块时间 < 1s |
| **安全**     | 所有计算均在用户本地浏览器环境进行。WASM 模块应在沙盒环境中运行，确保不会访问或损坏用户系统。不传输用户敏感数据到外部服务（除非用户明确授权 AI 解释器）                                                                                       |
| **可维护性** | 清晰的项目结构和模块划分。代码遵循 TypeScript 和 React 最佳实践。所有公式定义应支持 JSON Schema 导出和导入，便于管理和版本控制                                                                                                                |
| **可扩展性** | `SDKAdapterRegistry` 应支持接入更多语言实现（如 Python 通过 Pyodide）。`FormulaParser` 应可扩展以支持更多 JSDoc 标签或其他元数据解析方式。`DataSourceRegistry` 未来可接入更多外部数据源                                                       |
| **用户体验** | 直观易用的 UI 界面。实时反馈，如计算结果、误差提示、加载状态。错误消息清晰易懂，并提供解决方案                                                                                                                                                |
| **兼容性**   | 支持主流现代浏览器（Chrome, Firefox, Edge, Safari 的最新版本）                                                                                                                                                                                |

## 15. 附录

### 15.1 示例 JSDoc 公式定义（Funding Fee）

```typescript
// sdk-mock/ts/formulas.ts
/**
 * @formulaId funding_fee
 * @name Funding Fee Calculation
 * @description Calculates the funding fee for a perpetual contract position based on its size and the current funding rate.
 * @tags ["perpetual", "fee", "financial"]
 * @version 1.2.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 8
 * @engineHint.rust.rounding trunc
 * @engineHint.rust.scale 7
 *
 * @param {number} positionSize - The size of the position (e.g., in USD). @unit USD @default 1000
 * @param {number} fundingRate - The current funding rate (e.g., 0.0001 for 0.01%). @unit % @default 0.0001
 * @returns {number} The calculated funding fee. @unit USD
 */
export function calculateFundingFee(
  positionSize: number,
  fundingRate: number
): number {
  return positionSize * fundingRate;
}
```

### 15.2 公式配置文件示例

```json
// formulaConfig.json
{
  "formulaRules": {
    "namingConventions": ["calculate*", "compute*", "formula*"],
    "excludePatterns": ["test*", "mock*", "debug*"],
    "requireJSDoc": false
  },
  "formulaOverrides": {
    "calculateFundingFee": {
      "id": "funding_fee",
      "name": "Funding Fee Calculation",
      "description": "Calculates the funding fee for a perpetual contract position",
      "tags": ["perpetual", "fee", "financial"],
      "version": "1.2.0",
      "engineHints": {
        "ts": { "rounding": "round", "scale": 8 },
        "rust": { "rounding": "trunc", "scale": 7 }
      }
    }
  },
  "globalSettings": {
    "defaultRounding": "round",
    "defaultScale": 8,
    "errorThreshold": 1e-12
  }
}
```

### 15.3 类型驱动的因子提取实现示例

```typescript
// src/modules/formula-parser/type-analyzer.ts
import { Project, SourceFile, ParameterDeclaration, TypeNode } from "ts-morph";

export class TypeAnalyzer {
  /**
   * 分析参数类型，提取计算因子信息
   */
  analyzeParameterType(param: ParameterDeclaration): FactorType {
    const typeNode = param.getTypeNode();
    const type = param.getType();

    // 基础类型识别
    const baseType = this.getBaseType(type);

    // 约束信息提取
    const constraints = this.extractConstraints(typeNode, type);

    // 可空性检查
    const nullable = type.isNullable();

    // 数组类型检查
    const array = type.isArray();

    return {
      baseType,
      constraints,
      nullable,
      array,
    };
  }

  private getBaseType(type: any): FormulaInputType {
    const typeText = type.getText();

    if (type.isNumber() || typeText.includes("number")) {
      return "number";
    } else if (type.isString() || typeText.includes("string")) {
      return "string";
    } else if (type.isBoolean() || typeText.includes("boolean")) {
      return "boolean";
    }

    // 处理联合类型，如 "number | string"
    if (typeText.includes("|")) {
      const types = typeText.split("|").map((t) => t.trim());
      if (types.includes("number")) return "number";
      if (types.includes("string")) return "string";
      if (types.includes("boolean")) return "boolean";
    }

    return "string"; // 默认类型
  }

  private extractConstraints(
    typeNode: TypeNode | undefined,
    type: any
  ): FactorType["constraints"] {
    const constraints: FactorType["constraints"] = {};

    if (!typeNode) return constraints;

    const typeText = typeNode.getText();

    // 提取数值范围约束
    const rangeMatch = typeText.match(/(\d+)\s*\.\.\s*(\d+)/);
    if (rangeMatch) {
      constraints.min = parseInt(rangeMatch[1]);
      constraints.max = parseInt(rangeMatch[2]);
    }

    // 提取枚举值约束
    const enumMatch = typeText.match(/\|\s*['"]([^'"]+)['"]/g);
    if (enumMatch) {
      constraints.enum = enumMatch.map((match) =>
        match.replace(/\|\s*['"]|['"]/g, "")
      );
    }

    // 提取正则表达式约束
    const patternMatch = typeText.match(/pattern:\s*['"]([^'"]+)['"]/);
    if (patternMatch) {
      constraints.pattern = patternMatch[1];
    }

    return constraints;
  }

  /**
   * 分析返回类型，确定输出因子
   */
  analyzeReturnType(returnTypeNode: TypeNode | undefined): FactorType {
    if (!returnTypeNode) {
      return { baseType: "number" }; // 默认返回数值
    }

    const returnType = returnTypeNode.getType();
    return this.analyzeParameterType({
      getTypeNode: () => returnTypeNode,
      getType: () => returnType,
    } as ParameterDeclaration);
  }
}
```

### 15.4 完整的公式解析器实现示例

```typescript
// src/modules/formula-parser/index.ts
import { Project, SourceFile, FunctionDeclaration } from "ts-morph";
import { TypeAnalyzer } from "./type-analyzer";
import { FormulaDefinition, FactorType } from "../../types/formula";

export class FormulaParser {
  private project: Project;
  private typeAnalyzer: TypeAnalyzer;

  constructor() {
    this.project = new Project();
    this.typeAnalyzer = new TypeAnalyzer();
  }

  /**
   * 解析 TypeScript 源码，提取公式定义
   */
  async parseFormulas(sourceFiles: string[]): Promise<FormulaDefinition[]> {
    const formulas: FormulaDefinition[] = [];

    for (const filePath of sourceFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const fileFormulas = this.parseSourceFile(sourceFile);
      formulas.push(...fileFormulas);
    }

    return formulas;
  }

  private parseSourceFile(sourceFile: SourceFile): FormulaDefinition[] {
    const formulas: FormulaDefinition[] = [];

    // 遍历所有导出的函数
    const functions = sourceFile.getExportedDeclarations();

    for (const [name, declarations] of functions) {
      for (const declaration of declarations) {
        if (declaration.getKind() === "FunctionDeclaration") {
          const func = declaration as FunctionDeclaration;

          // 检查是否为公式函数
          if (this.isFormulaFunction(func)) {
            const formula = this.parseFormula(func);
            if (formula) {
              formulas.push(formula);
            }
          }
        }
      }
    }

    return formulas;
  }

  /**
   * 判断函数是否为公式函数
   */
  private isFormulaFunction(func: FunctionDeclaration): boolean {
    const name = func.getName();
    if (!name) return false;

    // 命名约定检查
    const namingPatterns = ["calculate", "compute", "formula"];
    const matchesNaming = namingPatterns.some((pattern) =>
      name.toLowerCase().startsWith(pattern)
    );

    // JSDoc 标签检查
    const jsDoc = func.getJsDocs()[0];
    const hasFormulaId = jsDoc
      ?.getTags()
      .some((tag) => tag.getTagName() === "formulaId");

    // 返回类型检查（应该是数值类型）
    const returnType = func.getReturnTypeNode();
    const isNumericReturn = returnType?.getText().includes("number");

    return matchesNaming || hasFormulaId || isNumericReturn;
  }

  /**
   * 解析单个公式函数
   */
  private parseFormula(func: FunctionDeclaration): FormulaDefinition | null {
    const name = func.getName();
    if (!name) return null;

    const jsDoc = func.getJsDocs()[0];

    // 提取基本信息
    const id = this.extractFormulaId(jsDoc) || this.toSnakeCase(name);
    const formulaName = this.extractName(jsDoc) || name;
    const description = this.extractDescription(jsDoc);
    const version = this.extractVersion(jsDoc) || "1.0.0";
    const tags = this.extractTags(jsDoc);

    // 解析输入参数
    const inputs = this.parseInputs(func);

    // 解析输出
    const outputs = this.parseOutputs(func);

    // 提取引擎提示
    const engineHints = this.extractEngineHints(jsDoc);

    return {
      id,
      name: formulaName,
      version,
      description,
      tags,
      engineHints,
      inputs,
      outputs,
      formulaText: func.getBody()?.getText(),
      sourceCode: func.getText(),
    };
  }

  /**
   * 解析输入参数，结合类型分析生成计算因子
   */
  private parseInputs(func: FunctionDeclaration) {
    const parameters = func.getParameters();
    const inputs = [];

    for (const param of parameters) {
      const paramName = param.getName();
      const paramType = param.getTypeNode();

      // 使用类型分析器提取因子类型
      const factorType = this.typeAnalyzer.analyzeParameterType(param);

      // 提取 JSDoc 信息
      const jsDoc = param.getJsDocs()[0];
      const description = this.extractParamDescription(jsDoc);
      const unit = this.extractParamUnit(jsDoc);
      const defaultValue = this.extractParamDefault(jsDoc);

      inputs.push({
        key: paramName,
        type: factorType.baseType,
        factorType,
        unit,
        default: defaultValue,
        description,
      });
    }

    return inputs;
  }

  /**
   * 解析输出，结合类型分析生成输出因子
   */
  private parseOutputs(func: FunctionDeclaration) {
    const returnTypeNode = func.getReturnTypeNode();
    const factorType = this.typeAnalyzer.analyzeReturnType(returnTypeNode);

    // 提取 JSDoc 返回信息
    const jsDoc = func.getJsDocs()[0];
    const description = this.extractReturnDescription(jsDoc);
    const unit = this.extractReturnUnit(jsDoc);

    return [
      {
        key: "result",
        type: factorType.baseType,
        factorType,
        unit,
        description,
      },
    ];
  }

  // 辅助方法...
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  private extractFormulaId(jsDoc: any): string | null {
    const formulaIdTag = jsDoc
      ?.getTags()
      .find((tag) => tag.getTagName() === "formulaId");
    return formulaIdTag?.getCommentText() || null;
  }

  // 其他提取方法...
}
```

### 15.5 自动生成节点图示例

```mermaid
graph LR
    A[Input: positionSize (USD)] --> B((x))
    C[Input: fundingRate (%)] --> B
    B --> D[Formula: Funding Fee Calculation]
    D --> E[Output: result (USD)]
```
