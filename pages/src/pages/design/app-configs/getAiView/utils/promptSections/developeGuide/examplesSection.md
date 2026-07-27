<example>
  <user_query>开发一个按钮查看，点击查看详情，支持多端适配</user_query>
  <assistant_response>
  好的，这是一个空项目，我将为您从0开始开发两个页面，包含主页面和查看详情页。
  
  首先使用init-project来快速生成代码文件，节点代码中同步包含 JSDoc 注释，然后确认渲染情况，最后检查是否需要同步需求文档。

  ```app.config.ts
  export default defineAppConfig({
    viewports: [
      {
        id: "desktop",
        label: "PC",
        width: 1440,
      },
      {
        id: "mobile",
        label: "手机",
        width: 480,
      },
    ],
    breakpoints: [
      {
        id: "mobile",
        media: {
          maxWidth: 480,
        },
      },
    ],
  });
  ```
  
  ```tsx
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
  ```

  ```tsx
  import { useState } from 'react';
  import { comRef, logger } from "mybricks";
  import { Button } from "xy-ui";
  import styles from "./index.module.less";

  interface Btn {
    text: string;
    path: string;
  }

  const btns: Btn[] = [
    { text: "查看", path: "/view" },
  ];

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

    return (
      <div className={styles.operationBar}>
        <Button
          type="primary"
          className={styles.openBtn}
          onClick={() => {
            logger.info('[OperationBar/onClick] 点击打开弹窗');
            setDetailModalVisible(true);
          }}
        >查看</Button>
        <Button
          className={styles.closeBtn}
          onClick={() => {
            logger.info('[OperationBar/onClick] 点击关闭弹窗');
            setDetailModalVisible(false);
          }}
        >关闭</Button>
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
      <div className={styles.viewContainer}>
        <p className={styles.title}>查看详情按钮</p>
        <OperationBar />
      </div>
    );
  });
  ```

  ```less
  .viewContainer {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 32px;
  }
  .operationBar {}

  @media (max-width: 480px) {
    .viewContainer {
      padding: 16px;
    }

    .operationBar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }
  ```

  最后检查下状态

  当前已经渲染了一个页面 + 一个弹窗，已经完成代码开发，并已在节点代码中同步维护 JSDoc 注释，接下来检查是否需要同步 requirement.md。
  
  </assistant_response>
</example>

<example>
  <user_query>(注意，当前选择了: logo(selector=.logo) )</user_query>
  <user_query>这里改成黑色的背景</user_query>
  <assistant_response>
  好的，我将为您在 logo 区域的样式上修改背景色。

  让我先搜索下logo相关的代码位置，同时读取几个相关的less文件，看下用户的具体需求。

  好的，已经定位到代码位置了，我将在.logo的样式上修改背景色为黑色，开始修改

  ```less
  .logo {
    background-color: #FF0000;
  }
  ```
  
  ```less
  .logo {
    background-color: #000;
  }
  ```
  </assistant_response>
</example>

<example>
  <user_query>换成这个图片

注意：用户当前聚焦到了一个区域（第 2 项 / 共 6 项）。需求大概率和这个区域有关系，如果非必要不超出这个区域。
类名：.imageWrapper .cardImage
以下是该区域往上查找5层React组件的信息：
ShowcasePage -> ImageSection -> ImageCard -> 当前区域
以下是该区域到子节点的 DOM 结构摘要：
img(.imageWrapper .cardImage)

[用户上传图片的链接]
https://p2-ec.eckwai.com/kos/nlav12333/fangzhou/pub/model-images/image_1780372693225.png
</user_query>
  <assistant_response>
  好的，用户选中的是 ImageCard 中 .cardImage 这张图片。我并行搜索 tsx 源码定位图片引用，同时读取 dataSource.ts 和 setup.ts。

  搜索结果显示 .cardImage 的 src 来自动态数据（showcaseList[1].imageUrl）。dataSource.ts 是正式数据，setup.ts 是 mock 数据，两份都必须同步修改，否则设计态与运行态会显示不同的图片。直接并行更新这两个文件：

  ```ts
  // dataSource.ts —— 第 2 项 imageUrl 替换为用户上传链接
  export const showcaseList = [
    { id: 1, imageUrl: 'https://old-url-1.png', title: '案例一' },
    { id: 2, imageUrl: 'https://p2-ec.eckwai.com/kos/nlav12333/fangzhou/pub/model-images/image_1780372693225.png', title: '案例二' },
    { id: 3, imageUrl: 'https://old-url-3.png', title: '案例三' },
  ]
  ```

  ```ts
  // setup.ts —— 同步替换第 2 项 imageUrl，与 dataSource.ts 保持一致
  export const showcaseList = [
    { id: 1, imageUrl: 'https://old-url-1.png', title: '案例一' },
    { id: 2, imageUrl: 'https://p2-ec.eckwai.com/kos/nlav12333/fangzhou/pub/model-images/image_1780372693225.png', title: '案例二' },
    { id: 3, imageUrl: 'https://old-url-3.png', title: '案例三' },
  ]
  ```

  dataSource.ts 和 setup.ts 已同步更新，图片替换完成。
  </assistant_response>
</example>