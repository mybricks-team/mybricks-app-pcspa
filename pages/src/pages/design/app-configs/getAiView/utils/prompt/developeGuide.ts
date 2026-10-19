/**
 * 开发指南
 */
const firstOfAll = `- 开发宪章
> 参考「开发指南」+「源代码」进行代码开发任务，必须遵循「最佳实践」和「设计规范」，在编写各类型文件时，按照「文件编写规范」完成代码任务；JSDoc 注释属于代码的一部分，需要在编写节点代码时同步维护；完成代码任务后，遵循「文档规范」同步 requirement.md。

- 总体规则
  - 功能：生产级别的功能性；
  - 细节：在每个细节都精心完善；
  - 响应式：保证合理统一的间距，以及支持宽度变化自适应的代码；
  - 当前每一个设计态画布默认宽度为1200px，可以通过样式文件中使用 :frame { width: 1440px } 统一配置画布宽度；
    - 如果是PC端界面，画布宽度配置常见的 1200、1440、1660、1920 等宽度；
    - 如果是移动端界面，画布宽度建议配置414宽度；
- 拆分逻辑
  - 精准识别到底是页面还是弹窗，对其进行拆分，如果是页面，需要使用Route渲染，如果是弹窗，需要使用popupRef；
  - 我们特别希望在设计态能够展示所有页面和弹窗，方便用户进行调试；`

const environmentVariablesSection = `以下是系统注入的环境变量，可在组件代码中通过 \`process.env.<变量名>\` 访问，**禁止自行声明或覆盖这些变量**：

| 变量名 | 类型 | 设计态值 | 运行态值 | 说明 |
|--------|------|----------|----------|------|
| \`process.env.POPUP_VISIBLE\` | \`boolean\` | \`true\` | \`false\` | **只能在 \`popupRef\` 包裹的组件内部使用**，否则会导致运行时报错。控制浮层（弹窗/抽屉等）的默认显示状态。设计态下为 true 使浮层保持展开，方便设计者选中浮层内元素进行编辑；运行态下为 false，由业务逻辑控制显隐。浮层组件必须将此变量与业务状态做 || 合并使用，例如：visible={process.env.POPUP_VISIBLE || visible} |
| \`process.env.POPUP_NODE\` | \`HTMLElement\` | 设计器画布容器节点 | 页面容器节点 | **只能在 \`popupRef\` 包裹的组件内部使用**，否则会导致运行时报错。浮层的挂载容器。设计、运行态下均指向设计器画布，确保浮层渲染在画布内部。例如一些三方库的指定挂载节点：getContainer={() => process.env.POPUP_NODE} |`

/**
* 资源使用说明
*/
const assetsUsageSection = `- 对于图标：为了保证视觉的统一与专业性，我们的共识是统一使用图标组件。
  - 如果没有图标组件，则使用色块+文本占位；除非用户明确要求，否则禁止使用 Emoji 或特殊字符。
- 对于图片：图片是传递信息与氛围的关键。我们建议根据其用途选择合适的来源：
  - https://ai.mybricks.world/image-search?term=searchWord&w=20&h=20，可以配置一个高质量的写实图片（比如摄影、人文等）；
  具体来说
  - 对于海报/写实/商品/图片等：我们建议使用高质量的写实图片；
  - 对于Logo：我们建议使用色块+文本占位；
  - 对于插画/装饰性图形：我们优先推荐使用简单的svg来占位，避免使用图片过于跳脱；`

/**
 * 架构说明
 */
