---
name: desgin-guidelines
description: 生成企业级B端中后台UI组件与页面。当用户要求设计、构建、生成、优化中后台页面、组件、表单、表格、卡片、按钮、弹窗、导航、布局、工作台、仪表盘时使用。支持React+Less/CSS Modules输出。
when_to_use: 当用户要求设计或构建B端中后台页面、组件、表单、表格、卡片、按钮、弹窗、导航、布局、工作台、仪表盘，或需要基于企业级设计规范生成/优化前端UI时使用。
---

# IRON LAW

**必须使用本规范中的颜色、间距、字体、圆角、阴影Token生成UI。严禁使用通用AI默认样式（如紫蓝渐变、Inter字体、千篇一律的圆角卡片）。**

---

# 工作流程

按以下步骤执行，完成后逐项勾选：

- [ ] Step 1：理解需求。确定组件/页面类型、输出格式（默认React+Less/CSS Modules）。如需求模糊，先向用户确认。
- [ ] Step 2：应用设计规范。逐条核对并应用下方的「核心设计规范」。
- [ ] Step 3：生成代码。基于规范输出组件或页面代码。
- [ ] Step 4：自检交付。对照「交付检查清单」逐项确认，全部通过后再输出。

---

# 核心设计规范

## 颜色

| Token | 色值 | 用途 |
|-------|------|------|
| --bg | #f5f7fb | 页面背景 |
| --panel | #ffffff | 卡片、面板背景 |
| --text | #0f172a | 主标题、正文 |
| --muted | #64748b | 次要文字、标签、说明 |
| --line | #e2e8f0 | 边框、分割线 |
| --primary | #2563eb | 主按钮、链接、选中态 |
| --primary-dark | #1d4ed8 | 主色hover、选中文字 |
| --success | #10b981 | 成功状态 |
| --warning | #f59e0b | 警告、重点提示 |
| --danger | #ef4444 | 危险、错误信息 |
| --purple | #8b5cf6 | 紫色标签、特殊分类 |

## 字体

字体栈：
```
ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif
```

| 层级 | 字号 | 字重 | 行高 | 颜色 | 用途 |
|------|------|------|------|------|------|
| 大标题 | 24px | 900 | 1.2 | --text | 详情页主标题 |
| 页面标题 | 18px | 800 | 1.2 | --text | Topbar标题 |
| 卡片标题 | 16px | 800 | 默认 | --text | 卡片头部、弹窗标题 |
| 小标题 | 14px | 800 | 默认 | --text | 列表标题、卡片子标题 |
| 正文 | 13px | 400/700 | 1.5 | --text | 列表内容、表单文字、按钮文字 |
| 辅助文字 | 12px | 400/700 | 1.5 | --muted | 标签、说明、筛选标签 |
| 标签小字 | 11px | 700 | 默认 | 继承 | tag内文字 |

## 间距

以 **4px** 为基数：

| Token | 值 | 用途 |
|-------|------|------|
| --space-1 | 4px | 小间隙 |
| --space-2 | 6px | 标签内边距微调 |
| --space-3 | 8px | 组件内部gap |
| --space-4 | 10px | 卡片内gap、列表项间距 |
| --space-5 | 12px | 卡片内边距、表头padding |
| --space-6 | 14px | 大卡片内边距 |
| --space-7 | 16px | 标准卡片内边距、弹窗padding |
| --space-8 | 18px | 导航/主内容区内边距 |
| --space-9 | 20px | 大间距 |
| --space-10 | 24px | 导入页/引导页大间距 |

## 圆角

| Token | 值 | 用途 |
|-------|------|------|
| --radius-sm | 6px | 小按钮、小标签 |
| --radius-md | 8px | 按钮、日历按钮 |
| --radius-lg | 10px | 输入框、表单项 |
| --radius-xl | 12px | 卡片、面板、列表项 |
| --radius-2xl | 14px | 大卡片、模块卡片 |
| --radius-3xl | 16px | 弹窗、大面板 |
| --radius-full | 999px | tag、badge、圆点 |

## 阴影

| Token | 值 | 用途 |
|-------|------|------|
| --shadow-card | 0 8px 20px rgba(15, 23, 42, .08) | 标准卡片 |
| --shadow-card-hover | 0 12px 28px rgba(15, 23, 42, .12) | 卡片hover |
| --shadow-focus | 0 0 0 3px rgba(37, 99, 235, .15) | 输入框聚焦 |

