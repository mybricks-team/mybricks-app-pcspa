import type * as PluginAITypes from '@mybricks/plugin-ai'
import type { PluginAIPreset } from '@mybricks/plugin-ai'

type FullStackAppPromptSection = typeof PluginAITypes.fullStackAppPromptSection

const appPrompt = {
  root: {
    guideSection: `
参考「开发指南」和「源代码」进行代码开发任务，必须遵循最佳实践和设计规范；JSDoc 注释属于代码的一部分，需要在编写节点代码时同步维护。

## 总体规则
- 功能要达到生产级别，不能只做静态样子或半成品交互。
- 细节要完整，状态、异常、空数据、加载态、交互反馈都要按需求补齐。
- 响应式要保证合理统一的间距，并支持宽度变化下的自适应。
- 卡片必须通过 \`useCardApis\` 暴露读数据、读状态的接口，任何有数据、状态的卡片都不得省略。

## 拆分逻辑
- 以功能卡片维度来编写前端组件。
- 精准识别出弹窗、抽屉等浮层组件，必须使用 \`popupRef\`。
- 设计态需要尽量展示所有卡片和弹窗，方便用户调试和选中内部元素。
- 项目支持渐进式渲染。初始化项目时，建议先初始化 frontend 入口、公共文件和 backend 入口。
- 拆分仅作为结构处理，推荐开发顺序是先完成基础架构代码，再按卡片和接口维度逐个完成需求。

## 核心概念：卡片（Card）vs 工具（Tool）
卡片和工具是两类完全不同的前端产物，开发时须严格区分：

**卡片（Card）** — 有界面的功能单元
- 位于 \`skills/{skill名称}/cards/{功能名}/\` 目录，是有可视界面的 React 组件。
- 入口为 \`index.tsx\`（使用 \`comRef\` 定义），配置文件为 \`index.config.ts\`（使用 \`defineConfig\` 定义）。
- 必须通过 \`useCardApis\` 向外暴露只读数据接口，供其他卡片或宿主调用。
- 适用场景：需要向用户展示信息或提供交互操作时使用，例如数据列表、图表、表单、详情面板等一切需要渲染到页面上的功能单元。

**工具（Tool）** — 无界面的函数能力
- 位于 \`skills/{skill名称}/tools/{工具名}/\` 目录，是注册给 AI Agent 按需调用的 Function Calling 工具。
- 入口为 \`index.ts\`（使用 \`defineTool\` 默认导出），无对应的 \`index.config.ts\`，不渲染任何 UI。
- 必须定义 \`name\`、\`title\`、\`description\`、\`parameters\`、\`validate\` 和 \`execute\` 字段。
- 适用场景：需要执行计算、查询、转换等纯逻辑操作时使用，例如单位换算、数据格式化、调用外部 API 获取信息等无需渲染界面的能力。
- 当需要调服务端接口时，必须在 \`dataSource.ts\` 中通过 MyBricks DataSource 的 \`this.axios\` 调用 \`/xxx\`(使用合理、语义化的路径，如果是根路径，直接使用 "/" 即可) 请求。

## 严格的交付边界规则：
- 用户需求描述中出现「工具」「xxx工具」（如查询工具、转换工具、计算工具、时间工具等）时，识别为 Tool，只交付工具，禁止附带卡片。
- 用户明确要求开发「卡片」时，只交付 卡片。
- 用户没有明确说明时（例如只描述功能，未提到「卡片」或「工具」），优先交付 卡片。

## 美学指南：
- 在浅色和深色主题、不同字体、美学之间变化；
注意：永远不要使用通用的AI生成美学、陈词滥调的配色方案（特别是白色背景上的紫色渐变）、可预测的布局，以及缺乏特征的千篇一律的设计。

## 服务开发
当前项目支持使用 Hono 进行服务端开发。涉及数据库时，先通过工具确认数据库表结构，再在服务端代码中编写查询、写入和接口逻辑。`,
    architectureSection: `\`\`\`
├─ skills                              # 可选，skills 目录，内部包含多个 skill
|  ├─ {skill名称}                       # 单个 skill 目录，以 skill 功能命名，kebab-case 格式
|  |  ├─ SKILL.md                      # 必选，skill 说明文件
|  |  ├─ setup.ts                      # 可选，声明 \`mock\` 环境（设计态自动激活），必须和 \`dataSource.ts\` 配套使用
|  |  ├─ dataSource.ts                 # 可选，与 SKILL.md 同级，定义数据源获取 API，所有正式数据（接口请求、静态数据）必须维护在该文件中，必须和 \`setup.ts\` 配套使用
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
├─ index.tsx                           # 必选，前端入口文件，固定编码占位，与 \`前端示例\` 中保持一致
\`\`\``,
  },
  frontend: {
    metaSection: `---
title: Agent Skill & Tool 开发
description: Agent Skill、Tool、前端卡片、组件、样式、数据源、日志、后端服务与设计态规范。
permissions:
  - read
  - write
---`,
    guideSection: `
## TSX 文件编写规范
1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义。
2. 组件状态和业务逻辑封装在组件内部，使用 \`useState\`、\`useReducer\` 等 React hooks 管理状态。
3. 当逻辑相对独立或较为复杂时，抽取到同级 \`hooks/\` 文件夹中，每个自定义 hook 单独一个文件。
4. 禁止编写未实现的事件函数。
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层显示状态的变量使用 \`useState\` 维护，禁止设置为固定值。
6. 所有来自三方库的组件和所有 html 元素都必须带有语义化明确且唯一的 \`className\`。
7. 禁止出现直接引用标签的写法，例如 \`<Tags[XX] property={'aa'}/>\`；正确写法是先定义 \`const XX = Tags[XX]; <XX property={'aa'} />\`。
8. 所有列表中的组件必须通过 \`key\` 属性做唯一标识，不要使用 index 作为 key。
9. 前端调用本项目服务端接口时，统一在 \`dataSource.ts\` 中通过 MyBricks DataSource 的 \`this.axios\` 调用 \`/xxx\`(使用合理、语义化的路径，如果是根路径，直接使用 “/” 即可) 请求。
10. 卡片必须通过 \`useCardApis\`（从 \`mybricks\` 导入）暴露数据、状态的读取接口，供其他卡片或宿主调用，这是强制要求，不能省略。** 实现时必须同时满足两个条件：① 在 \`index.config.ts\` 的 \`apis\` 字段中声明所有 API 名称与描述；② 在 \`index.tsx\` 运行时通过 \`useCardApis\` 注册对应的实现函数，二者必须保持一致。API 仅用于对外提供只读信息（getter）：包括卡片当前展示的数据、加载状态、筛选条件、选中项等一切有意义的可读状态；禁止暴露任何会修改卡片内部状态的操作类方法。卡片内部状态只能由卡片自身管理，不允许通过 API 被外部写入或变更。

## LESS 文件编写规范
1. 样式文件命名规则：\`*.module.less\` 编译时自动启用 CSS Module，\`*.less\` 编译时不开启 CSS Module。
2. 开发优先统一使用 \`*.module.less\` 编写样式。
3. 选择器中多个单词之间使用驼峰方式，不能使用 \`-\` 连接。
4. 不使用 \`:before\`、\`:after\` 等伪类选择器来实现 DOM。
5. 开发的是一个个功能卡片，而非页面，样式上需要适应不同尺寸画布，保证在不同缩放比例下都能正常显示内容
6. 卡片通常不会设置一个固定的高度，而是根据内容自定义高度
7. 卡片的根容器必须设置 \`width: 100%\`，确保卡片能撑满宿主分配的横向空间，适应不同画布宽度
8. 卡片根容器禁止编写边框样式（\`border\`、\`border-*\` 等相关属性）
9. 卡片根容器禁止编写阴影样式（\`box-shadow\`、\`filter: drop-shadow()\` 等相关属性）
10. 卡片根容器禁止编写 \`:hover\` 样式

## Hooks 文件夹编写规范
- hooks 以文件夹形式存放，目录名必须是 \`hooks\`，位于组件或页面同级。
- 每个 hook 单独一个文件，文件名与 hook 名相同，如 \`useXxx.ts\`。
- 每个自定义 hook 以 \`use\` 开头命名。
- hook 应内部管理自己的副作用，不对外暴露命令式方法。
- 当多个组件需要共享逻辑时，提取到上层公共 \`hooks/\` 目录中。

## 日志规范
项目中必须使用 MyBricks 提供的 \`logger\` 工具打印前端日志，禁止使用 \`console.log\`、\`console.warn\`、\`console.error\` 等原生方法。

必须在以下场景打印足量日志：
1. 用户交互事件；
2. 数据请求；
3. 状态变更；
4. 条件分支与异常；
5. 路由跳转；
6. 任何可能失败的操作。

## SKILL.md 编写规范
1. 文件开头必须包含 YAML frontmatter，格式为 \`---\\nname: skill名称\\ntitle: 对应name，易于用户理解的中文标题\\ndescription: 一句话说明使用时机\\n---\`。其中 \`name\` 使用英文（kebab-case，供大模型识别），\`title\` 使用中文（供用户阅读理解）。
2. 只允许包含「功能说明」和「何时使用」两个章节，禁止写「包含卡片」、「卡片列表」等描述卡片组成的章节。
3. 「功能说明」章节用一到两句话说明该 skill 提供的核心能力。
4. 「何时使用」章节以编号列表形式列出用户的典型使用场景。
5. 不要在 SKILL.md 中重复卡片的技术细节（如 Props 表格、API 表格），这些内容由 \`index.config.ts\` 负责。
6. 当 skill 下的卡片发生变更（新增、删除、功能调整）时，需同步 review SKILL.md 内容是否需要更新，确保「功能说明」和「何时使用」与当前卡片能力保持一致。`,
    examplesSection: `
\`\`\`tsx frontend/index.tsx
import { appRef } from 'mybricks'

/**
 * @mybricks
 * name: default
 * title: 入口文件
 * summary: 入口文件
 * type: app
 */
export default appRef(() => {
  return
})
\`\`\`

\`\`\`md skills/student-score-manage/SKILL.md
---
name: student-score-manage
title: 学生成绩管理
description: 学生成绩管理功能域。当需要展示学生学籍信息、历次考试各科成绩，或在页面中呈现成绩汇总摘要（总分 / 平均分）时使用。
---

# student-score-manage

## 功能说明
提供学生基本信息查看与各科目成绩统计展示能力，支持按 studentId 动态加载数据。

## 何时使用
当用户需要：
1. 展示某位学生的学籍信息（姓名、班级）时
2. 呈现历次考试各科目成绩列表时
3. 在页面中展示成绩汇总摘要（总分 / 平均分）时
\`\`\`

\`\`\`less skills/student-score-manage/cards/GradeCard/index.module.less
.gradeCard {
  width: 100%;
}
\`\`\`

\`\`\`tsx skills/student-score-manage/cards/GradeCard/index.tsx
import { comRef, useCardApis } from 'mybricks'
import { useState } from 'react'
import styles from './index.module.less'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

/**
 * @mybricks
 * name: GradeCard
 * title: 学生成绩查看卡片
 * summary: 卡片主体，展示学生基本信息、各科目成绩列表与总分/平均分统计，支持刷新加载。
 * type: com
 */
export default comRef(({ studentId, showAverage }) => {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [gradeList, setGradeList] = useState<GradeItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const total = gradeList.reduce((sum, item) => sum + item.score, 0)
  const average = gradeList.length > 0 ? (total / gradeList.length).toFixed(1) : null

  useCardApis({
    /** 获取当前展示的学生基本信息，数据未加载完成时返回 null */
    getStudentInfo: () => (loaded ? studentInfo : null),
    /** 获取学生各科目成绩列表，数据未加载完成时返回空数组 */
    getGradeList: () => (loaded ? gradeList : []),
    /** 获取成绩统计摘要，包含总分和平均分，数据未加载完成时返回 null */
    getSummary: () =>
      loaded && studentInfo
        ? \`\${studentInfo.name}：总分 \${total} 分，平均分 \${average} 分\`
        : null,
  })

  return <div className={styles.gradeCard}>学生成绩卡片</div>
})
\`\`\`

\`\`\`ts skills/student-score-manage/cards/GradeCard/index.config.ts
import { defineConfig } from 'mybricks'

export default defineConfig({
  name: 'student-grade-card',
  title: '学生成绩查看卡片',
  description: '展示学生基本信息、各科目成绩列表与总分/平均分统计，支持刷新加载。',
  props: {
    type: 'object',
    properties: {
      studentId: {
        type: 'string',
        title: '学生 ID',
        description: '需要展示成绩的学生唯一标识',
      },
      showAverage: {
        type: 'boolean',
        title: '显示平均分',
        description: '是否在成绩列表底部展示平均分统计行',
        default: true,
      },
    },
    required: ['studentId'],
  },
  apis: [
    {
      name: 'getStudentInfo',
      description: '获取当前展示的学生基本信息，包括姓名、班级等，数据未加载完成时返回 null',
    },
    {
      name: 'getGradeList',
      description: '获取学生各科目成绩列表，数据未加载完成时返回空数组',
    },
    {
      name: 'getSummary',
      description: '获取成绩统计摘要，包含总分和平均分，数据未加载完成时返回 null',
    },
  ],
})
\`\`\`

\`\`\`ts skills/student-score-manage/dataSource.ts
import { DataSource } from 'mybricks'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

interface StudentGradesResult {
  studentInfo: StudentInfo
  gradeList: GradeItem[]
}

class MyDatasource extends DataSource {
  async fetchStudentGrades(studentId: string): Promise<StudentGradesResult> {
    return this.axios.get('/student-grades', { params: { studentId } })
  }
}

export default new MyDatasource()
\`\`\`

\`\`\`ts skills/student-score-manage/server/index.ts
import { Hono } from 'hono'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

const server = new Hono()

server.get('/student-grades', async (c) => {
  const serverLogger = c.get('logger').child({ route: 'student-score-manage', action: 'student-grades' })
  const studentId = c.req.query('studentId')

  serverLogger.info({ studentId }, '查询学生成绩')

  try {
    if (!studentId) {
      return c.json({ result: -1, error_msg: 'studentId 不能为空' }, 400)
    }

    const studentInfo: StudentInfo = { name: '张三', className: '三年一班' }
    const gradeList: GradeItem[] = [
      { subject: '语文', score: 90 },
      { subject: '数学', score: 95 },
    ]

    return c.json({ result: 1, error_msg: 'success', data: { studentInfo, gradeList } })
  } catch (error) {
    serverLogger.error({ error }, '查询学生成绩失败')
    return c.json({ result: -1, error_msg: '查询学生成绩失败' }, 500)
  }
})

export default server
\`\`\`

\`\`\`ts skills/calculate/tools/square/index.ts
import { defineTool } from 'mybricks'

interface SquareParams {
  value: number;
}

export default defineTool(function () {
  return {
    name: "calculate_square",
    title: "计算数字的平方",
    description: \`计算一个数字的平方（即该数字乘以自身）。

用法：
- 传入一个数字 value
- 返回该数字的平方结果\`,
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "number",
          description: "需要计算平方的数字",
        },
      },
      required: ["value"],
    },
    validate(params: SquareParams): void {
      if (params.value === undefined || params.value === null) {
        throw new Error("value is required");
      }
      if (typeof params.value !== "number") {
        throw new Error(\`value must be a number, got: \${typeof params.value}\`);
      }
      if (!isFinite(params.value)) {
        throw new Error(\`value must be a finite number, got: \${params.value}\`);
      }
    },
    async execute(params: SquareParams) {
      const result = params.value * params.value;
      return {
        output: \`\${params.value} 的平方为 \${result}\`,
        metadata: {
          input: params.value,
          result,
        },
      };
    },
  };
})
\`\`\`
`,
    jsDocUsageSection: `编写或修改 appRef / comRef / popupRef 节点代码时，必须为每一个节点同步编写或更新对应的 JSDoc 注释说明。JSDoc 注释属于代码的一部分，必须与节点代码一起生成、一起维护。禁止只给卡片节点、根节点或少数组件写注释。
维护时机：
- 必须维护（强约束）：节点缺少 JSDoc 注释；或现有注释内容与「注释编写规范」不符；或需求明确要求更新注释（此时必须重新逐行审查源码与注释的差异，确保注释完全对齐当前源码，包括 events/datasource/state 的 className 标识、字段、流程图等）；或需求明确要求更新文档，注意用户要求的更新文档也包括了JSDoc注释；
- 建议更新（结构或内容变化）：在 tsx 中新增、删除或重命名了 appRef/comRef/popupRef 节点；export default 的根节点类型或子节点类型组合发生变化导致标题层级需调整；JSX 中新增、删除或修改了带事件 props（onClick 等）的元素，或其 className 发生变化；JSX 中新增、删除或修改了渲染组件内状态（useState/useReducer 等 hooks 管理的状态）的元素，或其 className 发生变化；JSX 中新增、删除或修改了触发 datasource 调用的元素，或其 className 发生变化；某节点的 UI 结构、交互或业务含义发生明显变化；
- 无需更新：tsx 未被修改，且现有 JSDoc 注释已正确反映当前源码的节点结构、事件与说明；仅修改了 style.less 等与节点行为无关的文件；
<JSDoc 注释编写规范>
  <节点>
  按「在 JSX 中依赖顺序」为每个节点分别写出 JSDoc 注释。
  - appRef 应用节点
  - comRef 卡片、组件节点
  - popupRef 浮层节点
  - 【强制】所有 appRef / comRef / popupRef 声明都必须有 JSDoc 注释，包括页面内拆分的辅助 comRef、列表单项 comRef、弹窗 popupRef、export default comRef/appRef；不得只给根节点写注释。
  </节点>

  <注释位置>
  - export default appRef/comRef/popupRef：JSDoc 写在 export default 语句正上方；
  - const Xxx = appRef/comRef/popupRef(...)：JSDoc 写在 const 声明正上方；
  - 子节点注释紧跟其节点声明，不集中写在文件顶部或底部；
  - 已存在 JSDoc 时直接更新原注释，禁止新增重复注释。
  </注释位置>

  <节点说明>
  每个节点 JSDoc 统一使用 @mybricks 自定义 tag 承载结构化信息，@mybricks 下方直接书写缩进结构；字段名保持稳定，字段内容按原 README.md 的语义填写。不要使用多层 Markdown 列表或代码围栏表达结构化数据。
  - name：节点名称，对应代码中节点变量声明的变量名，如果是export default 导出，则对应文件名；
  - title：根据节点内容与名称写出简洁的语义化标题，体现节点职责，避免与组件名简单重复（如组件叫 SignIn 时 title 可用「登录页」而非「登录」）；
  - summary：对节点的用途、场景或关键行为做简短说明，补充 title 未涵盖的信息，避免与 title 重复或仅罗列 UI 元素；
  - type：app | page | com | popup，其中 app 对应 appRef，page 对应通过 Route 注册的 comRef（页面组件），com 对应 comRef（非路由页面），popup 对应 popupRef。
  - datasource：该组件内触发的 dataSource.ts 接口调用列表（找最近的组件，而不是页面）
    > 触发机制：JSX 中的事件处理器或 React hooks（如 useEffect、useCallback 等）直接调用 dataSource.ts 中的函数发起 HTTP 请求。JSDoc 的 datasource 字段记录的是实际调用到 dataSource.ts 中哪个函数。
    > 判断标准：组件代码（事件处理函数、hooks 回调等）中有 \`await dataSource.xxx()\` 或 \`dataSource.xxx()\` 调用，则该调用必须记录在 datasource 字段中，api 名称对应 dataSource.ts 中的函数名。
    1. datasource 不一定能稳定归属到某个 JSX 标签，因此写在最近的 appRef/comRef/popupRef 节点 JSDoc 中
    2. 每条接口调用用缩进对象结构描述，包含以下字段：
      className（对应触发接口调用的元素 className）:
        api（dataSource.ts 中导出的真实函数名，如 signIn、fetchUserList 等）:
          desc: 用途说明
    3. 特殊情况：当接口调用由 React hooks（如 useEffect）在组件初始化时发起、不属于任何具体交互元素时，使用「root」作为标识，表示「该组件挂载时的初始化请求」；如果接口调用是由某个具体的交互元素（如按钮、表单）触发的，必须使用该元素的 className 作为标识，禁止错误地归到「root」下
    4. 【严禁重复】datasource 注释必须以 com 节点为最小单位归属：接口调用发生在哪个 comRef/popupRef 的 JSX 作用域内，就只写在该节点注释中，其父节点禁止重复声明。
    5. 无接口调用直接省略 datasource 字段，禁止出现「(无接口调用)」或空对象，不写即代表无调用
    6. 【强制扫描】编写 datasource 注释前，必须仔细阅读组件代码，检查每个事件处理函数与 React hooks 回调体内是否有 dataSource.xxx() 的调用；凡是有调用的，无论由按钮触发还是由 useEffect 触发，都必须记录到 datasource 字段中。
  - state：该组件内渲染到 JSX 的 React 状态列表（useState/useReducer 等 hooks 管理的状态，找最近的组件，而不是页面）
    1. state 不一定能稳定归属到某个 JSX 标签，因此写在最近的 appRef/comRef/popupRef 节点 JSDoc 中；如果状态值直接渲染在 JSX 标签上，用该标签的 className 作为标识；【强制前提】渲染状态的元素必须有 className，如果源码中缺少，必须先在代码中补上 className，再写注释
      - 在子节点中直接渲染：\`<div className={css.xxx}>{someState}</div>\`
      - 通过 prop 传入：\`<img className={css.xxx} src={imageUrl} />\`（imageUrl 为 state 变量）
    2. 每个 className 下描述该元素渲染的状态变量及用途：
      className（对应渲染状态的元素 className）:
        状态变量名（组件内 useState/useReducer 声明的变量名）:
          desc: 用途说明
        状态变量名:
          desc: ...
    3. 「root」使用条件（极端严格限制）：**只有当该组件的 JSX 根元素自身没有 className，且直接在根元素上渲染了状态数据**时，才允许使用「root」作为标识。绝对禁止将子孙元素渲染的状态写在「root」下——子孙元素必须用其自身的 className 作为标识，哪怕需要先在代码中补上 className 再写注释。
    4. 每一个组件，如果在代码层面没有将 React 状态用于 JSX 的 UI 渲染（即状态只用于逻辑控制、不直接影响视觉输出），禁止编写 state 信息；即使子组件使用了，也不应该使用 root，以实际代码情况为准；
    5. 【严禁重复】state 注释必须以 com 节点为最小单位归属：如果状态是在某个子 com 节点内消费的，则 state 条目只能写在该 com 节点注释中，其父节点（page 或上层 com）禁止重复声明相同的 state 条目。判断标准：状态的实际渲染发生在哪个 comRef/popupRef 的 JSX 作用域内，就归属于哪个节点，不随层级向上传递。
    6. 无状态渲染直接省略 state 字段，禁止出现「(无状态渲染)」或空对象，不写即代表无状态渲染
    7. 【精确粒度】className 标识必须是实际渲染状态的那个元素的 className，而不是其父容器的 className。例如：\`<div className={css.card}><span className={css.userName}>{userName}</span></div>\`，state 标识应该是 \`userName\`，而不是 \`card\`。
    8. 【严禁】禁止将外部来源的值计入 state 字段，state 字段仅用于记录组件自身通过 React hooks 管理的状态
  - events：该组件内所有带事件 props 的交互元素列表，写在最近的 appRef/comRef/popupRef 节点 JSDoc 中
    1. 【强制前提】带事件的元素必须有 className，如果源码中缺少，必须先在代码中补上 className，再写事件注释；
    2. 每个事件用 className 作为标识，每个 className 下描述该元素上的事件及其流程图：
      className（对应带事件的元素 className）:
        事件名（如 onClick、onChange、onBlur 等）:
          title: 简短中文说明（如 登录）
          mermaid: 根据事件内容生成对应的 Mermaid 语法流程图（以 flowchart LR; 开头，单行书写）
          relations:（可选）事件如果涉及打开弹窗、跳转页面，则需要声明关联节点及关系类型
            关联的弹窗或页面的名称，即对应的节点名称
              type: 关系类型（page，popup），打开弹窗使用popup，跳转页面使用page
    3. 【严禁重复】events 注释必须以 com 节点为最小单位归属：事件发生在哪个 comRef/popupRef 的 JSX 作用域内，就只写在该节点注释中，其父节点禁止重复声明。
    4. 无交互事件直接省略 events 字段，禁止出现空对象，不写即代表无事件
    5. 【严禁使用 root 作为 key】events 字段下的每个 key 必须是带事件的元素的 className，绝对禁止使用「root」作为 events 的 key。events 只描述具体元素或组件的 onXXX 实现，不存在「整个根节点」的事件。如果某元素没有 className，必须先在代码中补上 className，再以该 className 作为 key。
  关于 Mermaid 语法流程图需关注以下规则和要求：
  - 流程图方向统一用 LR（从左到右），节点文本全部用双引号包裹；
  - 条件判断节点用 {} 包裹，分支标注用 |标注内容| 写在箭头上；
  - 【重要】判断节点的分支必须分开写：从判断节点出发，每个分支单独写一条「箭头」，用分号分隔多条语句。正确示例：B{"是否展开"} -->|是| C["移除"]; B -->|否| D["添加"]。错误示例：B{"是否展开"} -->|是| C["移除"] -->|否| D["添加"]；
  - 每条语句末尾加分号分隔，最后一条语句后不加分号；
  - 生成后先自检：检查是否有多余分号、引号是否统一、节点连接是否完整（无断链、无悬空节点）、每个判断分支是否都从判断节点单独引出；
  - 流程图逻辑要贴合需求，节点命名简洁易懂，避免冗余步骤；
  - 流程图需覆盖全链路：事件处理函数与 hooks 回调的完整逻辑均需展开，从触发到结束完整呈现；
  - 禁止出现「调用 XX API」「调用 XX 函数」等无意义节点，所有 API 及函数调用均须展开其内部逻辑，写出完整流程；
  - 流程图节点用动作描述，不写具体取值：例如用「设置loading状态」「取消loading状态」，禁止「设置loading为true」「设置loading为false」等；
  - 禁止出现用户动作类流程节点（如「点击按钮」）、空洞节点（如「开始」「结束」「执行业务操作」）；
  - 流程图须真实完整：严格依据事件处理函数与 hooks 回调内的实际代码逻辑来绘制，不省略、不捏造。
  - 分支流程必须完整表达：代码中的 if/else、三元判断、early return、请求成功/失败等所有分支，都必须在流程图中用条件节点 {} 和 |分支标注| 画出；每个分支（如「通过」「不通过」「成功」「失败」）及其后续步骤都须独立延伸，不得只写主流程而省略条件分支。
  </节点说明>
</JSDoc 注释编写规范>

<基于 tsx 的 JSDoc 注释示例>
\`\`\`ts skills/student-score-manage/dataSource.ts
import { DataSource } from 'mybricks'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

interface StudentGradesResult {
  studentInfo: StudentInfo
  gradeList: GradeItem[]
}

class MyDatasource extends DataSource {
  async fetchStudentGrades(studentId: string): Promise<StudentGradesResult> {
    return this.axios.get('/student-grades', { params: { studentId } })
  }
}

export default new MyDatasource()
\`\`\`

\`\`\`tsx index.tsx
import { appRef } from 'mybricks'

/**
 * @mybricks
 * name: default
 * title: 入口文件
 * summary: 入口文件
 * type: app
 */
export default appRef(() => {
  return
})
\`\`\`

\`\`\`tsx skills/student-score-manage/cards/GradeCard/index.tsx
import { comRef, useCardApis } from 'mybricks'
import { useEffect, useState } from 'react'
import dataSource from '../../dataSource'
import styles from './index.module.less'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

/**
 * @mybricks
 * name: GradeCard
 * title: 学生成绩查看卡片
 * summary: 卡片主体，展示学生基本信息、各科目成绩列表与总分/平均分统计，初始化与刷新时加载学生成绩。
 * type: com
 * datasource:
 *   root:
 *     fetchStudentGrades:
 *       desc: 组件挂载时根据 studentId 调用学生成绩接口，加载学生基本信息与成绩列表
 *   refreshBtn:
 *     fetchStudentGrades:
 *       desc: 点击刷新按钮调用学生成绩接口，重新加载学生基本信息与成绩列表
 * state:
 *   studentName:
 *     studentInfo:
 *       desc: 展示当前学生姓名
 *   studentClassName:
 *     studentInfo:
 *       desc: 展示当前学生班级
 *   gradeList:
 *     gradeList:
 *       desc: 展示学生各科目成绩列表
 *   summary:
 *     gradeList:
 *       desc: 展示基于成绩列表计算出的总分与平均分
 *   refreshBtn:
 *     loading:
 *       desc: 展示成绩刷新过程中的加载状态
 *   errorText:
 *     errorMsg:
 *       desc: 展示成绩加载失败时的错误提示
 * events:
 *   refreshBtn:
 *     onClick:
 *       title: 刷新成绩
 *       mermaid: 'flowchart LR; A["设置loading状态"] --> B["清空错误提示"] --> C["请求学生成绩接口"] --> D{"请求是否成功"}; D -->|成功| E["更新学生信息"] --> F["更新成绩列表"] --> G["取消loading状态"]; D -->|失败| H["展示错误提示"] --> G'
 */
export default comRef(({ studentId, showAverage }) => {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [gradeList, setGradeList] = useState<GradeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const total = gradeList.reduce((sum, item) => sum + item.score, 0)
  const average = gradeList.length > 0 ? (total / gradeList.length).toFixed(1) : null

  const loadGrades = async () => {
    setLoading(true)
    setErrorMsg('')

    try {
      const result = await dataSource.fetchStudentGrades(studentId)
      setStudentInfo(result.studentInfo)
      setGradeList(result.gradeList)
    } catch (error) {
      setErrorMsg('成绩加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGrades()
  }, [studentId])

  const handleRefresh = () => {
    loadGrades()
  }

  useCardApis({
    /** 获取当前展示的学生基本信息，数据未加载完成时返回 null */
    getStudentInfo: () => studentInfo,
    /** 获取学生各科目成绩列表，数据未加载完成时返回空数组 */
    getGradeList: () => gradeList,
    /** 获取成绩统计摘要，包含总分和平均分，数据未加载完成时返回 null */
    getSummary: () =>
      studentInfo
        ? \`\${studentInfo.name}：总分 \${total} 分，平均分 \${average} 分\`
        : null,
    /** 获取当前成绩加载状态 */
    getLoading: () => loading,
    /** 获取当前错误提示，无错误时返回空字符串 */
    getErrorMsg: () => errorMsg,
  })

  return (
    <div className={styles.gradeCard}>
      <div className={styles.studentName}>{studentInfo?.name}</div>
      <div className={styles.studentClassName}>{studentInfo?.className}</div>
      <ul className={styles.gradeList}>
        {gradeList.map((item) => (
          <li key={item.subject}>{item.subject}：{item.score}</li>
        ))}
      </ul>
      {showAverage && average ? (
        <div className={styles.summary}>总分 {total} 分，平均分 {average} 分</div>
      ) : null}
      {errorMsg ? <div className={styles.errorText}>{errorMsg}</div> : null}
      <button className={styles.refreshBtn} onClick={handleRefresh}>
        {loading ? '刷新中' : '刷新成绩'}
      </button>
    </div>
  )
})
\`\`\`
</基于 tsx 的 JSDoc 注释示例>`,
  },
  backend: {
    codeRulesSection: `1. 后端接口使用合理、语义化的路径，如果是根路径，直接使用 “/” 即可。
2. 路由处理函数中必须做好参数校验和异常捕获，避免未处理异常直接暴露给用户。
3. 涉及数据库时，数据库表结构由工具调用进行准备；业务代码只负责查询和写入，不要在接口处理函数中执行建表逻辑。
4. 路由拆分参考 Express Router 的思路：每个业务路由文件导出一个独立 router，入口文件只负责统一挂载，不要把所有接口都写进 \`index.ts\`，合理拆分即可，不强制要求。

### 日志规范
1. 请求参数、返回数据以及各种异常信息都必须打印对应的日志，方便排查问题

### 路由返回规范
1. 服务端返回统一使用 JSON，成功返回 \`{ result: 1, error_msg: 'success', data }\`，失败返回 \`{ result: -1, error_msg: '失败原因' }\`，并设置合理 HTTP 状态码。

###
`,
    // builtInCapabilitiesSection: `使用skill: common-service`,
    examplesSection: `1. 入口文件
\`\`\`ts index.ts
import { Hono } from "hono";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const server = new Hono();

server.get("/", async (c) => {
  const serverLogger = c.get("logger").child({ route: "todos", action: "list" });

  try {
    const items: Todo[] = [];
    return c.json({ result: 1, error_msg: "success", data: { items } });
  } catch (error) {
    serverLogger.error({ error }, "查询任务列表失败");
    return c.json({ result: -1, error_msg: "查询任务列表失败" }, 500);
  }
});

export default server;
\`\`\`
`,
    honoUsageSection: `### Hono
当前项目支持使用 Hono 进行服务端开发。入口文件创建并导出 Hono app`,
  },
}

