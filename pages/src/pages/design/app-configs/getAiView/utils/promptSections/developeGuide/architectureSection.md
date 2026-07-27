```
├─ app.config.ts       # 必须，项目配置文件，有且仅有一个，必须写在根路径
├─ index.tsx           # 模块入口，有且仅有一个，必须写在根路径
├─ index.module.less
├─ dataSource.ts       # 项目唯一文件，必须；正式环境数据
├─ setup.ts            # 项目唯一文件，必须；测试环境数据
├─ requirement.md      # 需求文档（又名prd、PRD，在最后写入）
├─ hooks               # 可选，可复用的全局自定义 hooks 目录
|  ├── useXxx.ts       # 每个 hook 单独一个文件，文件名与 hook 同名
|  └── useYyy.ts
├─ pages
|  └── HomePage
|     ├── index.tsx
|     ├── index.module.less
|     └── hooks        # 可选，该页面/组件的自定义 hooks 目录
|        ├── useXxx.ts # 每个 hook 单独一个文件，文件名与 hook 同名
|        └── useYyy.ts
└─ components          # 可复用公共组件目录，所有跨页面复用的组件统一存放
   └── SharedComponent
      ├── index.tsx
      ├── index.module.less
      └── hooks
         └── useXxx.ts
```

> 项目支持渐进式渲染，初始化项目时，建议将入口和公共文件先初始化好，再按照页面进行初始化。

#### dataSource.ts 与 setup.ts
dataSource.ts 存放正式环境数据，setup.ts 存放测试环境数据，两者对应同一份数据结构。修改数据时，正式环境与测试环境必须同步更新，否则两个环境的展示内容会不一致。

#### 页面与组件的文件拆分
- index.tsx：模块入口，有且仅有一个，且必须写在根路径的 `index.tsx` 中；
- pages/xxx：页面，每个页面必须单独拆到**文件夹**中，例如 `pages/HomePage/index.tsx`、`pages/UserPage/index.tsx`；
- 组件：公共可复用组件，所有能在多个页面中重复使用的功能组件，必须统一放在 components/ 目录下，每个组件独立创建文件夹存放；

> 拆分仅作为结构处理，建议的开发顺序是完成基础架构的代码、然后按页面维度一个一个完成需求。

#### app.config.ts 开发规范
1. 必需创建的项目配置文件，有且仅有一个，必须放在项目根路径；
2. 用于声明应用级配置，开发前必须优先阅读并理解其中的配置；
3. 必须使用 `defineAppConfig` 声明配置，并默认导出；
4. 禁止编写业务逻辑、组件逻辑、样式逻辑或异步请求，仅允许声明项目配置；
5. 当需求涉及端适配配置时，必须先做语义识别，并采用“适配=新增配置能力、改成=替换配置能力”的判断规则：
  - 用户说「适配某端」「支持某端」「增加某端适配」时，必须理解为“在 `app.config.ts` 中新增目标端配置能力”，不是把项目配置替换成目标端单端；
  - 只有当用户明确表达「改成PC端」「只要PC端」「移除移动端」「改成纯PC端」「不再支持移动端」等替换或排他性意图时，才允许删除或替换已有端配置；
  - 新增目标端时，应在 `viewports` 中补充目标端视口，并根据需要在 `breakpoints` 中补充对应媒体查询规则；
  - `viewports[].label` 必须使用简洁设备名称，如「PC」「平板」「手机」，禁止写成「PC端」「平板端」「手机端」「移动端」等带“端”的展示名称；
  - 如果用户表达同时包含“适配”和疑似排他含义，或 `<app-config>` 中缺少判断所需的信息，必须先向用户确认是“新增适配端”还是“替换为单端”，禁止擅自选择替换方案。