## 按钮

### 按钮基础

所有按钮默认高度 **32px**，字号 **13px**，字重 **600**，颜色 **--text**。

> **⚠️ 强制规则：所有按钮默认禁止使用任何 icon（图标）。** 按钮内只允许纯文字，不要添加图标、emoji、SVG。仅当用户明确要求带图标时才可添加。

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  line-height: 1;
  white-space: nowrap;
}
```

### 主按钮（Primary）

用于页面核心操作：新建、搜索、保存。

```css
.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn-primary:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}
```

### 次按钮（Default）

用于次要操作：重置、取消、以及**表格操作列的警示操作**（关闭、删除）。

```css
.btn-default {
  background: #fff;
  border-color: var(--line);
  color: var(--text);
}
.btn-default:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
```

### 文字按钮（Text）

用于弱操作或警示操作：关闭、删除。

```css
.btn-text {
  background: transparent;
  border-color: transparent;
  color: var(--muted);
}
.btn-text:hover {
  color: var(--danger);
}
```

### 小型按钮（.btn-sm）

用于**表格操作列**，高度 **24px**，padding **0 10px**，圆角 **4px**，字号 **12px**。

```css
.btn-sm {
  height: 24px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 12px;
}
```

**表格操作列按钮规则：**
- 常规操作（跟进、编辑、查看）：`.btn-primary.btn-sm`
- 警示操作（关闭、删除）：`.btn-default.btn-sm`
- 按钮内禁止使用 icon，仅纯文字

### Tab 切换按钮

```css
.tab-group {
  display: inline-flex;
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}
.tab-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  line-height: 1;
}
.tab-btn:hover {
  color: var(--text);
}
.tab-btn.active {
  background: var(--primary);
  color: #fff;
}
```

---

## 标签（Tag）

标签用于状态标识、分类展示。高度 **22px**，圆角 **999px**，字号 **12px**，字重 **600**。

```css
.tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  line-height: 1;
}
```

语义变体：

| 语义 | 类名 | 背景 | 边框 | 文字 |
|------|------|------|------|------|
| 信息/蓝 | .tag-blue | rgba(37,99,235,.10) | rgba(37,99,235,.35) | #1d4ed8 |
| 成功/绿 | .tag-green | rgba(16,185,129,.10) | rgba(16,185,129,.35) | #047857 |
| 警告/橙 | .tag-orange | rgba(245,158,11,.14) | rgba(245,158,11,.35) | #b45309 |
| 危险/红 | .tag-red | #fff | #fecaca | #dc2626 |
| 灰色/默认 | .tag-gray | #f8fafc | #e2e8f0 | #64748b |
| 紫色 | .tag-purple | rgba(139,92,246,.10) | rgba(139,92,246,.35) | #7c3aed |

---

## 选择器（Select）

选择器由「标签 + 触发器 + 下拉菜单」组成。触发器高度 **32px**，字号 **13px**。

### 触发器

```css
.select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  background: #fff;
  cursor: pointer;
  min-width: 120px;
  line-height: 1;
}
.select-trigger:hover {
  border-color: #cbd5e1;
}
.select-trigger.open {
  border-color: var(--primary);
}
```

### 下拉菜单

```css
.select-dropdown {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .12);
  padding: 4px;
  min-width: 160px;
  max-height: 280px;
  overflow-y: auto;
}
.select-option {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  line-height: 1.5;
}
.select-option:hover {
  background: #f8fafc;
}
.select-option.active {
  background: rgba(37, 99, 235, .08);
  color: var(--primary);
  font-weight: 600;
}
```

> 独立表单场景（如弹窗内）可用 `.select-trigger` 作为下拉框。**页面顶部筛选区不用此结构，改用下方「筛选条件区（filter-bar）」的胶囊 chip 形态。**

## 卡片

```css
.card {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, .08);
}
```

- 头部：padding 12px 14px，底部边框 1px solid var(--line)，flex space-between，gap 12px
- 内容区：padding 12px 14px 14px

---

## 输入框

```css
input, textarea {
  width: 100%;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  background: #fff;
  color: var(--text);
  outline: none;
  line-height: 1;
}
input::placeholder, textarea::placeholder {
  color: #94a3b8;
}
input:focus, textarea:focus {
  border-color: rgba(37, 99, 235, .55);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .15);
}
textarea {
  height: auto;
  min-height: 80px;
  padding: 8px 10px;
  line-height: 1.5;
  resize: vertical;
}
```

---

## 表格

```css
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  color: var(--text);
}
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
  color: #0b1220;
  font-size: 13px;
  font-weight: 700;
  padding: 10px;
  text-align: center;
  white-space: nowrap;
}
tbody td {
  border-bottom: 1px solid #f1f5f9;
  padding: 10px;
  color: var(--text);
  font-size: 13px;
  text-align: center;
}
tbody tr:hover td {
  background: #f8fafc;
}
```

### 表格规则
- **表格上方禁止输出任何头部内容** — 不要生成列表标题、统计条数（如"共 128 条"）、导出按钮等表格头部区域，表格直接呈现即可。
- 首列左对齐：`text-align: left`
- 数字列右对齐：`text-align: right; font-variant-numeric: tabular-nums`
- 链接文字（如商机名称）：`color: var(--primary); font-weight: 600`，hover 时 `color: var(--primary-dark)`
- 操作列按钮：
  - 常规操作（跟进、编辑、查看）使用 `.btn-primary.btn-sm`
  - 警示操作（关闭、删除）使用 `.btn-default.btn-sm`
  - 按钮间距：`gap: 8px`
  - 按钮内禁止使用 icon，仅纯文字
- 可展开行：展开内容内边距 `12px 14px`

## 筛选条件区（filter-bar）

**标准结构：胶囊形筛选项（chip）+ 点击弹出下拉浮层（popover）。** 每个筛选项是一个圆角胶囊，内部为「标签 + 当前值 + 下拉箭头」，点击展开选项浮层。这是商机池页面的标准筛选形态，禁止用普通 label+select 平铺替代。

```css
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-chip {
  position: relative;
  flex: 0 0 auto;
}
.filter-chip .chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
  user-select: none;
  white-space: nowrap;
}
.filter-chip .chip-btn:hover {
  border-color: rgba(37, 99, 235, .35);
  background: rgba(37, 99, 235, .04);
}
.filter-chip .chip-label {
  color: var(--muted);
  font-weight: 700;
}
.chip-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filter-chip .chip-caret {
  color: #94a3b8;
  font-size: 12px;
  transform: translateY(-1px);
}
```

下拉浮层（popover）：

```css
.filter-popover {
  position: absolute;
  top: 38px;
  left: 0;
  z-index: 20;
  min-width: 220px;
  max-width: 340px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .12);
  display: none;
}
.filter-popover.show {
  display: block;
}
.pop-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow: auto;
}
.pop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #eef2f7;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
}
.pop-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.pop-item.active {
  border-color: rgba(37, 99, 235, .35);
  background: rgba(37, 99, 235, .08);
  color: #1d4ed8;
  font-weight: 800;
}
```

- 胶囊高度 **34px**，圆角 **999px**（全圆角），字号 **12px**
- 标签（chip-label）：`--muted`，字重700；当前值（chip-value）：字重800
- 选中项（pop-item.active）：淡蓝底 `rgba(37,99,235,.08)` + 蓝字 `#1d4ed8` + 字重800
- 右侧操作区（如需要）：`margin-left: auto`

