# 公式源码显示功能 - 快速开始

## ✅ 已完成的工作

### 1. 核心功能实现

- ✅ 创建了 `formula-source-loader.ts` 源码加载器
- ✅ 集成到 `formulaStore` 中，自动为公式增强源码
- ✅ 补全了 SDK 中缺失的公式实现（`order_fee`, `est_liq_price`）
- ✅ 配置了 Vite 类型声明支持 `?raw` 导入

### 2. 数据流程

```
SDK 源文件 (sdk-mock/ts/formulas.ts)
    ↓ [Vite ?raw import]
formula-source-loader.ts
    ↓ [正则提取 + 函数映射]
enrichFormulasWithSource()
    ↓ [注入 sourceCode/formulaText]
formulaStore
    ↓ [存储到 state]
FormulaCode 组件
    ↓ [语法高亮显示]
用户界面
```

## 🚀 如何使用

### 查看公式源码

在应用中选择任意公式，源码会自动显示在相应的面板中。

`FormulaCode` 组件会从 `selectedFormula.sourceCode` 读取源码并显示。

### 添加新公式（需要源码支持）

**步骤 1：在 SDK 中实现函数**

编辑 `sdk-mock/ts/formulas.ts`，添加新函数：

```typescript
/**
 * @formulaId my_new_formula
 * @name My New Formula
 * @description Calculate something cool
 * @version 1.0.0
 * @engineHint.ts.rounding round
 * @engineHint.ts.scale 8
 *
 * @param {number} input1 - First input @default 100
 * @param {number} input2 - Second input @default 200
 * @returns {number} The result
 */
export function calculateMyNewFormula(input1: number, input2: number): number {
  return input1 + input2;
}
```

**步骤 2：更新函数映射**

编辑 `src/lib/formula-source-loader.ts`，在 `formulaIdToFunctionName` 中添加映射：

```typescript
const formulaIdToFunctionName: Record<string, string> = {
  // ... 现有映射
  my_new_formula: "calculateMyNewFormula", // 新增
};
```

**步骤 3：在 mockFormulas.ts 中添加元数据**

编辑 `src/constants/mockFormulas.ts`：

```typescript
{
  id: "my_new_formula",
  name: "My New Formula",
  version: "1.0.0",
  description: "Calculate something cool",
  // ... 其他配置
  // 注意：不需要手动添加 sourceCode！它会自动加载
}
```

**完成！** 🎉 重启开发服务器，新公式的源码会自动显示。

## 🔍 测试验证

访问测试页面验证功能：

```bash
# 确保开发服务器正在运行
npm run dev

# 在浏览器中打开
# http://localhost:5174/test-source-loader.html
```

或在浏览器控制台中测试：

```javascript
import { getFormulaSource } from "./src/lib/formula-source-loader.ts";

// 获取单个公式源码
const source = getFormulaSource("funding_fee");
console.log(source.sourceCode);
```

## 📋 当前支持的公式

所有以下公式都已配置源码加载：

- ✅ `funding_fee` → `calculateFundingFee`
- ✅ `liquidation_price` → `calculateLiquidationPrice`
- ✅ `pnl_calculation` → `calculatePnL`
- ✅ `margin_requirement` → `calculateMarginRequirement`
- ✅ `percentage_change` → `calculatePercentageChange`
- ✅ `order_fee` → `calculateOrderFee`
- ✅ `est_liq_price` → `estLiqPrice`

## ⚙️ 技术说明

### 为什么使用 Vite ?raw 导入？

1. **零运行时开销** - 在构建时处理，不影响运行性能
2. **轻量级** - 无需在浏览器中加载 ts-morph 等大型解析库
3. **自动热更新** - 开发时修改 SDK 源码会自动更新
4. **类型安全** - 完整的 TypeScript 支持

### 源码提取原理

使用正则表达式匹配导出函数：

```typescript
// 匹配完整函数（含 JSDoc）
/\/\*\*[\s\S]*?\*\/\s*export\s+function\s+${functionName}\s*\([\s\S]*?\n\}/m

// 匹配函数体（不含 JSDoc）
/export\s+function\s+${functionName}\s*\([\s\S]*?\n\}/m
```

## 🐛 常见问题

### Q: 公式源码不显示？

**检查清单：**

1. SDK 文件中是否有该函数的实现？
2. `formulaIdToFunctionName` 映射表中是否有该公式？
3. 函数名是否正确匹配？
4. 开发服务器是否重启？

**调试方法：**

```javascript
import { getFullSDKSource } from "./src/lib/formula-source-loader.ts";
console.log(getFullSDKSource()); // 查看完整 SDK 源码
```

### Q: 提示 "Failed to resolve import ?raw"？

确保路径正确：

- 从 `src/lib/` 到 `sdk-mock/ts/` 的相对路径是 `../../sdk-mock/ts/`
- 检查 `src/vite-env.d.ts` 是否存在并包含 `?raw` 类型声明

### Q: 语法高亮不工作？

检查 `FormulaCode.tsx` 中的 highlight.js 配置：

```typescript
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
hljs.registerLanguage("typescript", typescript);
```

## 📚 相关文档

- [详细技术文档](./FORMULA_SOURCE_LOADING.md)
- [Vite Assets Handling](https://vitejs.dev/guide/assets.html)

## 🎯 下一步

当前实现已经可以工作，未来可以考虑：

- [ ] 自动生成函数映射表（避免手动维护）
- [ ] 支持多个 SDK 文件源码
- [ ] 添加源码编辑和实时预览功能
- [ ] 支持 Rust 源码加载和对比显示
