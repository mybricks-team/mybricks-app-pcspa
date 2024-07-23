# PC页面本地引入

**--componentName--**

此组件由 MyBricks 平台生成
地址：--sourceLink--

## 安装依赖

运行之前需要安装必要的渲染器包以及相关依赖包

推荐使用 npm ，只需要安装一个包，执行以下命令

```Bash
npm install @mybricks/renderer-pc -S
```

注意：如果使用 pnpm 或者 yarn，需要额外手动安装 @mybricks/renderer-pc 中 peerDependencies 的依赖

```Bash
npm install antd@4.21.6 @ant-design/icons@4.7.0 moment @mybricks/comlib-basic @mybricks/comlib-pc-normal -S
```

Tips：内置的组件库 antd 需使用 v4 版本

## 组合式 API

```vue
<script setup lang="ts">
import --componentName-- from './--componentName--/index.vue'
</script>

<template>
  <--componentKebabName-- prop1="自定义值" />
</template>
```

## 选项式 API
```vue
<template>
  <--componentKebabName-- prop1="自定义值" />
</template>

<script lang="ts">
import --componentName-- from './--componentName--/index.vue'

export default {
  components: {
    --componentName--,
  },
  setup() {
    return { }
  },
}
</script>
```

## 注意事项

- 组件需要在 [Vue3](https://cn.vuejs.org/) 环境中运行。
- 组件依赖的外部库需要自行安装。
- 代码中出现形似”u_0IEOE“的随机命名时，建议去MyBricks平台上补充对应的命名信息
