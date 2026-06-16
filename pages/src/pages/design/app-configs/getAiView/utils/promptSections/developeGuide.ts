export default {
  /** 总体开发规则、画布宽度、页面/弹窗拆分等基础规范 */
  firstOfAll: `- 开发宪章
> 参考「开发指南」+「源代码」进行代码开发任务，必须遵循「最佳实践」和「设计规范」，在编写各类型文件时，按照「文件编写规范」完成代码任务；JSDoc 注释属于代码的一部分，需要在编写节点代码时同步维护；完成代码任务后，遵循「文档规范」同步 requirement.md。

- 总体规则
  - 功能：生产级别的功能性；
  - 细节：在每个细节都精心完善；
  - 响应式：ui需要适应不同尺寸画布，保证在不同缩放比例下都能正常显示内容；
- 拆分逻辑
  - 以功能卡片维度来编写前端组件；`,
  /** 图标与图片资源的使用规范 */
  // assetsUsageSection: '',
  /** 项目目录结构、jsx/less/store 等文件编写规范 */
  architectureSection: `\`\`\`
├─ frontend                           # 前端卡片代码目录
|  ├─ index.tsx                       # MyBricks 前端入口，有且仅有一个，必须写在 frontend/index.tsx
|  ├─ dataSource.ts                   # 前端数据源，项目唯一文件，必须，调用本项目服务端使用 /api/xxx 路径调用
|  ├─ setup.ts                        # 前端 mock 或初始化逻辑，项目唯一文件，必须
|  ├─ components                      # 可选，跨卡片可复用组件，封装在此目录统一管理
|  ├─ {分类名}                         # 按业务分类组织，例如 user、order、product 等
|  |  ├─ components                   # 可选，该分类下的可复用组件，封装在此目录统一管理
|  |  ├─ {功能名}                      # 该分类下具体的功能卡片，例如 UserProfile、OrderList
|  |  |  ├─ index.config.ts           # 必选，卡片配置文件，描述卡片元信息；若卡片对外暴露 API，必须在此文件的 apis 字段声明
|  |  |  ├─ index.tsx                 # 必选，卡片组件入口，导出默认 React 组件
|  |  |  ├─ index.module.less         # 可选，卡片样式文件，使用 CSS Modules
|  |  |  ├─ {子组件名}.tsx             # 可选，当 index.tsx 中组件过多时，适当拆分为同级子组件文件
|  |  |  ├─ {子组件名}.module.less     # 可选，子组件样式文件，使用 CSS Modules
|  |  └─ ...                          # 其他功能卡片目录
|  └─ ...                             # 其他分类目录
├─ backend                            # 必选，服务端代码入口，自动渲染MyBricks 前端项目
|  ├─ index.ts                        # 必选，服务入口，在这里创建 Hono app
|  ├─ db.ts                           # 可选，数据库连接文件，仅在需要数据库时创建
|  ├─ routes                          # 可选，按业务域和路由拆分，一个文件一个业务路由，比如 /api/user 存放到 user.ts中 
|  |  └── user.ts
\`\`\`

### tsx 文件编写规范
1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义；
2. 组件状态和业务逻辑封装在组件内部，使用 useState、useReducer 等 React hooks 管理状态；
3. 当逻辑相对独立或较为复杂时，抽取到同级 \`hooks/\` 文件夹中，每个自定义 hook 单独一个文件；
4. 禁止编写未实现的事件函数；
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层显示状态的变量使用 useState 维护，禁止设置为固定值；
6. 所有来自三方库的组件和所有 html 元素都必须带有语义化明确且唯一的 className；
7. 禁止出现直接引用标签的写法，例如 \`<Tags[XX] property={'aa'}/>\`，正确写法是先定义 \`const XX = Tag[XX]; <XX property={'aa'}/>\`；
8. 所有列表中的组件必须通过 key 属性做唯一标识，不要使用 index 作为 key；
9. 前端调用本项目服务端接口时，统一在 \`dataSource.ts\` 中通过 MyBricks DataSource 的 \`this.axios\` 调用相对路径 \`api/xxx\` 请求。
10. 若卡片需要对外暴露 API（供其他卡片或宿主调用），必须同时满足两个条件：① 在 \`index.config.ts\` 的 \`apis\` 字段中声明所有 API 名称与描述；② 在 \`index.tsx\` 运行时通过 \`useCardApis\`（从 \`mybricks\` 导入）注册对应的实现函数，二者必须保持一致。**API 仅用于对外提供只读信息（getter），禁止暴露任何会修改卡片内部状态的操作类方法；卡片内部状态只能由卡片自身管理，不允许通过 API 被外部写入或变更。**

### less 文件编写规范
1. 样式文件命名规则：\`*.module.less\` 编译时自动启用 CSS Module，\`*.less\` 编译时不开启 CSS Module；
2. 开发优先统一使用 \`*.module.less\` 编写样式；
3. 选择器中多个单词之间使用驼峰方式，不能使用 - 连接；
4. 不使用 :before、:after 等伪类选择器来实现 dom。
5. 开发的是一个个功能卡片，而非页面，样式上需要适应不同尺寸画布，保证在不同缩放比例下都能正常显示内容
6. 卡片通常不会设置一个固定的高度，而是根据内容自定义高度

### hooks 文件夹编写规范
- hooks 以文件夹形式存放，目录名必须是 \`hooks\`；
- 每个 hook 单独一个文件，文件名与 hook 名相同，如 \`useXxx.ts\`；
- 每个自定义 hook 以 \`use\` 开头命名；
- hook 应内部管理自己的副作用，不对外暴露命令式方法；
- 当多个组件需要共享逻辑时，提取到上层公共 \`hooks/\` 目录中。

### 日志规范
项目中必须使用 mybricks 提供的 \`logger\` 工具打印前端日志，禁止使用 console.log / console.warn / console.error 等原生方法。

必须在以下场景打印足量日志：
1. 用户交互事件；
2. 数据请求；
3. 状态变更；
4. 条件分支与异常；
5. 路由跳转；
6. 任何可能失败的操作。

### 服务端编写规范
当前项目支持使用 Hono 进行服务端开发。涉及数据库时，先通过工具确认数据库表结构，再在服务端代码中编写查询、写入和接口逻辑。
1. 后端接口路径统一挂在 \`api\` scope 下，例如 \`/api/todos\`、\`/api/users/:id\`；前端在 \`dataSource.ts\` 中直接通过 \`this.axios.get('api/todos')\` 来调用，必须是api相对路径。
2. 服务端返回统一使用 JSON，成功返回 \`{ result: 1, error_msg: 'success', data }\`，失败返回 \`{ result: -1, error_msg: '失败原因' }\`，并设置合理 HTTP 状态码。
3. 路由处理函数中必须做好参数校验和异常捕获，避免未处理异常直接暴露给用户。
4. 服务端需要访问数据库时，使用 \`mysql2/promise\` 包的 \`createPool\`，连接配置从 \`process.env.db\` 读取；数据库表结构由工具调用进行准备，业务代码只负责查询和写入，不要在接口处理函数中执行建表逻辑。
5. 路由拆分参考 Express Router 的思路：每个业务路由文件导出一个独立 router，入口文件只负责统一挂载，不要把所有接口都写进 \`backend/index.ts\`。

### 服务端示例
1.入口文件
\`\`\`ts
import { Hono } from 'hono';
import todoRoutes from './routes/todo';

const app = new Hono();

app.route('/api/todos', todoRoutes);

export default app;
\`\`\`

2.数据库文件
\`\`\`ts
import { createPool } from 'mysql2/promise';

export const pool = createPool({
  host: process.env.db.host,
  port: process.env.db.port,
  user: process.env.db.user,
  password: process.env.db.password,
  database: process.env.db.database,
});
\`\`\`

3.业务路由todo.ts
\`\`\`ts
import { Hono } from 'hono';
import { pool } from '../db';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const todoRoutes = new Hono();

todoRoutes.get('/', async (c) => {
  try {
    const result = await pool.query<Todo>(
      'SELECT id, title, completed FROM todos ORDER BY id DESC'
    );

    return c.json({ result: 1, error_msg: 'success', data: result.rows });
  } catch (error) {
    return c.json({ result: -1, error_msg: '查询任务列表失败' }, 500);
  }
});

export default todoRoutes;
\`\`\`
  `,
  /** 示例代码块，展示典型开发模式 */
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
export default appRef(({ children }) => {
  return children
})
\`\`\`

\`\`\`tsx frontend/student/GradeCard/index.tsx
import { comRef, useCardApis } from 'mybricks'
import { useState } from 'react'

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

  return <div>学生成绩卡片</div>
})
\`\`\`

\`\`\`ts frontend/student/GradeCard/index.config.ts
import { defineConfig } from 'mybricks'

export default defineConfig({
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
`,
  /** 追加到本节末尾 */
  end: ''
}
