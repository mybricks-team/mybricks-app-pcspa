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

// 路由信息
console.info('当前路由信息', location);
console.info('当前路由路径', location.pathname);
console.info('当前路由参数', location.state);
```
### 数据源使用
所有正式数据（接口请求、静态数据）必须维护在 `dataSource.js` 文件中。

通过继承 `DataSource` 基类并 `export default new MyDatasource()` 来声明数据源；

怎么声明数据源：
1. 判断用户是否提供接口信息，对于提供了接口信息的，使用 `this.axios` 发起请求；
2. 对于未提供接口信息的，思考哪些应该属于接口信息，用静态数据来return返回，为以后开发留下坑位，保障运行态也能看见数据；


```js DataSource 说明
// DataSource 基类：mybricks 提供，构造时对所有子类方法自动做 Proxy 拦截，
class DataSource {
  constructor() { /* 对所有方法自动 Proxy 包装 */ }
}
```

dataSource.js 文件示例：
```js
import { DataSource } from 'mybricks'

class MyDatasource extends DataSource {
  // 场景一：静态数据，直接 return
  getConfig() {
    return { theme: 'dark', version: '1.0.0' }
  }

  // 场景二：真实接口，用 this.axios 发请求（不要自己 import axios）
  // this.axios 是 DataSource 基类内置的独立 axios 实例，与其他组件隔离
  async getUserById({ id }) {
    return this.axios.get('/getUserById', { params: { id } })
  }

  async createUser(data) {
    return this.axios.post('/createUser', data)
  }
}

export default new MyDatasource()
```

### 环境声明（setup.js）
`setup.js` 用于声明多套运行环境，**必须包含 `mock` 环境（设计态自动激活）**，其余环境根据用户需求按需来实现。

一共需要关心 设计态 + 运行态（正式环境 + N套自定义环境）：
1. 搭建环境：使用 mock 定义，由于axios在设计态无法调用，我们需要劫持动态数据的接口以保证设计态的正常返回
2. 正式环境：使用 dataSource.js 中定义的静态数据和接口请求；
3. N套自定义环境：用户需要时声明，比如特殊环境和特殊测试场景；

比如下面的代码，虽然 dataSource.js 有两个方法，但是对于mock环境来说，只需要增量劫持：
1. getConfig 返回的是静态数据，设计态可以展示，无需spy；
2. getUserById 在设计态无法请求真实接口，所以需要mock一个接口返回，保证设计态渲染；

```js
import { describe, spyOn } from 'mybricks/testing'
import dataSource from './dataSource'

// 必须：设计态 mock 环境
describe('mock', () => {
  // 上面 getUserById 直接返回一个axios.get，可以确定里面有status、data字段
  spyOn(dataSource, 'getUserById').mockReturn({
    status: 200,
    data: { id: 1, name: '张三', age: 18 },
  })
})

// 按需：用户需要的话，需要配置中文名
describe('预发环境', () => {
  // 预发请求staging环境接口和特殊headers
  dataSource.axios.defaults.baseURL = 'https://api.staging.com';
  dataSource.axios.defaults.headers.common['x-env'] = 'staging';
})

// 按需：用户需要的话，需要配置中文名
describe('无权限测试', () => {
  // 测试接口403情况
  spyOn(dataSource, 'getUserById').mockReturn({
    status: 403,
  })
})
```

#### spyOn 使用原则
- spyOn的有且只有一个使用方式，就是 `mockReturn`，不得使用任何其他不存在的方法；
- `spyOn(dataSource, 'method').mockReturn(value: Record<string, any>): Promise<value>`：可以替换该单个方法的返回值，**value 必须为 对象**；
- 仅必要时使用，比如由于设计态无法请求真实接口，需要劫持axios接口调用，不要劫持静态数据方法；
- `describe` 回调里可以做任意副作用：操作 `dataSource.axios.defaults`、写 localStorage 等；
- **必须声明 `mock` 环境**（设计态自动激活）；

### 日志
对于日志，我们提供了 `logger` 工具。

#### 支持的方法

| 方法 | 说明 | 适用场景 |
|------|------|---------|
| `logger.log(msg, ...args)` | 普通日志 | 一般性信息输出 |
| `logger.info(msg, ...args)` | 信息日志 | 关键业务节点记录 |
| `logger.warn(msg, ...args)` | 警告日志 | 非预期但可兼容的情况 |
| `logger.error(msg, ...args)` | 错误日志 | 异常和错误信息 |

#### 使用示例
```js
import { logger } from 'mybricks';
logger.info('这是一条日志');
```

### 数据响应式
基于 store.js 的响应式编程，我们提供了 `makeAutoObservable` 状态管理工具。

#### 使用示例
构造函数 constructor 内部必须调用 makeAutoObservable 方法，并传入 this 作为参数，自动绑定当前实例的所有属性为可观察状态，所有方法为动作方法，严格遵循状态管理规范，保证响应式逻辑生效；
```js
import { logger, makeAutoObservable } from 'mybricks';

class Store {
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  click() {
    logger.info('[Store/click] 按钮点击');
  }
  
  setLoading(loading) {
    logger.info('[Store/setLoading] 设置loading状态', loading);
    this.loading = loading;
  }
}

export default new Store();
```