const architectureSection = `\`\`\`
├─ index.tsx           # 模块入口，有且仅有一个，必须写在根路径
├─ index.module.less
├─ dataSource.ts       # 项目唯一文件，必须
├─ setup.ts            # 项目唯一文件，必须
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
\`\`\`

> 项目支持渐进式渲染，初始化项目时，建议将入口和公共文件先初始化好，再按照页面进行初始化。

### 页面与组件的文件拆分
- index.tsx：模块入口，有且仅有一个，且必须写在根路径的 \`index.tsx\` 中；
- pages/xxx：页面，每个页面必须单独拆到**文件夹**中，例如 \`pages/HomePage/index.tsx\`、\`pages/UserPage/index.tsx\`；
- 组件：公共可复用组件，所有能在多个页面中重复使用的功能组件，必须统一放在 components/ 目录下，每个组件独立创建文件夹存放；

> 拆分仅作为结构处理，建议的开发顺序是完成基础架构的代码、然后按页面维度一个一个完成需求。

### tsx 文件编写规范
1. 必须使用 TypeScript，所有组件 props、state、函数参数和返回值都需要有明确的类型定义；
2. 组件状态和业务逻辑封装在组件内部，使用 useState、useReducer 等 React hooks 管理状态；
3. 当逻辑相对独立或较为复杂时，抽取到同级 \`hooks/\` 文件夹中，每个自定义 hook 单独一个文件（如 \`hooks/useXxx.ts\`）；
4. 禁止编写未实现的事件函数；
5. 对于浮层类组件，如弹窗、抽屉等，控制浮层的显示/打开/弹出/隐藏状态的变量使用 useState 维护，禁止设置为固定值；
6. 所有来自三方库的组件都必须带有 className 属性，值需语义化明确且唯一，无论是否需要样式，以便通过 CSS 选择器选中；
  - \`<View className={css.xxx}/>\`
7. 所有html元素都必须具有语义化的 className，无论是否需要样式，以便通过 CSS 选择器选中；
  - \`<div className={css.xxx}/>\`
8. 所有与样式相关的内容都要写在 less 文件中，避免在 tsx 中通过 style 编写；
9. 各类动效、动画等，尽量使用 css3 的方式在 less 中实现，不要为此引入任何的额外类库；
10. 禁止出现直接引用标签的写法，例如 \`<Tags[XX] property={'aa'}/>\`，正确的写法是先定义 \`const XX = Tag[XX]; <XX property={'aa'}/>\`；
11. 所有列表中的组件，必须通过 key 属性做唯一标识，不要使用 index 作为 key；

comRef 说明：
- comRef 是 MyBricks 提供的高阶函数，用于创建一个组件；

popupRef 说明：
- popupRef 是 MyBricks 提供的高阶函数，用于创建浮层类组件（弹窗、抽屉等）；

### less 文件编写规范
1. 样式文件命名规则：格式为 \`*.module.less\` 的文件，编译时自动启用**CSS Module**模块化处理；格式为 \`*.less\` 的文件编译时不开启CSS Module；
2. 开发优先统一使用 \`*.module.less\` 格式编写样式，从根源避免全局样式污染、样式重叠冲突问题；
3. :frame 配置规则（仅页面和浮层类组件需要，普通组件不需要）：
   - 每个页面（page），必须配置 :frame { width }，宽度参考设计稿或 1440px（若无设计稿）；
   - 每个浮层类组件（由 popupRef 创建的组件），必须配置 :frame { width; height }，宽度与页面保持一致（同为 1440px 或设计稿宽度），高度在弹窗内容实际高度基础上额外增加 200～300px，以留出遮罩层空间（如内容约 400px 则配置 height: 650px）；
   - :frame 只控制画布尺寸，不影响运行时布局，必须放在所有 CSS 类之前；
   - :frame 只在首次创建页面或浮层类组件或者有重大 UI 重构时才需要重新估算；
   - 页面根组件用宽度100%适配:frame 宽度；
3. 在选择器中，多个单词之间使用驼峰方式，不能使用 - 连接；
4. 尽量不要用 calc 等复杂的计算；
5. 动效、动画等效果，尽量使用 css3 的方式实现，例如 transition、animation 等；
6. 不使用 :before、:after 等伪类选择器来实现 dom；

### hooks/ 文件夹编写规范
当组件内存在相对独立、可复用或逻辑复杂的逻辑时，将其抽取为自定义 hook，放在同级 \`hooks/\` 文件夹中，每个 hook 对应一个独立文件。

使用原则：
- hooks 以文件夹形式存放，目录名必须是 \`hooks\`，位于组件或页面同级；
- 每个 hook 单独一个文件，文件名与 hook 名相同（如 \`useXxx.ts\`），存放在 \`hooks/\` 目录下；
- 每个自定义 hook 以 \`use\` 开头命名；
- hook 应内部管理自己的副作用，不对外暴露命令式方法；把需要响应的数据作为参数传入 hook，hook 内部用 \`useEffect\` 监听并处理；
- 禁止把「何时初始化/何时更新」的控制权暴露给外部：
  - 错误：hook 暴露 \`setXxx\` / \`initXxx\` 方法，由外部在 \`useEffect\` 里手动调用；
  - 正确：把需要响应的数据作为参数传入 hook，hook 内部决定如何响应；
- 当多个组件需要共享逻辑时，提取到上层公共 \`hooks/\` 目录中；

### 日志规范
项目中必须使用 mybricks 提供的 \`logger\` 工具打印日志，禁止使用 console.log / console.warn / console.error 等原生方法。

**核心原则：每一步的输入与输出必须成对可见**——只读日志不看代码，就能回答三个问题：这一步进来了什么（入参）、走了哪条路（分支）、产出了什么（结果）。禁止只打「开始」不打「结果」的半截日志。

**日志格式**：\`logger.info('[文件或组件名/函数名] 描述', '标签', 对应数据)\`——消息字符串只包含前缀与描述，禁止把数据拼接进消息字符串；标签作为独立字符串参数传入、紧随其后传入对应数据，多组可依次罗列（如 \`logger.error('[xx/fn] 请求失败', '入参', params, '错误', error)\`）；标签从以下固定词表选取，便于在日志面板快速区分每条日志的性质；无对应数据时只传消息字符串：
- \`入参\`：函数、请求、事件的输入，全量打印；
- \`结果\`：函数返回值、请求成功响应、事件处理产物，必须输出数据本体（完整对象/数组），数量/长度只能作为附加字段，禁止只打 count/length/id 等摘要；
- \`分支\`：条件走向，必须携带条件表达式的实际值，禁止只写「走了A分支」；
- \`跳转\`：路由导航，必须携带传给导航 API 的完整 url（含 query 参数）与业务参数，只打业务参数省略 url 视为违规；
- \`错误\`：异常与失败详情，必须携带 error 对象，可与 \`入参\` 复合并用；
- 同一业务的调用链各层保持一致的命名前缀（\`OrderPage/handlePay\` → \`useOrders/pay\` → \`ordersApi/pay\`），日志按时间顺序排列即可还原整条链路。
- 敏感字段（密码、token 等）禁止直接进入日志。

**必打场景**：
- 接口/数据请求：调用前打 \`入参\`；每个请求成功后各自打 \`结果\`，数据本体全量输出——错误：\`{ productsCount: res.data?.list?.length }\`，正确：\`{ products: res.data?.list }\`；失败时 logger.error 同时携带当时的入参与 error 对象；
- 事件处理：onClick、onChange、onBlur 等触发时打 \`入参\`（含事件关键值），处理完成后打 \`结果\`；
- 条件分支：进入关键分支时打 \`分支\` 日志（含条件实际值）；
- 路由跳转：每次调用 Taro 导航 API（navigateTo / redirectTo / switchTab / reLaunch / navigateBack）前必须打 \`跳转\` 日志，包括登录拦截、失败兜底等条件分支内的跳转，无例外；
- try-catch 的 catch 块必须 logger.error 记录错误详情，并尽量带上当时的入参；
- 任何可能失败的操作（数据解析、类型转换、JSON.parse 等）必须 try-catch 包裹并按第 6 条打日志。

重复结构处理：当一个区块内存在多个「结构相同、仅数据不同」的重复单元时，必须拆成「容器 + 单项」两层：
- 容器（comRef）：负责布局与数据遍历，用 map 渲染单项；
- 单项（comRef）：描述单条数据的 UI，通过 props 接收单条数据；
- 禁止在容器中直接内联重复的 JSX 块；

命名与实现：
- 命名：使用语义化 PascalCase，名称应直接反映其在页面中的位置与职责；
- 实现：每个独立区块写成 \`const 区块名 = comRef(...)\`；
- 区块独立性：父组件只负责布局与子区块挂载，状态和业务逻辑各自在组件内部或对应 hook 中管理；

典型拆分示例（以「用户管理页」为例，筛选栏和列表有独立逻辑，header 只有标题则内联不拆）：
- App
  - Routes
    - UserPage（header 仅含标题，直接内联在页面组件中，不单独拆文件）
      - FilterBar（有筛选状态 → 独立 comRef）
      - UserList（有列表数据与分页 → 独立 comRef）
        - UserRow（列表单项含多字段与操作 → 独立 comRef）
      - EditModal（修改数据弹窗）`

