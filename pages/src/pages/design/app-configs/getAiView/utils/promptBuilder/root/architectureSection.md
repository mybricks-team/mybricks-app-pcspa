```
├─ skills                              # 可选，skills 目录，内部包含多个 skill
|  ├─ {skill名称}                       # 单个 skill 目录，以 skill 功能命名，kebab-case 格式
|  |  ├─ SKILL.md                      # 必选，skill 说明文件
|  |  ├─ setup.ts                      # 可选，声明 mock 环境（设计态自动激活），必须和 dataSource.ts 配套使用
|  |  ├─ dataSource.ts                 # 可选，与 SKILL.md 同级，定义数据源获取 API，所有正式数据（接口请求、静态数据）必须维护在该文件中，必须和 setup.ts 配套使用
|  |  └─ cards                         # 可选，该 skill 下的卡片目录
|  |  |  └─ components                 # 可选，卡片可复用的公共组件目录
|  |  |  |  └── SharedComponent
|  |  |  |  |  ├── index.tsx
|  |  |  |  |  ├── index.module.less
|  |  |  |  |  └── hooks
|  |  |  |  |  |  └── useXxx.ts
|  |  |  ├─ hooks                      # 可选，卡片可复用的自定义 hooks 目录
|  |  |  |  ├── useXxx.ts
|  |  |  |  └── useYyy.ts
|  |  |  ├─ {功能名}                    # 具体的功能卡片目录，例如 UserProfile、OrderList
|  |  |  |  ├─ index.config.ts         # 必选，卡片配置文件，描述卡片元信息；若卡片对外暴露 API，必须在此文件的 apis 字段声明
|  |  |  |  ├─ index.tsx               # 必选，卡片组件入口，导出默认 React 组件
|  |  |  |  ├─ index.module.less       # 可选，卡片样式文件，使用 CSS Modules
|  |  |  |  ├─ {子组件名}.tsx           # 可选，当 index.tsx 中组件过多时，适当拆分为同级子组件文件
|  |  |  |  ├─ {子组件名}.module.less   # 可选，子组件样式文件，使用 CSS Modules
|  |  |  |  ├─ hooks                   # 可选，可复用的自定义 hooks 目录
|  |  |  |  |  ├── useXxx.ts
|  |  |  └─ ...                        # 其他功能卡片目录
|  |  ├─ tools                         # 可选，skill 下内置的 Agent 工具目录，注册供 AI 按需调用的函数工具（Function Calling）
|  |  |  ├─ {工具名}                    # 单个工具目录，以工具功能命名，snake_case 格式
|  |  |  |  ├─ index.ts                # 必选，工具定义入口，默认导出使用 defineTool 定义的工具创建函数
|  |  ├─ server                        # 可选，skill 下内置的服务目录，为当前 skill 提供接口
|  |  |  ├─ index.ts                   # 必选，服务入口，在这里创建 Hono app
├─ index.tsx                           # 必选，前端入口文件，固定编码占位，与 前端示例 中 index.tsx 保持一致
```