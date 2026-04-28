# 简介

「Taro Components说明文档」

## 如何引用

引用Taro组件需要遵循此按需引用的方式

```jsx
import { Input } from '@tarojs/components'
```

## 注意事项

- 当有样式需求时，所有组件都可以使用className属性，可以自定义样式。

- `Input` 设置 height 样式后不垂直居中时，优先用 line-height=height，其次用外层 flex align-items:center，或用 padding 微调。