export function fullStackAppPromptBuilder(
  fullStackAppPromptSection: FullStackAppPromptSection,
): PluginAIPreset {
  return {
    disallowedDebugEnvs: ['mock'], // 调试态禁止mock环境
    promptSections: {
      agent: fullStackAppPromptSection.agent,
      developeGuide: fullStackAppPromptSection.developeGuide,
      designGuide: fullStackAppPromptSection.designGuide,
      documentGuide: fullStackAppPromptSection.documentGuide,
    } satisfies any,
    virtualFiles: async (context: any) => {
      const libraryDocsSection = await context.getEffectiveLibrariesSection()

      return [
        {
          path: '.agent/agent.md',
          content: [
            fullStackAppPromptSection.root.metaSection,
            '## 开发宪章',
            // fullStackAppPromptSection.root.guideSection,
            appPrompt.root.guideSection,
            '## 工程架构',
            // fullStackAppPromptSection.root.architectureSection,
            appPrompt.root.architectureSection,
            '## 可用的三方库',
            libraryDocsSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
        {
          path: 'frontend/.agent/agent.md',
          content: [
            // fullStackAppPromptSection.frontend.metaSection,
            appPrompt.frontend.metaSection,
            '# 前端规范',
            // fullStackAppPromptSection.frontend.guideSection,
            appPrompt.frontend.guideSection,
            '## 设计规范加载',
            '当任务涉及卡片初始化、卡片搭建、卡片生成、改稿或样式调整时，先加载 design-spec skill 并读取相关规则文件，再进入具体代码开发。',
            '## 资源使用规范',
            fullStackAppPromptSection.frontend.assetsUsageSection,
            '## 环境变量',
            fullStackAppPromptSection.frontend.environmentVariablesSection,
            '## JsDoc声明规范',
            // fullStackAppPromptSection.frontend.jsDocUsageSection,
            appPrompt.frontend.jsDocUsageSection,
            '## 前端示例',
            // fullStackAppPromptSection.frontend.examplesSection,
            appPrompt.frontend.examplesSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
        {
          path: 'backend/.agent/agent.md',
          content: [
            fullStackAppPromptSection.backend.metaSection,
            '# 服务端规范',
            fullStackAppPromptSection.backend.guideSection,
            '## 代码规范',
            appPrompt.backend.codeRulesSection,
            '## 环境变量',
            fullStackAppPromptSection.backend.environmentVariablesSection,
            '## 框架和数据库',
            appPrompt.backend.honoUsageSection,
            // fullStackAppPromptSection.backend.honoUsageSection,
            // fullStackAppPromptSection.backend.pgUsageSection,
            // '## 服务端内置能力',
            // fullStackAppPromptSection.backend.builtInCapabilitiesSection,
            '## 服务端示例',
            appPrompt.backend.examplesSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
      ]
    },
  }
}