/**
 * 开发示例
 */
const examplesSection = `
<example>
  <user_query>开发一个按钮查看，点击查看详情</user_query>
  <assistant_response>
  好的，这是一个空项目，我将为您从0开始开发两个页面，包含主页面和查看详情页。
  
  首先使用init-project来快速生成代码文件，节点代码中同步包含 JSDoc 注释，然后确认渲染情况，最后检查是否需要同步需求文档。
  
  \`\`\`tsx
  import { appRef, Routes, Route } from "mybricks";
  import MainPage from "./pages/MainPage";
  import ViewPage from "./pages/ViewPage";

  /**
   * @mybricks
   * name: default
   * title: 查看详情应用入口
   * summary: 应用根节点，通过路由提供主页面与查看详情页的切换与展示。
   * type: app
   */
  export default appRef(() => {
    return (
      <Routes>
        <Route index element={<MainPage />} />
        <Route path="view" element={<ViewPage />} />
      </Routes>
    );
  });
  \`\`\`

  \`\`\`tsx
  import { useState } from 'react';
  import { comRef, logger } from "mybricks";
  import { Button } from "antd";
  import DetailModal from "../../components/DetailModal";
  import css from "./index.module.less";

  /**
   * @mybricks
   * name: OperationBar
   * title: 操作栏
   * summary: 提供查看与关闭按钮，用于控制详情弹窗显示状态。
   * type: com
   * events:
   *   openBtn:
   *     onClick:
   *       title: 打开详情弹窗
   *       mermaid: 'flowchart LR; A["记录操作日志"] --> B["打开详情弹窗"]'
   *       relations:
   *         DetailModal:
   *           type: popup
   *   closeBtn:
   *     onClick:
   *       title: 关闭详情弹窗
   *       mermaid: 'flowchart LR; A["记录操作日志"] --> B["关闭详情弹窗"]'
   */
  const OperationBar = comRef(() => {
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);

    const handleOpenDetail = () => {
      // 演示用：写死详情 id，实际业务中一般来自列表行点击等场景
      const id = 1;
      logger.info('[OperationBar/handleOpenDetail] 点击打开弹窗', '入参', { id });
      setDetailId(id);
      setDetailModalVisible(true);
    };

    const handleCloseDetail = () => {
      logger.info('[OperationBar/handleCloseDetail] 点击关闭弹窗');
      setDetailModalVisible(false);
    };

    return (
      <div className={css.operationBar}>
        <Button type="primary" className={css.openBtn} onClick={handleOpenDetail}>查看</Button>
        <Button className={css.closeBtn} onClick={handleCloseDetail}>关闭</Button>
        <DetailModal visible={detailModalVisible} detailId={detailId} />
      </div>
    );
  });

  /**
   * @mybricks
   * name: DetailPage
   * title: 查看详情页
   * summary: 页面节点，初始化标题并挂载操作按钮区块。
   * type: page
   */
  export default comRef(() => {
    return (
      <div className={css.viewContainer}>
        <p className={css.title}>查看详情按钮</p>
        <OperationBar />
      </div>
    );
  });
  \`\`\`

  \`\`\`tsx
  import { useEffect, useState } from "react";
  import { popupRef, logger } from "mybricks";
  import { Modal } from "antd";
  import dataSource from "../../dataSource";
  import css from "./index.module.less";

  interface DetailModalProps {
    visible: boolean;
    detailId: number | null;
  }

  interface Detail {
  }

  /**
   * @mybricks
   * name: DetailModal
   * title: 详情弹窗
   * summary: 浮层组件，根据详情 id 从 dataSource 获取详情数据并展示。
   * type: popup
   */
  const DetailModal = popupRef(({ visible, detailId }: DetailModalProps) => {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (!visible || detailId === null) {
        logger.info('[DetailModal/loadDetail] 弹窗未打开，跳过详情请求', '分支', { visible, detailId });
        return;
      }
      setLoading(true);
      logger.info('[DetailModal/loadDetail] 请求详情数据', '入参', { detailId });
      dataSource
        .fetchDetail(detailId)
        .then((data) => {
          setDetail(data);
          setLoading(false);
          logger.info('[DetailModal/loadDetail] 请求详情数据成功', '结果', { detail: data });
        })
        .catch((error) => {
          setLoading(false);
          logger.error('[DetailModal/loadDetail] 请求详情数据失败', '入参', { detailId }, '错误', error);
        });
    }, [visible, detailId]);

    return (
      <Modal
        className={css.detailModal}
        title="详情"
        open={process.env.POPUP_VISIBLE || visible}
        getContainer={() => process.env.POPUP_NODE}
        footer={null}
      >
        ...
      </Modal>
    );
  });

  export default DetailModal;
  \`\`\`

  \`\`\`less
  :frame {
    width: 1600px;
  }
  .viewContainer {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .operationBar {}
  \`\`\`

  最后检查下状态

  当前已经渲染了一个页面 + 一个弹窗，已经完成代码开发，并已在节点代码中同步维护 JSDoc 注释，接下来检查是否需要同步 requirement.md。
  
  </assistant_response>
</example>

<example>
  <user_query>这里点击是到一个新的弹窗？注意，当前用户选择了: button(selector=.button</user_query>
  <assistant_response>
   我来找一下这个按钮跳转后的逻辑，先看下相关代码

   这里我看了下，按钮点击后目前只有日志打印，需要我帮我你实现到新弹窗的跳转逻辑吗？
  </assistant_response>
</example>

<example>
  <user_query>这里改成黑色的背景，注意，当前用户选择了: logo(selector=.logo</user_query>
  <assistant_response>
  好的，我将为您在 logo 区域的样式上修改背景色。

  让我先搜索下logo相关的代码位置，同时读取几个相关的less文件，看下用户的具体需求。

  好的，已经定位到代码位置了，我将在.logo的样式上修改背景色为黑色，开始修改

  \`\`\`less
  .logo {
    background-color: #FF0000;
  }
  \`\`\`
  
  \`\`\`less
  .logo {
    background-color: #000;
  }
  \`\`\`
  </assistant_response>
</example>
`

export default {
  firstOfAll,
  environmentVariablesSection,
  assetsUsageSection,
  architectureSection,
  examplesSection
}
