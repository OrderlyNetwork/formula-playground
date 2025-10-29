# Formula Source Code Loading 公式源码加载方案

## 概述

本文档说明了如何在 Formula Playground 中获取和显示公式的源码。

## 问题背景

在进行公式验证时，需要同时显示：
1. 公式的元数据（输入、输出、描述等）
2. 公式的实际源代码

之前的 `mockFormulas.ts` 中只包含元数据，缺少 `sourceCode` 和 `formulaText` 字段。

## 解决方案

我们采用 **Vite Raw Import + 自动提取** 的方案：

### 方案特点

✅ **单一数据源**：公式实现只存在于 SDK 源文件中  
✅ **自动同步**：源码自动从 SDK 文件提取，无需手动维护  
✅ **构建时处理**：使用 Vite 的 `?raw` 导入，零运行时开销  
✅ **类型安全**：完整的 TypeScript 类型支持  

### 架构

```
SDK 源文件 (sdk-mock/ts/formulas.ts)
    ↓
    | Vite ?raw import
    ↓
formula-source-loader.ts
    ↓
    | 正则提取单个函数源码
    ↓
enrichFormulasWithSource()
    ↓
    | 注入到 FormulaDefinition
    ↓
formulaStore.loadFormulas()
    ↓
    | 存储到 Zustand store
    ↓
FormulaCode 组件显示
```

## 核心实现

### 1. 源码加载器 (`src/lib/formula-source-loader.ts`)

提供了三个主要功能：

```typescript
// 1. 批量增强公式定义
enrichFormulasWithSource(formulas: FormulaDefinition[]): FormulaDefinition[]

// 2. 获取单个公式源码
getFormulaSource(formulaId: string): { sourceCode?: string; formulaText?: string }

// 3. 获取完整 SDK 源码
getFullSDKSource(): string
```

#### 关键函数映射

```typescript
const formulaIdToFunctionName: Record<string, string> = {
  funding_fee: "calculateFundingFee",
  liquidation_price: "calculateLiquidationPrice",
  pnl_calculation: "calculatePnL",
  margin_requirement: "calculateMarginRequirement",
  percentage_change: "calculatePercentageChange",
  order_fee: "calculateOrderFee",
  est_liq_price: "estLiqPrice",
};
```

### 2. Store 集成 (`src/store/formulaStore.ts`)

```typescript
import { enrichFormulasWithSource } from "../lib/formula-source-loader";

// 在 loadFormulas 中自动增强
formulas = enrichFormulasWithSource(sourceFiles as FormulaDefinition[]);
```

### 3. 组件使用 (`src/pages/playground/components/FormulaCode.tsx`)

```typescript
// 直接从 formula 对象中获取
const code = selectedFormula.sourceCode || selectedFormula.formulaText;
```

## 使用方法

### 添加新公式

当添加新的公式时，需要：

1. **在 SDK 文件中实现函数** (`sdk-mock/ts/formulas.ts`)

```typescript
/**
 * @formulaId new_formula
 * @name New Formula
 * @description Your description
 * @version 1.0.0
 * ...
 */
export function calculateNewFormula(param1: number): number {
  return param1 * 2;
}
```

2. **更新函数映射** (`src/lib/formula-source-loader.ts`)

```typescript
const formulaIdToFunctionName: Record<string, string> = {
  // ... 现有映射
  new_formula: "calculateNewFormula", // 添加新映射
};
```

3. **在 mockFormulas.ts 中添加元数据定义**

```typescript
{
  id: "new_formula",
  name: "New Formula",
  // ... 其他元数据
  // 注意：不需要手动添加 sourceCode 字段
}
```

4. **完成！** 源码会自动加载

### 调试源码提取

如果源码没有正确提取，可以：

```typescript
import { getFormulaSource, getFullSDKSource } from "../lib/formula-source-loader";

// 查看完整 SDK 源码
console.log(getFullSDKSource());

// 查看单个公式的提取结果
console.log(getFormulaSource("funding_fee"));
```

## 技术细节

### Vite ?raw 导入

```typescript
import sdkSourceRaw from "../sdk-mock/ts/formulas.ts?raw";
```

- 在构建时将文件内容作为字符串导入
- 不会执行代码，只读取文本
- 支持热更新（开发环境）

### 正则表达式提取

提取完整函数（包含 JSDoc）：
```typescript
/\/\*\*[\s\S]*?\*\/\s*export\s+function\s+functionName\s*\([\s\S]*?\n\}/m
```

提取函数体（不含 JSDoc）：
```typescript
/export\s+function\s+functionName\s*\([\s\S]*?\n\}/m
```

### 类型声明

`src/vite-env.d.ts` 提供了 `?raw` 导入的类型支持：

```typescript
declare module "*.ts?raw" {
  const content: string;
  export default content;
}
```

## 优势对比

### 相比手动维护源码字符串

- ✅ 避免重复维护
- ✅ 自动同步更新
- ✅ 减少出错可能

### 相比运行时解析（ts-morph）

- ✅ 零运行时开销
- ✅ 无需在浏览器中引入大型解析库
- ✅ 构建体积更小

### 相比仅存储函数引用

- ✅ 可以显示原始源码
- ✅ 支持语法高亮
- ✅ 用户可以看到实际实现

## 限制和注意事项

1. **函数命名约定**：需要在映射表中维护 `formulaId -> functionName` 的对应关系

2. **正则表达式限制**：
   - 假设函数格式符合标准导出函数格式
   - 不支持嵌套函数或复杂语法结构

3. **构建时确定**：源码在构建时提取，运行时不能动态修改

## 未来改进方向

### 短期优化

- [ ] 自动生成 `formulaIdToFunctionName` 映射表
- [ ] 支持多文件 SDK 源码
- [ ] 改进正则表达式的健壮性

### 长期规划

- [ ] 支持 Rust 源码提取和显示
- [ ] 实现源码对比视图（TypeScript vs Rust）
- [ ] 支持从远程 SDK 仓库动态加载

## 相关文件

- `src/lib/formula-source-loader.ts` - 核心加载器
- `src/store/formulaStore.ts` - Store 集成
- `src/pages/playground/components/FormulaCode.tsx` - UI 组件
- `sdk-mock/ts/formulas.ts` - SDK 源文件
- `src/vite-env.d.ts` - 类型声明

## 参考资料

- [Vite Assets Handling](https://vitejs.dev/guide/assets.html#importing-asset-as-string)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

