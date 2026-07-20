## TSX 文件编写规范

1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义。
2. 组件状态和业务逻辑封装在组件内部，使用 useState、useReducer 等 React hooks 管理状态。
3. 当逻辑相对独立或较为复杂时，抽取到同级 hooks/ 文件夹中，每个自定义 hook 单独一个文件。
4. 禁止编写未实现的事件函数。
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层显示状态的变量使用 useState 维护，禁止设置为固定值。
6. 所有来自三方库的组件和所有 html 元素都必须带有语义化明确且唯一的 className。
7. 禁止出现直接引用标签的写法，例如 ```<Tags[XX] property={'aa'}/>```；正确写法是先定义 ```const XX = Tags[XX]; <XX property={'aa'} />```。
8. 所有列表中的组件必须通过 key 属性做唯一标识，不要使用 index 作为 key。

## LESS 文件编写规范

1. 样式文件命名规则：*.module.less 编译时自动启用 CSS Module，*.less 编译时不开启 CSS Module。
2. 开发优先统一使用 *.module.less 编写样式。
3. 选择器中多个单词之间使用驼峰方式，不能使用 `-` 连接。
4. 不使用 `:before`、`:after` 等伪类选择器来实现 DOM。

## Hooks 文件夹编写规范

- hooks 以文件夹形式存放，目录名必须是 hooks，位于组件或页面同级。
- 每个 hook 单独一个文件，文件名与 hook 名相同，如 useXxx.ts。
- 每个自定义 hook 以 use 开头命名。
- hook 应内部管理自己的副作用，不对外暴露命令式方法。
- 当多个组件需要共享逻辑时，提取到上层公共 hooks/ 目录中。

## 日志规范

项目中必须使用 MyBricks 提供的 logger 工具打印前端日志，禁止使用 console.log、console.warn、console.error 等原生方法。

必须在以下场景打印足量日志：

1. 用户交互事件；
2. 数据请求；
3. 状态变更；
4. 条件分支与异常；
5. 路由跳转；
6. 任何可能失败的操作。

## SKILL.md 编写规范

1. 文件开头必须包含 YAML frontmatter，其中 name 使用英文（kebab-case，供大模型识别），title 使用中文（供用户阅读理解）。格式如下
    ```
    ---
    name: skill名称
    title: 对应name，易于用户理解的中文标题
    description: 一句话说明skill功能以及使用时机
    ---
    ```
2. 禁止编写 包含卡片、卡片列表 等描述卡片组成的章节。
3. 功能说明 章节用一到两句话说明该 skill 提供的核心能力。
4. 何时使用 章节以编号列表形式列出用户的典型使用场景。
5. 不要在 SKILL.md 中重复卡片的技术细节（如 Props 表格、API 表格），这些内容由 index.config.ts 负责。
6. 当 skill 下的卡片或工具发生变更（新增、删除、功能调整）时，需同步 review SKILL.md 内容是否需要更新，确保 功能说明 和 何时使用 与当前卡片能力保持一致。
7. skill下可以只包含一个skill.md文件，而不包含其他文件, 如果用户的要求只需要skill.md, 或者对应的skill 需求不需要UI展示，不用额外工具处理，则该skill只需要一个skill.md文件，不需要tool和card

## 卡片开发规范

