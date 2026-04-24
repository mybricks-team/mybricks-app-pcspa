# 简介

- Taro 框架

## 使用Taro的注意事项

- 路由相关功能必须使用 mybricks 提供的 路由功能(`useNavigate`、`useLocation`)，禁止直接使用 Taro 提供的路由功能。

```jsx
// 禁止使用
// import Taro from '@tarojs/taro'
// Taro.navigateTo({
//   url: `/pages/...`
// })

// 使用 mybricks 提供的路由功能
import { useNavigate, useLocation } from 'mybricks';
const navigate = useNavigate();
const location = useLocation();

// 页面跳转
navigate(`/pages/detail/index`, {
  // 替换当前路由
  replace: true,
  // 页面参数
  state: {
    id: 1,
  },
});
