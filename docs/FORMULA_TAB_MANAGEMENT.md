# Formula Tab Management System

## 概述

实现了类似 VSCode 的多文件编辑功能,允许用户同时打开和测试多个公式。

## 核心功能

### 1. 多标签页管理

- ✅ 同时打开多个公式
- ✅ 标签页之间快速切换
- ✅ 关闭单个标签页
- ✅ 标签页状态持久化(刷新页面后保留)
- ✅ 智能标签页激活(关闭当前标签时自动激活相邻标签)

### 2. 集成点

#### FormulaTabStore (`src/store/formulaTabStore.ts`)

管理所有打开的公式标签页的核心 store:

```typescript
interface FormulaTab {
  id: string; // 公式 ID
  label: string; // 显示的标签名称
  type: "code" | "grid"; // 标签类型
  isDirty?: boolean; // 是否有未保存的修改
}

// 主要方法:
-addTab(formulaId, formulaName, type) - // 添加新标签页
  closeTab(formulaId) - // 关闭标签页
  setActiveTab(formulaId) - // 切换活动标签页
  updateTab(formulaId, updates) - // 更新标签页信息
  isTabOpen(formulaId) - // 检查标签页是否已打开
  getActiveTab(); // 获取当前活动标签页
```

#### FormulaDetails 组件 (`src/pages/formula/details.tsx`)

公式详情页面,集成了标签页管理:

- 从 URL 参数读取公式 ID
- 自动将公式添加到标签页
- 根据活动标签页显示对应的公式内容
- 标签页切换时更新 URL

#### FormulaItem 组件 (`src/pages/datasheet/components/FormulaComponents.tsx`)

公式列表项,点击时:

- 将公式添加到标签页存储
- 导航到公式详情页面
- 如果标签页已存在,只激活该标签

## 使用流程

### 用户操作流程

1. **打开公式**

   - 在左侧公式列表中点击任意公式
   - 公式会在新标签页中打开
   - 如果已经打开,则直接激活该标签

2. **切换标签页**

   - 点击任意标签页切换到该公式
   - URL 会自动更新为对应的公式 ID

3. **关闭标签页**

   - 点击标签页上的 X 图标关闭
   - 自动激活相邻的标签页
   - 如果是最后一个标签,则不显示任何内容

4. **添加新标签页**
   - 点击右侧的 + 按钮(待实现公式选择器)

## 技术实现细节

### 状态管理架构

```
FormulaTabStore (全局状态)
    ├── tabs: FormulaTab[]           // 所有打开的标签页
    ├── activeTabId: string | null   // 当前活动的标签页 ID
    └── 各种操作方法

FormulaDetails 组件
    ├── 监听 URL 参数变化
    ├── 同步标签页状态
    └── 渲染当前活动公式的内容

TabBar 组件
    └── 显示所有标签页,处理用户交互
```

### 持久化

使用 zustand 的 persist 中间件,标签页状态会自动保存到 localStorage:

- 键名: `formula-tab-storage`
- 保存内容: `tabs` 和 `activeTabId`
- 刷新页面后会自动恢复标签页状态

### URL 路由同步

- 格式: `/formula/:id`
- 每次切换标签页都会更新 URL
- 直接访问 URL 会自动打开对应的标签页
- 关闭标签页时会更新 URL 到新的活动标签

## 扩展功能(待实现)

### 1. 标签页右键菜单

```typescript
// 可以添加以下功能:
- 关闭其他标签页 (closeOtherTabs) ✅ 已实现
- 关闭所有标签页 (closeAllTabs) ✅ 已实现
- 关闭右侧标签页
- 固定标签页
```

### 2. 未保存状态提示

```typescript
// 在 FormulaTab 中使用 isDirty 标志
-标签页有修改时显示圆点 - 关闭前提示保存;
```

### 3. 标签页拖拽排序

```typescript
// 使用 dnd-kit 或类似库实现
- 拖拽重新排序标签页
- 更新 tabs 数组顺序
```

### 4. 公式选择器对话框

```typescript
// 点击 + 按钮时打开
-搜索和过滤公式 - 批量打开多个公式 - 快捷键支持(Cmd / Ctrl + P);
```

### 5. 分组和工作区

```typescript
// 高级功能
-保存标签页组合为工作区 - 快速切换不同的工作区 - 导出 / 导入工作区配置;
```

## 最佳实践

1. **性能优化**

   - 使用 useMemo 缓存标签页转换
   - 避免在每次渲染时创建新对象

2. **错误处理**

   - 检查公式是否存在再添加标签页
   - 处理 URL 中无效的公式 ID

3. **用户体验**
   - 保持标签页状态与 URL 同步
   - 提供清晰的视觉反馈(活动标签高亮)
   - 智能的标签页激活逻辑

## 相关文件

```
src/
├── store/
│   └── formulaTabStore.ts                    # 标签页状态管理
├── pages/
│   ├── formula/
│   │   └── details.tsx                       # 公式详情页面
│   └── datasheet/
│       ├── components/
│       │   ├── TabBar.tsx                    # 标签栏组件
│       │   └── FormulaComponents.tsx         # 公式列表项组件
│       └── types.ts                          # 类型定义
```

## 开发日志

- 2024-11-22: 初始实现多标签页管理系统
  - 创建 formulaTabStore
  - 更新 TabBar 组件支持点击切换
  - 集成到 FormulaDetails 和 FormulaItem
  - 添加 URL 路由同步
  - 实现状态持久化
