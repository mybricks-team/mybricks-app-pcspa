# 简介

「Taro Components说明文档」

## 如何引用

引用Taro组件需要遵循此按需引用的方式

```jsx
import { Input } from '@tarojs/components'
```

### 基础展示

- **View**：通用容器（布局/点击/样式），注意不同端对 `hoverClass`、`catchMove` 支持差异
- **Text**：文本展示，注意 `numberOfLines`/换行表现跨端差异；长文本建议配合样式控制溢出
- **Icon**：内置图标，注意图标类型与小程序端一致性；复杂图标更推荐自定义 SVG/字体图标
- **RichText**：富文本渲染，注意安全（避免不可信 HTML）；样式可控性有限、跨端差异较大

### 滚动与列表

- **ScrollView**：局部滚动容器，注意嵌套滚动/滚动穿透；长列表性能一般，优先用虚拟列表方案
- **Swiper / SwiperItem**：轮播，注意 `autoplay` 与手势冲突、嵌套滑动；图片懒加载与高度自适应要单独处理

### 媒体与能力

- **Image**：图片展示，重点注意 `mode`（裁剪/填充/等比）；建议加占位与错误兜底（onError）
- **Video**：视频播放，注意自动播放策略（H5/小程序限制不同）；全屏/内联表现跨端差异
- **Canvas**：绘制，注意 2D API 兼容性与性能；小程序与 H5 的上下文/像素比处理不同
- **Map**：地图，注意 key/权限与覆盖物数量（marker 多会卡）；H5 依赖地图实现差异
- **Audio**（或相关 API）：音频能力，注意 H5 受用户手势限制

### 表单输入（最常用、最容易踩坑）

- **Button**：按钮，注意 `openType`（登录/分享/获取手机号等）仅特定端可用；禁用态样式需自定义
- **Input**：单行输入，注意受控写法的光标问题（频繁 setState）；`type`、`maxlength` 兼容差异
- **Textarea**：多行输入，注意键盘顶起、滚动穿透；iOS/H5 上高度与光标表现差异
- **Switch**：开关，注意受控与默认值区分（`checked` vs `defaultChecked`）
- **Checkbox / CheckboxGroup**：多选，注意用 group 管理；列表渲染需稳定 key
- **Radio / RadioGroup**：单选，同样建议 group 管理
- **Slider**：滑块，注意 `step`、`min/max` 与触发频率（实时更新易卡）
- **Picker**：选择器（普通/多列/时间/地区），注意各端 UI 不一致；值格式要统一
- **Form**：表单容器，小程序端能力更强；H5 校验/提交通常更依赖自定义逻辑

## 注意事项

- 当有样式需求时，所有组件都可以使用className属性，可以自定义样式。
- **Input** 禁止设置css样式`height`，推荐使用`padding` 来控制输入框的高度，例如：`padding: 10px 20px;`
- **Text** 默认是内联元素，需要设置css样式`display: block;` 才能作为块级元素，更推荐用 View 做块级结构、用 Text 做文本承载
