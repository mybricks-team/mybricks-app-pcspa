import AIPlugin, { createRequestAsStream } from '@mybricks/plugin-ai'

const COMLIB_NAMESPACE_LITE = 'mybricks.normal-pc-lite'
const COMLIB_NAMESPACE_AI = 'mybricks.ai-comlib-pc'

/** Returns 'ai' when both lite and ai comlib namespaces exist in window.__comlibs_edit_, otherwise 'atomic'. */
function getGenerationStrategy(): 'ai' | 'atomic' {
  const comlibs = (typeof window !== 'undefined' && (window as any).__comlibs_edit_) as Array<{ namespace?: string }> | undefined
  if (!Array.isArray(comlibs) || comlibs.length === 0) return 'ai'
  const hasLite = comlibs.some((lib) => lib?.namespace === COMLIB_NAMESPACE_LITE)
  const hasAi = comlibs.some((lib) => lib?.namespace === COMLIB_NAMESPACE_AI)
  return hasLite && hasAi ? 'ai' : 'atomic'
}

export default ({ requestAsStream, user, key, guidePrompt, enableDefaultEventFlow, config, plugins = [] }: any) => AIPlugin({
  // requestAsStream,
  user,
  isMutiCanvas: false,
  deviceType: 'desktop',
  config,
  key,
  plugins,
  onRequest: (params) => {
    return createRequestAsStream({ useInfra: false })?.(params)
  },
  codingMode: true,
  createTemplates: {
    page: ({ title }) => {
      return {
        type: "normal",
        title: "页面",
        inputs: [
          {
            id: "open",
            title: "打开",
            schema: {
              type: "any",
            },
          },
        ],
      }
    }
  },
//   mock: [
//     `M:\`\`\`bash
// node generate-prd-and-require-component -mode generate && node clear-and-generate-page
// \`\`\`
// 完整性检查：根据用户想要“京东`,
//     `接口返回结果 我来为你生成一个《星露谷物语》Wiki百科页面的需求文档和组件选型。

// \`\`\`md title="星露谷物语Wiki百科需求文档.md"
// **概述**
// 设计一个功能完整的《星露谷物语》游戏Wiki百科页面，为玩家提供全面的游戏攻略、物品图鉴、角色信息和社区交流功能。整体采用田园风格设计，营造温馨自然的游戏氛围。


//   - 左侧筛选面板：包含"全部"、"农作物"、"矿物"、"鱼类"、"料理"、"工具"等分类标签
//   - 右侧物品网格：每行4个物品卡片，每个卡片包含：
//     - 物品图标（64x64px）
//     - 物品名称
//     - 稀有度标签（普通/银星/金星）
//     - 售价信息
//     - 获取方式简述
//   - 底部"查看更多"按钮

// **角色关系图**
// - **功能**：展示游戏中NPC角色信息和好感度系统
// - **视觉**：卡片式布局，每行3个角色卡片
// - **内容**：
//   - 区块标题："角色关系" + 心形装饰图标
//   - 角色卡片列表，每个卡片包含：
//     - 角色头像（圆形，80x80px）
//     - 角色姓名和职业
//     - 好感度等级显示（心形图标）
//     - 喜好物品标签
//     - "查看详情"文本链接

// **农场规划区**
// - **功能**：提供农场布局设计和规划工具
// - **视觉**：左右布局，左侧工具面板，右侧展示区域
// - **内容**：
//   - 区块标题："农场规划" + 房屋装饰图标
//   - 左侧工具栏：包含"布局模板"、"建筑工具"、"装饰物品"等分类按钮
//   - 右侧展示区：
//     - 推荐布局缩略图（3x2网格）
//     - 每个布局包含预览图、布局名称、适用阶段标签
//     - "使用此布局"按钮

// **攻略指南区**
// - **功能**：提供游戏攻略和技巧分享
// - **视觉**：文章列表形式，左侧缩略图，右侧文字信息
// - **内容**：
//   - 区块标题："攻略指南" + 书本装饰图标
//   - 攻略文章列表，每篇文章包含：
//     - 文章缩略图（120x80px）
//     - 文章标题
//     - 文章摘要（2行截断）
//     - 发布时间和阅读量
//     - 难度标签（新手/进阶/高级）

// **社区讨论区**
// - **功能**：玩家交流和讨论平台
// - **视觉**：论坛式布局，话题列表展示
// - **内容**：
//   - 区块标题："社区讨论" + 对话框装饰图标
//   - 热门话题列表，每个话题包含：
//     - 话题标题
//     - 发起人头像和昵称
//     - 回复数量和最后回复时间
//     - 话题分类标签
//   - 右侧边栏：
//     - "发起新话题"按钮
//     - 在线用户数量显示
//     - 今
// **风险提示**
// - **响应式布局**：确保在1024px画布宽度下，所有内容模块能够合理排布，避免内容溢出
// - **图片资源**：物品图标、角色头像等游戏素材需要统一尺寸规格，保持视觉一致性
// - **内容层次**：信息密度较高的区域需要合理使用间距和分组，避免视觉混乱
// - **交互反馈**：筛选、搜索等功能需要明确的状态反馈，提升用户体验

// **参考风格**
// Fandom游戏Wiki、灰机Wiki等游戏资料站点的布局和功能设计
// \`\`\`

// \`\`\`json title="星露谷物语Wiki组件选型.json"
// [
//   {
//     "namespace": "mybricks.normal-pc.antd5.custom-container"
//   },
//   {
//     "namespace": "mybricks.normal-pc.antd5.text"
//   }
// ]
// \`\`\``,
//     `基于特斯拉官网的需求，我来分析并搭建这个具有强烈科技感和未来感的页面：

// ## 总体分析
// 1. **功能定位**：展示特斯拉电动汽车产品、技术创新和品牌理念
// 2. **设计风格**：极简未来主义，黑白强对比，大量留白，突出科技感
// 3. **布局结构**：从上到下分为导航栏、英雄区域、车型展示、技术创新、充电网络、可持续发展、页脚等模块

// ## 组件选择与布局方案
// - 使用自定义容器作为主要布局组件，配置flex垂直布局
// - 导航栏采用水平布局，左中右三部分结构
// - 英雄区域使用全屏背景图片配合居中内容
// - 各功能区域采用合适的网格和卡片布局
// - 注重间距和视觉层次，体现特斯拉的极简美学

// ## 详细实现方案
// 按照从上到下的顺序，配置页面高度、布局方式，然后逐步添加各个功能模块，注重科技感的视觉效果和用户体验。

// \`\`\`json title="操作步骤.json"
// ["_root_",":root","setLayout",{"height":2400}]
// ["_root_",":root","doConfig",{"path":"root/标题","value":"分户成本确认表单"}]
// ["_root_",":root","doConfig",{"path":"root/布局","value":{"display":"flex","flexDirection":"column","alignItems":"center"}}]
// ["_root_",":root","doConfig",{"path":"root/样式","style":{"background":"#F5F5F5"}}]
// ["_root_","_rootSlot_","addChild",{"title":"表单容器","ns":"mybricks.normal-pc.antd5.form-container","comId":"u_mainForm","layout":{"width":"100%","height":"fit-content","marginLeft":16,"marginRight":16},"configs":[{"path":"表单容器/类型","value":"Form"},{"path":"表单容器/表单项布局/类型","value":"horizontal"},{"path":"表单容器/表单项布局/每行列数","value":3},{"path":"表单容器/表单项布局/列间距","value":16},{"path":"表单容器/表单项布局/尺寸","value":"middle"},{"path":"表单容器/标题/宽度类型","value":"px"},{"path":"表单容器/标题/标题宽度(px)","value":100},{"path":"表单容器/标题/显示冒号","value":true},{"path":"操作区/显示","value":false},{"path":"样式/表单/背景色","style":{"background":"#FFFFFF"}},{"path":"样式/默认/字体","style":{"fontSize":"14px","color":"#262626","lineHeight":"22px"}}]}]
// ["u_mainForm","content","addChild",{"title":"项目名称","ns":"mybricks.normal-pc.antd5.form-item-container","comId":"u_projectName","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":":parent/表单项/标题","value":"项目名称："},{"path":":parent/表单项/样式/宽度模式","value":"span"},{"path":":parent/表单项/样式/宽度配置(共24格)","value":24}]}]
// ["u_projectName","formItem","addChild",{"title":"项目名称容器","ns":"mybricks.normal-pc.antd5.custom-container","comId":"u_projectNameCont","ignore":true,"layout":{"width":"100%","height":"fit-content"},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","alignItems":"center"}}]}]
// ["u_projectNameCont","content","addChild",{"title":"项目编号链接","ns":"mybricks.normal-pc.antd5.text","comId":"u_projectCode","layout":{"width":"fit-content","height":"fit-content","marginRight":8},"configs":[{"path":"常规/内容","value":"【项目编号】"},{"path":"样式/默认/默认","style":{"fontSize":"14px","color":"#1890FF","lineHeight":"22px","cursor":"pointer"}}]}]
// ["u_projectNameCont","content","addChild",{"title":"业务类型链接","ns":"mybricks.normal-pc.antd5.text","comId":"u_businessType","layout":{"width":"fit-content","height":"fit-content","marginRight":8},"configs":[{"path":"常规/内容","value":"项目简称-业务类型"},{"path":"样式/默认/默认","style":{"fontSize":"14px","color":"#1890FF","lineHeight":"22px","cursor":"pointer"}}]}]
// ["u_projectNameCont","content","addChild",{"title":"N级关联按钮","ns":"mybricks.normal-pc.antd5.custom-button","comId":"u_relationBtn","layout":{"width":"fit-content","height":32},"configs":[{"path":"按钮/文字标题","value":"N级关联"},{"path":"样式/风格","value":"default"},{"path":"样式/默认/按钮","style":{"fontSize":"14px","borderRadius":"4px","borderColor":"#D9D9D9"}}]}]
// ["u_mainForm","content","addChild",{"title":"项目团队","ns":"mybricks.normal-pc.antd5.form-text","comId":"u_projectTeam","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":":parent/表单项/标题","value":"项目团队："},{"path":":parent/表单项/样式/宽度模式","value":"span"},{"path":":parent/表单项/样式/宽度配置(共24格)","value":24},{"path":"常规/提示内容","value":"部门-团队长团队负责（含n，n分团）"},{"path":"常规/禁用状态","value":false}]}]
// ["u_mainForm","content","addChild",{"title":"收购金额","ns":"mybricks.normal-pc.antd5.form-text","comId":"u_acquisitionAmount","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":":parent/表单项/标题","value":"收购金额："},{"path":":parent/表单项/样式/宽度模式","value":"span"},{"path":":parent/表单项/样式/宽度配置(共24格)","value":8},{"path":"常规/提示内容","value":"请输入金额"},{"path":"常规/后置标签","value":"元"}]}]
// ["u_mainForm","content","addChild",{"title":"实际出资额","ns":"mybricks.normal-pc.antd5.form-text","comId":"u_actualInvestment","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":":parent/表单项/标题","value":"*其中：实际出资额："},{"path":":parent/表单项/样式/宽度模式","value":"span"},{"path":":parent/表单项/样式/宽度配置(共24格)","value":8},{"path":"常规/提示内容","value":"请输入金额"},{"path":"常规/后置标签","value":"元"}]}]
// ["u_mainForm","content","addChild",{"title":"估值金额","ns":"mybricks.normal-pc.antd5.form-item-container","comId":"u_valuationAmount","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":":parent/表单项/标题","value":"估值金额："},{"path":":parent/表单项/样式/宽度模式","value":"span"},{"path":":parent/表单项/样式/宽度配置(共24格)","value":8}]}]
// ["u_valuationAmount","formItem","addChild",{"title":"估值金额容器","ns":"mybricks.normal-pc.antd5.custom-container","comId":"u_valuationCont","ignore":true,"layout":{"width":"100%","height":"fit-content"},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","alignItems":"center"}}]}]
// ["u_valuationCont","content","addChild",{"title":"估值金额输入框","ns":"mybricks.normal-pc.antd5.form-text","comId":"u_valuationInput","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":"常规/提示内容","value":"请输入金额"},{"path":"常规/后置标签","value":"元"}]}]
// ["u_valuationCont","content","addChild",{"title":"更新估值金额","ns":"mybricks.normal-pc.antd5.custom-container","comId":"u_updateValuation","enhance":true,"layout":{"width":"fit-content","height":"fit-content","marginLeft":8},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","alignItems":"center"}}]}]
// ["u_updateValuation","content","addChild",{"title":"更新图标","ns":"mybricks.normal-pc.antd5.icon","comId":"u_updateIcon","layout":{"width":16,"height":"fit-content","marginRight":4},"configs":[{"path":"常规/选择图标","value":"SyncOutlined"},{"path":"样式/默认/颜色","style":{"color":"#1890FF","fontSize":"16px"}}]}]
// ["u_updateValuation","content","addChild",{"title":"更新文本","ns":"mybricks.normal-pc.antd5.text","comId":"u_updateText","layout":{"width":"fit-content","height":"fit-content"},"configs":[{"path":"常规/内容","value":"更新估值金额"},{"path":"样式/默认/默认","style":{"fontSize":"14px","color":"#1890FF","lineHeight":"22px","cursor":"pointer"}}]}]
// \`\`\`
// `
//   ]
})