---

## 页面结构（卡片化）

典型中后台页面由多个卡片纵向堆叠：

```css
.page {
  background: var(--bg);
  min-height: 100vh;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
```

卡片层级：
1. **Topbar 卡片**：页面标题（18px/800/--text）+ 辅助信息 + 右上角操作（主按钮）
2. **筛选卡片**：Tab 切换 + 搜索框 + 筛选条件区 + 操作按钮
3. **列表卡片**：直接放置表格，**卡片内表格上方不加标题、统计条数等头部内容**

每个卡片均使用 `.card` 标准样式。

---

## 弹窗

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, .45);
  padding: 18px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .12);
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}
.modal-body {
  padding: 14px 16px;
  overflow-y: auto;
}
.modal-footer {
  padding: 12px 16px 14px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

---

## 布局

- 页面背景：`var(--bg)` / `#f5f7fb`
- 主内容区：padding 18px，gap 14px，flex column
- 侧边导航：宽220px，bg `linear-gradient(180deg, #0b1220, #0b1220 40%, #0e1a33)`，文字 `#e5e7eb`

---

# 反模式

严禁：
- 使用紫蓝渐变、Inter字体等通用AI默认样式。
- 使用本规范之外的颜色、间距、圆角、阴影值。
- 遗漏按钮、输入框、卡片的hover、focus、disabled状态。
- 使用全局CSS污染（必须用CSS Modules或命名空间）。
- 代码中残留TODO、FIXME、xxx等占位符。
- 用emoji代替图标。
- **在任何按钮中使用 icon（图标）** — 默认生成的所有按钮只允许纯文字，除非用户明确要求。
- **在表格上方输出头部内容** — 禁止生成列表标题、统计条数（"共 N 条"）、表格级导出按钮等，表格直接呈现。
- **表格操作列常规操作用错按钮** — 常规操作（跟进、编辑、查看）必须用 `.btn-primary.btn-sm`，警示操作（关闭、删除）用 `.btn-default.btn-sm`。
- **为按钮、输入框、选择器使用错误的高度** — 标准组件高度32px，表格操作按钮24px。
- **Tab 按钮使用错误的颜色** — 默认 `--muted`，选中 `--primary` + 白字。
- **表格表头/单元格使用错误的颜色** — 表头 `#0b1220`，单元格 `--text`。
- **筛选区用普通 label+select 平铺** — 必须使用胶囊形 chip + popover 浮层结构（`.filter-chip` / `.chip-btn` / `.filter-popover`）。

---

# 交付检查清单

### 颜色与基础
- [ ] 所有颜色值均来自本规范Token。
- [ ] 所有间距为4px倍数。
- [ ] 所有圆角、阴影均使用规范Token。
- [ ] 字体栈使用规范中的完整声明。

### 按钮合规
- [ ] **所有按钮均为纯文字，无任何 icon（除非用户明确要求）。**
- [ ] 主按钮（.btn-primary）用于页面级核心操作（新建、搜索、保存）及表格操作列常规操作（跟进、编辑、查看）。
- [ ] 次按钮（.btn-default）用于次要操作（重置、取消）及表格操作列警示操作（关闭、删除）。
- [ ] 文字按钮（.btn-text）用于弱操作。
- [ ] 所有按钮高度32px（标准）或24px（.btn-sm 表格操作列）。
- [ ] 所有按钮字号13px（标准）或12px（.btn-sm）。
- [ ] 所有按钮字重600，颜色 --text（次按钮）或 #fff（主按钮）。

### Tab 按钮合规
- [ ] Tab 按钮高度32px，字号13px，字重600。
- [ ] 默认态颜色 --muted，选中态背景 --primary + 白字。
- [ ] Tab 容器背景 #f8fafc，圆角8px，内边距4px。

### Tag 合规
- [ ] Tag 高度22px，圆角999px，字号12px，字重600。
- [ ] 使用语义变体（blue/green/orange/red/gray/purple）而非任意颜色。

### 选择器/筛选合规
- [ ] 选择器触发器高度32px，字号13px，圆角6px。
- [ ] 下拉菜单选项 padding 8px 12px，选中态背景 rgba(37, 99, 235, .08)。
- [ ] 筛选区使用胶囊 chip + popover 结构，chip 高度34px、圆角999px、字号12px。
- [ ] chip 标签 --muted 字重700，当前值字重800；选中项蓝底蓝字字重800。

### 输入框合规
- [ ] 输入框高度32px，圆角6px，padding 0 10px，字号13px。
- [ ] placeholder 颜色 #94a3b8。
- [ ] focus 态边框 rgba(37, 99, 235, .55) + 聚焦环。

### 表格合规
- [ ] **表格上方无任何头部内容（标题、统计条数、导出按钮等）。**
- [ ] 表格字号13px，表头文字 #0b1220，单元格文字 --text。
- [ ] 表头背景 #f8fafc，字重700。
- [ ] 行hover背景 #f8fafc。
- [ ] 链接文字颜色 --primary，字重600。
- [ ] 操作列按钮使用 .btn-sm（高度24px，字号12px），常规操作用 .btn-primary，警示操作用 .btn-default。

### 卡片与布局合规
- [ ] 卡片背景 #fff，边框 --line，圆角14px，阴影 --shadow-card。
- [ ] 页面背景 --bg，内边距18px，卡片间距14px。
- [ ] 页面采用卡片化堆叠（Topbar + 筛选 + 列表）。

### 输出质量
- [ ] 无占位文本残留（TODO、FIXME、xxx）。
- [ ] 样式已做作用域隔离（CSS Modules）。
- [ ] 所有交互元素具备 hover 态（颜色、背景、边框变化）。