类型定义：
```ts
export interface AppConfigViewport {
  /** 视口唯一标识，如 desktop、tablet、mobile */
  id: string
  /** 视口显示名称，如“PC”、“平板”、“手机”；禁止写成“PC端”、“平板端”、“手机端”、“移动端” */
  label: string
  /** 设计态画布宽度，仅用于画布预览和容器宽度切换 */
  width: number
}

export interface AppConfigBreakpointMedia {
  /** 视口宽度小于等于该值时媒体查询生效 */
  maxWidth: number
}

export interface AppConfigBreakpoint {
  /** 断点规则唯一标识，宽度适配场景建议与 viewports[].id 对齐 */
  id: string
  /** 媒体查询条件 */
  media: AppConfigBreakpointMedia
}

export interface AIAppConfig {
  /** 设计态可切换的画布视口配置；仅用于预览，不代表需要生成媒体查询 */
  viewports: AppConfigViewport[]
  /** 需要生成媒体查询的断点规则；为空数组时禁止生成 @media 代码 */
  breakpoints: AppConfigBreakpoint[]
}
```

IMPORTANT：`defineAppConfig` 是全局注入的项目声明函数，直接使用即可。

#### tsx 文件编写规范
1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义；
2. 组件状态和业务逻辑封装在组件内部，使用 useState、useReducer 等 React hooks 管理状态；
3. 当逻辑相对独立或较为复杂时，抽取到同级 `hooks/` 文件夹中，每个自定义 hook 单独一个文件（如 `hooks/useXxx.ts`）；
4. 禁止编写未实现的事件函数；
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层的显示/打开/弹出/隐藏状态的变量使用 useState 维护，禁止设置为固定值；
6. 所有来自三方库的组件都必须带有 className 属性，值需语义化明确且唯一，无论是否需要样式，以便通过 CSS 选择器选中；
  - `<View className={styles.xxx}/>`
7. 所有html元素都必须具有语义化的 className，无论是否需要样式，以便通过 CSS 选择器选中；
  - `<div className={styles.xxx}/>`
8. 所有与样式相关的内容都要写在 less 文件中，避免在 tsx 中通过 style 编写；
9. 各类动效、动画等，尽量使用 css3 的方式在 less 中实现，不要为此引入任何的额外类库；
10. 禁止出现直接引用标签的写法，例如 `<Tags[XX] property={'aa'}/>`，正确的写法是先定义 `const XX = Tag[XX]; <XX property={'aa'}/>`；
11. 所有列表中的组件，必须通过 key 属性做唯一标识，不要使用 index 作为 key；

comRef 说明：
- comRef 是 MyBricks 提供的高阶函数，用于创建一个组件；

popupRef 说明：
- popupRef 是 MyBricks 提供的高阶函数，用于创建浮层类组件（弹窗、抽屉等）；

#### less 文件编写规范
1. 严格参考设计风格与主题变量使用说明来编写样式；若项目提供了主题变量，编写前必须先列举全部可用变量，再对照每条样式属性逐一检查是否有对应变量，有则必须使用，禁止硬编码已有主题变量所覆盖的色值或数值；
2. less 文件命名必须使用 `*.module.less` 格式（如 `index.module.less`），在 tsx 文件中通过 `import styles from './index.module.less'` 引入；
3. 在选择器中，多个单词之间使用驼峰方式，不能使用 - 连接；
4. 尽量不要用 calc 等复杂的计算；
5. 动效、动画等效果，尽量使用 css3 的方式实现，例如 transition、animation 等；
6. 不使用 :before、:after 等伪类选择器来实现 dom；
7. 当 `<app-config>` 内 `breakpoints` 非空时，必须在 less 中按照 `breakpoints[].media` 生成对应的 `@media` 代码，实现完整的断点适配能力。
  - 新增端适配时，less 修改应以不破坏已有端能力为前提：默认样式和已有 `@media` 规则通常承载已有端表现，需要先判断其适用端；允许为目标端适配对默认样式、公共样式或对应媒体查询做必要调整、抽取或覆盖，但禁止将“适配某端”理解为直接删除另一端能力；
  - 用户要求「适配某端」时，应通过补充对应 viewport、调整默认/公共/目标端样式或新增合适断点来新增目标端兼容能力，同时确保已有端表现仍然可用；
  - 只有用户明确要求「改成某端」或替换为单端时，才允许移除另一端样式。
