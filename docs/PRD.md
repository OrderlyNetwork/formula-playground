# 🧩 Formula Playground 需求文档

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 核心目标](#2-核心目标)
- [3. 用户角色](#3-用户角色)
- [4. 功能清单](#4-功能清单)
- [5. 进阶功能](#5-进阶功能)
- [6. 系统架构](#6-系统架构)
- [7. 数据模型](#7-数据模型)
- [8. 用户交互流程](#8-用户交互流程)
- [9. UI 布局](#9-ui-布局)
- [10. 技术实现要点](#10-技术实现要点)
- [11. 风险与解决方案](#11-风险与解决方案)
- [12. 测试计划](#12-测试计划)
- [13. 成功指标](#13-成功指标)
- [14. 里程碑](#14-里程碑)
- [15. 非功能性要求](#15-非功能性要求)
- [16. 附录](#16-附录)

---

## 1. 项目概述

**项目名称：** Formula Playground

**目标：** 构建一个交互式的数字货币交易公式验证工具，通过可视化方式实时计算、校验并解释各类交易所 SDK 中的公式逻辑。

该工具不是单纯的计算器，而是用于验证 SDK 逻辑正确性与跨语言一致性的校验系统。

### 核心能力

- 从 TS 代码（通过 JSDoc）自动推导公式结构与依赖关系
- 以 React Flow 节点形式可视化公式
- 调用 SDK 中的真实实现（TS / Rust via WASM）进行计算
- 支持两端结果对比、误差检测
- 记录历史执行数据并离线保存
- 通过 Web Worker 隔离计算，保持 UI 响应流畅

---

## 2. 核心目标

| 目标       | 描述                                              |
| ---------- | ------------------------------------------------- |
| 公式验证   | 对 SDK 内公式逻辑进行实时验证，发现精度或逻辑差异 |
| 自动推导   | 从 TS 源码解析出公式定义，自动生成节点图          |
| 多引擎执行 | 支持 TS 与 Rust(WASM) 双版本执行结果切换与对比    |
| 结果可追溯 | 通过 IndexedDB 记录所有运行历史，支持回放与对拍   |
| 直观可视化 | 使用 React Flow 展示公式的输入、依赖与结果        |
| 可扩展     | 支持未来添加更多语言实现与 AI 自动解释            |

---

## 3. 用户角色

| 角色       | 主要需求                                         |
| ---------- | ------------------------------------------------ |
| SDK 开发者 | 验证公式实现与预期逻辑一致，追踪不同语言版本差异 |
| QA / 测试  | 对比 TS 与 Rust 结果，回放历史用例，定位问题     |
| 产品/PM    | 直观理解公式的逻辑与依赖关系，辅助文档说明       |
| 量化研究员 | 修改参数快速实验，验证结果合理性                 |

---

## 4. 功能清单

### ✅ 4.1 基础功能

| 模块           | 功能描述                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 公式加载       | 配置 SDK 源码路径，自动遍历并识别可验证的公式列表（通过命名约定、JSDoc 标签、配置文件识别）                                                                         |
| 公式解析       | 使用 ts-morph 从 TS 源码解析 JSDoc 标签（@formulaId、@param、@returns 等），自动提取公式定义（函数名、参数、类型、注释、单位、默认值）并构建 FormulaDefinition 对象 |
| 公式可视化     | 使用 React Flow 渲染公式结构图（输入节点、公式节点、输出节点），使用 ELK.js 自动布局                                                                                |
| 实时执行       | 当用户修改输入参数时，通过 Web Worker 异步调度 TS 和 Rust(WASM) 引擎实时重新计算并展示结果                                                                          |
| 结果比较       | 同时运行 TS 与 Rust 引擎，展示绝对误差和相对误差，在 UI 中高亮显示超过预设阈值的差异                                                                                |
| 单位与精度控制 | 支持在 JSDoc 中标注参数和结果的单位，在 FormulaDefinition.engineHints 中定义 rounding 策略和 scale                                                                  |
| 历史记录       | 使用 Dexie.js 封装 IndexedDB，本地保存所有运行记录（输入、输出、引擎、耗时、误差），支持按公式过滤、按时间排序、回放与导出                                          |

---

## 5. 进阶功能

| 模块          | 功能描述                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| AI 公式解释器 | 调用 AI 服务（如 OpenAI API），自动生成自然语言解释，说明公式用途与逻辑            |
| 错误检测      | 检测循环依赖（在复杂图谱中）、单位冲突、精度偏差（基于用户配置的阈值）             |
| 可视化报告    | 展示误差分布直方图、性能统计（执行耗时、误差率）图表，帮助快速定位问题             |
| 快照对比      | 从历史记录中选择两次执行结果（可以是不同版本、不同引擎、不同参数），进行详细对比   |
| 代码导出      | 将节点图或 FormulaDefinition 导出为 TypeScript 类型定义、Markdown 文档或 JSON 格式 |
| 公式版本管理  | 按 SDK 版本（通过 Git Commit Hash 或版本号）管理公式定义，支持回退与差异比较       |

---

## 6. 系统架构

### 前端

- **框架：** React 18+ / TypeScript
- **状态管理：** Zustand
- **可视化：** React Flow
- **样式：** Tailwind CSS
- **存储：** IndexedDB（基于 Dexie.js）
- **执行引擎：** TS SDK 与 Rust WASM 模块（在 Web Worker 中运行）

#### 主要模块

1. **FormulaParser：** 从 TS 源码（通过 JSDoc）解析公式定义
2. **FormulaGraph：** 公式可视化编辑区（基于 React Flow），支持自动布局
3. **FormulaExecutor：** 执行网关，通过 Web Worker 调度不同引擎计算
4. **SDKAdapterRegistry：** 引擎适配层，统一管理 TSAdapter 和 RustWasmAdapter
5. **HistoryManager：** 基于 IndexedDB 的运行记录模块（增删改查、导入导出）
6. **FormulaInspector：** 右侧属性面板（输入参数、结果对比、误差分析）
7. **AIExplainer（可选）：** AI 自动生成公式的自然语言解释
8. **DataSourceRegistry（未来）：** 提供外部行情数据等模拟或真实数据输入

#### 架构特点

- **所有计算在 Web Worker 中执行**：避免阻塞主线程，保持 UI 响应
- **双引擎并发执行**：同时运行 TS 和 Rust WASM，实时对比结果
- **类型驱动的公式推导**：通过 ts-morph 自动分析 TypeScript 类型，提取计算因子信息

### 后端（可选）

- **作用：** 存储共享公式定义与快照，非必需
- **技术栈：** NestJS + PostgreSQL
- **接口：**
  - `GET /formulas`：获取所有公式定义
  - `POST /runs`：上传执行结果
  - `GET /versions`：获取 SDK/公式版本差异

---

## 7. 数据模型

### FormulaDefinition

```typescript
type FormulaInputType = "number" | "string" | "boolean";
type RoundingStrategy = "floor" | "ceil" | "round" | "trunc";

/**
 * 计算因子类型定义，用于描述参数和输出的详细类型信息
 */
interface FactorType {
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

interface FormulaDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  tags?: string[];
  engineHints?: {
    ts?: { rounding?: RoundingStrategy; scale?: number };
    rust?: { rounding?: RoundingStrategy; scale?: number };
  };
  inputs: Array<{
    key: string;
    type: FormulaInputType;
    factorType: FactorType; // 详细的计算因子类型信息
    unit?: string;
    default?: any;
    description?: string;
  }>;
  outputs: Array<{
    key: string;
    type: FormulaInputType;
    factorType: FactorType; // 详细的输出因子类型信息
    unit?: string;
    description?: string;
  }>;
  formulaText?: string; // 函数体代码字符串
  sourceCode?: string; // 完整源码字符串
  examples?: Array<{
    inputs: Record<string, any>;
    outputs: Record<string, any>;
  }>;
}
```

### RunRecord（IndexedDB）

```typescript
interface RunRecord {
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
    absDiff?: Record<string, number>; // 绝对误差
    relDiff?: Record<string, number>; // 相对误差
  };
  hash?: string; // 输入+公式+引擎的哈希，用于去重或快速查找
  note?: string; // 用户备注
}
```

---

## 8. 用户交互流程

```mermaid
flowchart LR
    A[加载公式定义] --> B[渲染节点图]
    B --> C[用户修改输入参数]
    C --> D[执行 SDK 计算 (TS/Rust)]
    D --> E[展示结果与误差对比]
    E --> F[记录执行结果到 IndexedDB]
    F --> G[支持回放与历史对比]
```

---

## 9. UI 布局

```
+----------------------------------------------------------------+
| Toolbar | Engine: [TS | Rust] | Run | Compare | Export | AI Explain |
+----------------------------------------------------------------+
| Left Panel | Center (React Flow) | Right Panel |
| - Formula List | [Formula Graph] | - Input Params |
| - History / Snapshots | | - Outputs |
| | | - Comparison |
+----------------------------------------------------------------+
```

---

## 10. 技术实现要点

| 主题               | 实现方式                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS → 节点图        | 使用 ts-morph 解析 TS 源码 AST，通过函数命名约定（`calculate*` 前缀）、JSDoc 标签（`@formulaId`）或配置文件（`formulaConfig.json`）识别公式函数，提取 JSDoc 元数据生成 FormulaDefinition |
| 类型驱动的因子提取 | 通过 ts-morph 的 `getTypeNode()` 和 `getType()` 分析参数和返回类型，自动识别计算因子类型（number/string/boolean）并提取约束信息（数值范围、枚举值、正则表达式）                          |
| 节点图渲染         | 为每个 FormulaDefinition 创建中心节点（formula）、输入节点（input）和输出节点（output），使用 ELK.js 自动布局（从左到右）                                                                |
| 双引擎执行         | SDKAdapterRegistry 注册 TSAdapter 和 RustWasmAdapter，提供统一的 `execute` 接口，并发调用两个引擎并对比结果                                                                              |
| Web Worker 隔离    | 所有公式计算（TS/Rust WASM）在 Web Worker 中执行，避免阻塞主线程，保持 UI 响应流畅                                                                                                       |
| WASM 集成          | 使用 wasm-bindgen 导入预编译 Rust WASM 模块，在 Worker 中异步初始化，维护 formula.id 到 WASM 函数的映射                                                                                  |
| IndexedDB 存储     | 使用 Dexie.js 封装 IndexedDB，定义 `runRecords` 表，建立 timestamp、formulaId、engine、sdkVersion 索引，提供增删改查、批量导入导出功能                                                   |
| 误差计算与高亮     | 计算绝对误差（absDiff）和相对误差（relDiff），根据 FormulaDefinition.engineHints 应用 rounding 策略和 scale，UI 中高亮超过阈值的差异                                                     |

---

## 11. 风险与解决方案

| 风险                     | 解决方案                                                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS 与 Rust 精度差异      | 1. 在 FormulaDefinition.engineHints 中定义 rounding 策略（floor/ceil/round/trunc）和 scale（小数位数），在结果对比前统一精度处理<br>2. UI 提供可配置的误差阈值（默认 1e-12），允许用户自定义判断"一致"的标准   |
| WASM 初始化耗时          | 1. 应用启动时异步初始化 WASM，显示加载动画<br>2. 缓存 WASM 实例，避免重复初始化<br>3. 将 WASM 加载和初始化放在 Web Worker 中，避免阻塞主线程                                                                   |
| TS AST/JSDoc 推导不完整  | 1. 优先依赖清晰的 JSDoc 规范，要求 SDK 开发者遵循严格的 JSDoc 格式<br>2. 支持 formulaConfig.json 配置文件，允许覆盖和补充元数据<br>3. 提供 UI 界面允许用户手动编辑 FormulaDefinition，修改可持久化到 IndexedDB |
| IndexedDB 存储上限       | 1. 设置自动清理策略（默认保留最近 1000 条记录或 30 天内记录）<br>2. 提供"导出备份"功能（JSON/CSV 格式）<br>3. 提示用户定期清理旧记录                                                                           |
| SDK 版本更新导致公式变更 | 1. FormulaDefinition 包含 version 字段，RunRecord 记录 formulaVersion 和 sdkVersion<br>2. 未来可实现与 Git 集成，记录 Commit Hash，提供"按版本运行"和差异对比功能                                              |
| UI 性能瓶颈（复杂图表）  | 1. ReactFlow 本身性能较好，但对于大型图表需注意优化<br>2. 优化自定义节点渲染，避免复杂计算<br>3. ELK 布局计算放到 Worker 中执行                                                                                |

---

## 12. 测试计划

| 测试项               | 内容                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| 对拍测试             | 相同输入下 TS/Rust 输出差异 ≤ 误差阈值（默认 1e-12），覆盖各种边界条件和异常值               |
| 性能测试             | 计算耗时：平均单次执行（TS+Rust）< 100ms；WASM 初始化 < 1s。UI 响应性：用户交互无明显卡顿    |
| 快照复算             | 从历史记录中选择历史用例，重新运行后结果应与原记录一致，成功率 ≥ 99%                         |
| AST/JSDoc 解析准确率 | 自动从 SDK 源码解析出 FormulaDefinition 的正确率（字段提取、类型识别、单位描述等）≥ 90%      |
| UI 功能测试          | 所有节点交互、输入参数更新、执行按钮、引擎切换、历史记录加载/回放/删除等功能可用性与用户体验 |
| 存储测试             | IndexedDB 的数据读写、查询、存储上限、数据清理机制是否正常工作                               |

---

## 13. 成功指标

| 指标                  | 目标       |
| --------------------- | ---------- |
| TS 与 Rust 计算一致率 | ≥ 99%      |
| TS 代码自动推导正确率 | ≥ 90%      |
| 历史回放通过率        | ≥ 99.5%    |
| 平均验证时间          | < 30 秒    |
| 用户满意度            | ≥ 90%      |
| Bug 密度              | < 0.1/kLOC |

---

## 14. 里程碑

| 阶段               | 时间      | 交付物                                                                                                                                                                                          |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 - MVP      | 第 1 个月 | **核心功能实现：** TS 引擎计算、JSDoc 公式解析（使用 ts-morph）、React Flow 节点图可视化（使用 ELK.js 布局）、IndexedDB 历史记录基本功能（使用 Dexie.js）、基础 UI 布局、用户可手动修改输入参数 |
| Phase 2 - 对拍系统 | 第 2 个月 | **双引擎集成与对比：** Rust WASM 引擎集成、TS/Rust 双引擎切换与并发执行、结果差异分析与高亮、历史记录中误差数据的持久化、优化 Web Worker                                                        |
| Phase 3 - 进阶功能 | 第 3 个月 | **增强与体验优化：** AI 公式解释集成（调用外部服务）、快照对比功能、可视化报告（误差/性能图表）、更完善的错误检测、代码导出功能                                                                 |

---

## 15. 非功能性要求

| 类别     | 要求                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 性能     | 计算延迟：核心公式计算（TS/Rust）在 Web Worker 中执行，平均单次执行（包含数据传递）< 100ms。UI 响应性：主线程在任何操作下均应保持流畅，无卡顿。内存占用：浏览器内存占用 < 200MB（在典型使用场景下）。WASM 初始化：首次加载 WASM 模块时间 < 1s |
| 安全     | 所有计算均在用户本地浏览器环境进行。WASM 模块应在沙盒环境中运行，确保不会访问或损坏用户系统。不传输用户敏感数据到外部服务（除非用户明确授权 AI 解释器）                                                                                       |
| 可维护性 | 清晰的项目结构和模块划分。代码遵循 TypeScript 和 React 最佳实践。所有公式定义应支持 JSON Schema 导出和导入，便于管理和版本控制                                                                                                                |
| 可扩展性 | SDKAdapterRegistry 应支持接入更多语言实现（如 Python 通过 Pyodide）。FormulaParser 应可扩展以支持更多 JSDoc 标签或其他元数据解析方式。DataSourceRegistry 未来可接入更多外部数据源                                                             |
| 用户体验 | 直观易用的 UI 界面。实时反馈，如计算结果、误差提示、加载状态。错误消息清晰易懂，并提供解决方案                                                                                                                                                |
| 兼容性   | 支持主流现代浏览器（Chrome, Firefox, Edge, Safari 的最新版本）                                                                                                                                                                                |

---

## 16. 附录

### 示例公式定义（Funding Fee）

```typescript
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

### 自动生成节点图

```mermaid
graph LR
    A[Input: positionSize (USD)] --> B((x))
    C[Input: fundingRate (%)] --> B
    B --> D[Formula: Funding Fee Calculation]
    D --> E[Output: result (USD)]
```

### 公式识别规则（优先级从高到低）

1. **配置文件明确指定**：`formulaConfig.json` 中 `formulaOverrides` 明确列出的函数
2. **JSDoc @formulaId 标签**：函数 JSDoc 中包含 `@formulaId` 标签
3. **命名约定**：函数名以 `calculate*`、`compute*`、`formula*` 开头
4. **返回类型检查**：函数返回数值类型且无副作用的纯函数

### formulaConfig.json 配置文件示例

```json
{
  "sdkSourcePath": "./sdk-mock/ts",
  "formulaRules": {
    "namingConventions": ["calculate*", "compute*", "formula*"],
    "excludePatterns": ["test*", "mock*", "debug*"],
    "requireJSDoc": false
  },
  "formulaOverrides": {
    "calculateFundingFee": {
      "id": "funding_fee",
      "name": "Funding Fee Calculation",
      "tags": ["perpetual", "fee", "financial"]
    }
  },
  "globalSettings": {
    "defaultRounding": "round",
    "defaultScale": 8,
    "errorThreshold": 1e-12,
    "maxHistoryRecords": 1000,
    "historyRetentionDays": 30
  }
}
```

### SDK 源码路径配置

- **配置方式**：

  1. 通过 `formulaConfig.json` 文件中的 `sdkSourcePath` 字段
  2. 通过 UI 设置面板输入（保存到 LocalStorage）
  3. 通过环境变量 `VITE_SDK_SOURCE_PATH`（开发环境）

- **路径处理**：

  - 支持相对路径（相对于项目根目录）
  - 支持绝对路径
  - 启动时自动验证路径是否存在

- **多路径支持**：Phase 2 可支持多个 SDK 源码路径，通过数组配置

---