卡片位于 skills/{skill名称}/cards/{功能名} 目录，是一个 React 组件。
入口文件为 index.tsx ，使用 comRef 定义并默认导出。
配置文件为 index.config.ts，使用 defineConfig 定义。
IMPORTANT：必须通过 useCardApis 对外提供只读 API 接口，由 Agent 调用以获取卡片内部状态、数据信息，这是强制要求，不能省略。实现时必须同时满足两个条件，① 在 index.config.ts 的 apis 字段中声明所有 API 名称与描述，② 在 index.tsx 运行时通过 useCardApis 注册对应的实现函数，二者必须保持一致。API 仅用于对外提供只读信息（getter），包括卡片当前展示的数据、加载状态、筛选条件、选中项等一切有意义的可读状态，禁止暴露任何会修改卡片内部状态的操作类方法。卡片内部状态只能由卡片自身管理，不允许通过 API 被外部写入或变更。
IMPORTANT：卡片可以被其他卡片引用，实现能力复用，尤其当用户提出“点击xxx，展示xx卡片”、“点击xxx打开xxx”等类似卡片跳转、切换的需求时。需要复用时，应尽量将可共用的 UI 部分抽离并封装到 skills/{skill名称}/cards/components 目录（卡片可复用的公共组件目录，按需创建）中，再由多个卡片统一引用，避免重复实现相同 UI 逻辑。
IMPORTANT：当卡片需要主动与 Agent 交互时，使用 useCardAction hook。调用 `const dispatch = useCardAction()` 后，通过 `dispatch(action)` 触发以下交互行为：① `{ type: 'sendUserMessage', text: string }` —— 直接以用户身份向 Agent 发送消息（text），无需用户手动确认，适用于卡片内点击某个选项后自动触发下一轮对话。
IMPORTANT：卡片的 props 只能接收 Agent 在渲染卡片时传入的静态初始值或初始配置。严禁定义或传入 onClick、onSelect、onChange、onConfirm、onSubmit、onXxx 等任何回调型 props；Agent 不会、也不能通过 props 向卡片传入回调函数。卡片与 Agent 的交互只能通过以下两种方式完成：① 使用 useCardApis 注册 API，由 Agent 在后续主动调用这些 API 获取卡片最新状态；② 使用 useCardAction，由卡片在用户完成关键操作时主动通知 Agent 用户意图，并由 Agent 继续推进后续流程。

### 样式规范

卡片会被 Agent 工具驱动，通过聊天界面与用户进行互动。
开发过程中父容器的宽度为414px。
如果没有特别要求，卡片整体视觉风格参照 Tailwind CSS 的默认设计规范（项目本身不集成 Tailwind，样式仍通过 LESS 编写）。颜色、间距、字号、圆角等视觉属性应对齐 Tailwind 的默认设计令牌所代表的视觉感受，以保证卡片风格简洁统一、与 Tailwind 默认审美一致。

- 任何 UI 开发必须适应不同尺寸容器，保证在不同缩放比例下都能正常显示内容。
- 根容器必须设置`width: 100%;`，禁止设置其它 width 相关属性，确保卡片能够横向撑满父容器，适应不同画布宽度
- 根容器禁止设置`height`相关属性，适应内容高度即可。
- 根容器禁止设置边框样式（border、border-* 等相关属性）。
- 根容器禁止设置阴影样式（box-shadow、filter: drop-shadow() 等相关属性）。
- 根容器禁止设置 `:hover`、`:active` 等状态样式。
IMPORTANT：必须严格遵守样式规范，保障用户在不同尺寸设备上维持视觉稳态，消除布局跳动与内容挤压，实现无感、统一的浏览交互体验。

## 工具开发规范

工具位于 skills/{skill名称}/tools/{工具名} 目录，是注册给 Agent 按需调用的 tools。
入口文件为 index.ts，使用 defineTool 定义并默认导出。无对应的 index.config.ts，不渲染 UI。
IMPORTANT：必须定义 name、title、description、parameters、validate 和 execute 字段。

## 接口规范

接口开发，必须将接口调用封装到 dataSource.ts 文件中，统一管理。
接口调用，必须导入 dataSource.ts 文件，调用其提供的 API。
IMPORTANT：dataSource.ts 中 `this.axios.get('/xxx')`、`this.axios.post('/xxx')` 等 axios 调用的路径必须与 server/ 中 `server.get('/xxx')`、`server.post('/xxx')` 等注册的路由路径完全一致，路径不一致会导致接口调用 404 报错。