示例：
```less
@media (max-width: 480px) {
  .heroName {
    font-size: 32px;
  }

  .sectionTitle {
    font-size: 26px;
  }

  .footerCtaTitle {
    font-size: 26px;
  }

  .expLine {
    display: none;
  }
}
```

#### hooks/ 文件夹编写规范
当组件内存在相对独立、可复用或逻辑复杂的逻辑时，将其抽取为自定义 hook，放在同级 `hooks/` 文件夹中，每个 hook 对应一个独立文件。

使用原则：
- hooks 以文件夹形式存放，目录名必须是 `hooks`，位于组件或页面同级；
- 每个 hook 单独一个文件，文件名与 hook 名相同（如 `useXxx.ts`），存放在 `hooks/` 目录下；
- 每个自定义 hook 以 `use` 开头命名；
- hook 应内部管理自己的副作用，不对外暴露命令式方法；把需要响应的数据作为参数传入 hook，hook 内部用 `useEffect` 监听并处理；
- 禁止把「何时初始化/何时更新」的控制权暴露给外部：
  - 错误：hook 暴露 `setXxx` / `initXxx` 方法，由外部在 `useEffect` 里手动调用；
  - 正确：把需要响应的数据作为参数传入 hook，hook 内部决定如何响应；
- 当多个组件需要共享逻辑时，提取到上层公共 `hooks/` 目录中；

#### 日志规范
项目中必须使用 mybricks 提供的 `logger` 工具打印日志，禁止使用 console.log / console.warn / console.error 等原生方法。

必须在以下所有场景中打印足量日志，确保运行时行为可追踪、可排查：
1. 用户交互事件：所有 onClick、onChange、onBlur 等事件触发时，打印 logger.info 记录操作行为及关键参数；
2. 数据请求：接口调用前打印 logger.info 记录请求参数，请求成功后打印 logger.info 记录返回数据摘要，请求失败时打印 logger.error 记录错误信息；
3. 状态变更：组件或 hook 中任何状态更新时，打印 logger.info 记录更新内容及关键参数；
4. 条件分支与异常：进入关键条件分支时打印 logger.info 说明走了哪个分支；try-catch 中 catch 块必须打印 logger.error 记录异常；
5. 路由跳转：导航跳转时打印 logger.info 记录目标路径；
6. 任何可能失败的操作（如数据解析、类型转换等）都需要用 try-catch 包裹，并在 catch 中使用 logger.error 打印错误详情；

日志格式要求：
- 日志消息应包含上下文前缀，便于定位来源，格式推荐：`[组件名/方法名] 具体描述`；
- 示例：`logger.info('[UserList/fetchUsers] 开始请求用户列表', { page: 1 })`；
- 错误日志必须携带 error 对象：`logger.error('[loadData] 数据加载失败', error)`；

重复结构处理：当一个区块内存在多个「结构相同、仅数据不同」的重复单元时，必须拆成「容器 + 单项」两层：
- 容器（comRef）：负责布局与数据遍历，用 map 渲染单项；
- 单项（comRef）：描述单条数据的 UI，通过 props 接收单条数据；
- 禁止在容器中直接内联重复的 JSX 块；

命名与实现：
- 命名：使用语义化 PascalCase，名称应直接反映其在页面中的位置与职责；
- 实现：每个独立区块写成 `const 区块名 = comRef(...)`；
- 区块独立性：父组件只负责布局与子区块挂载，状态和业务逻辑各自在组件内部或对应 hook 中管理；

典型拆分示例（以「用户管理页」为例，筛选栏和列表有独立逻辑，header 只有标题则内联不拆）：
- App
  - Routes
    - UserPage（header 仅含标题，直接内联在页面组件中，不单独拆文件）
      - FilterBar（有筛选状态 → 独立 comRef）
      - UserList（有列表数据与分页 → 独立 comRef）
        - UserRow（列表单项含多字段与操作 → 独立 comRef）
      - EditModal（修改数据弹窗）