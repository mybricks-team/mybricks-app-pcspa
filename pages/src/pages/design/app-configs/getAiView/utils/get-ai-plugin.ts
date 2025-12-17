import AIPlugin, { fileFormat } from '@mybricks/plugin-ai'


export default ({ requestAsStream, user, key }: any) => AIPlugin({
  requestAsStream,
  user,
  prompts: {
    canvasWidth: '1024',
    systemAppendPrompts: systemAppendPrompts(),
    prdExamplesPrompts: prdExamplesPrompts(),
    generatePageActionExamplesPrompts: generatePageActionExamplesPrompts(),
  },
  key,
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
  }
})


function systemAppendPrompts() {
  return `
<对于当前搭建有以下特殊上下文>
  <搭建画布信息>
    当前搭建画布的宽度为1024，所有元素的尺寸需要关注此信息，且尽可能自适应布局。1024只是在MyBricks搭建时的画布宽度，实际运行时可能会更宽。
    
    搭建内容必须参考PC端网站进行设计，内容必须考虑左右排列的丰富度，以及以下PC的特性
      比如:
        1. 布局需要自适应画布宽度，实际运行的电脑宽度不固定；
        2. 宽度和间距配置的时候要注意，画布只有1024，特别注意总宽度不可以超过1024；
        3. 页面可以配置backgroundColor；
    搭建风格也要尽可能贴合中国网站的设计风格；
  </搭建画布信息>

  <允许使用的图标>
  antd中的图标
  </允许使用的图标>

  <对于图片或原型>
    可能会存在明显异于UI的评论、标注信息，注意筛选后去除。
  </对于图片或原型>
</对于当前搭建有以下特殊上下文>`
}

function prdExamplesPrompts() {
  return `
<example>
  <user_query>我要搭建一个京东首页</user_query>
  <assistant_response>
  好的，我来参考京东首页的内容实现一下，以下是需求分析规格说明书和组件选型的内容：
${fileFormat({
    content: `# 概述
  首页一般包含导航栏、搜索栏、活动banner、类目导航、限时活动、个人信息、猜你喜欢等区域。

  # 总体设计规范
  - 一致性：保证各区域的圆角一致、保证字体大小合理，审视间距的配置是否过大或者过小，又或者是多个间距叠加在一起了；
  - 丰富性：电商网站要求信息量大，在每一个区域展示更多的内容，增加信息展示的密度；
  - 合理性：总共画布宽度为1024，所有元素不得超过1024像素，如果左右布局，考虑图片固定宽度，其它内容自适应；

  # 设计亮点
  - 内容丰富分成左中右三栏不对称的「核心内容」区域
  - 可以配置渐变色和阴影的AI按钮，引入注目
  - 对商品卡片的内容进行拓展，图片加价格太过单调，可以拓展成一个丰富的商品卡片，上方商品图片，下方排一个「无理由退货」「百亿补贴」等营销标签，中间左侧放置价格以及划线价，右侧放置销量，再下方提供多少人已购买字样

  我们从上到下，从左到右来分析UI

  ## 顶部导航栏
  功能：顶部导航栏，提供一些基础信息的展示（如位置信息、用户昵称），同时提供一些二级页面的快捷入口
  视觉：电商网站的导航栏不是重点区域，高度相对较小，文字内容也不大，不是重点视觉，可以延展至和页面等宽，不需要间距
    - 左侧：居左展示位置信息和用户名称
    - 右侧：居右展示购物车、我的订单等其他页面入口
  
  ## 搜索栏
  功能：吸引用户点击，作为全局搜索入口，由输入框和按钮组成
  视觉：重点区域，用红色边框高亮，但左右两侧较空，所以可以放置一些logo、一些辅助的按钮来填充
    - 左侧：居左展示京东logo
    - 中间：重点放置搜索栏
    - 右侧：放置一个引入注目的AI按钮

  ## 核心内容区
  功能：提升利用率，通过左中右三个分区，展示更多信息，吸引用户和展示信息的重点区域
  视觉：
    - 左侧：居左展示商品分类导航
    - 中间：展示活动轮播、限时抢购，秒杀等不同的促销模块，提升营销氛围
    - 右侧：居右展示个人信息卡片，包含头像、昵称以及会员信息，同时下方提供我的订单、优惠券、足迹等服务入口，用黑金氛围表示个人的尊贵感

  ## 猜你喜欢
  功能：通过标签分类 + 商品瀑布流的方式留住顾客，让顾客产生留下的冲动
  视觉：
    - 一个分类标签栏，提供了「为你推荐」「进口好物」等分类标签
    - 商品卡片的瀑布流，用列表实现一行N列的瀑布流

  # 参考风格和网站
  红色营销风格，京东、淘宝等PC站点设计`,
    fileName: 'XX页面需求文档.md'
  })}

  推荐采用以下组件进行搭建
${fileFormat({
    content: `[
{
  "namespace": "mybricks.somelib.icon"
},
{
  "namespace": "mybricks.somelib.text"
},
{
  "namespace": "mybricks.somelib.button"
}
]`,
    fileName: 'XX页面所需要的组件信息.json'
  })}
  </assistant_response>
</example>

<example>
  <user_query>开发一个大学官网</user_query>
  <assistant_response>
  好的，我来实现一个大学官网，以下是需求分析规格说明书和组件选型的内容：
${fileFormat({
    content: `# 概述
  一个大学的门户网站，这个大学网站包含了导航栏、学校介绍、历史沿革、院系设置、招生就业、学术科研、页脚等部分。

  # 总体设计规范
  - 一致性：保证各区域的圆角一致、保证字体大小合理，审视间距的配置是否过大或者过小，又或者是多个间距叠加在一起了；
  - 丰富性：官网要求信息量大，在卡片设计和其他内容展示更多的内容（例如多使用图标、带颜色文字等方式），增加信息展示的密度和层次感；
  - 合理性：总共画布宽度为1024，所有元素不得超过1024像素，如果左右布局，考虑图片固定宽度，其它内容自适应；

  # 设计亮点
  - 对学校介绍进行拓展
    - 利用双色标题，展示学校的slogan
    - 利用左右分栏的不对称布局展示更多的信息
    - 利用绝对定位绘制一些高亮标签
  - 标题+副标题增添每个区域的内容丰富度
  - 左右不对称的「科学研究」区域，增加内容利用率

  我们从上到下，从左到右来分析UI

  ## 顶部导航栏
  功能：顶部导航栏，提供一些学校logo和其他区域的导航入口。
  视觉：导航栏核心是一个总览作用，可以延展至和页面等宽，不需要间距
    - 左侧：居左展示logo和学校名称
    - 右侧：居右展示各个区域或者其他页面的入口
  注意：导航是固定定位
  
  ## 学校介绍
  功能：作为第一个看到的区域，内容必须有冲击力且能说明优势
  视觉：重点区域，同时展示slogan、简短的介绍，一个学校图片、以及一些学校的数据，比如就业率、专业数量、教学质量等信息
    - 左侧：用双色标题展示slogan，同时展示一句优势介绍，下方再用主题色的数据卡片展示亮点数据，下方提供两个带图标的按钮
    - 右侧：放置学校图片，同时可以用绝对定位绘制一些高亮标签卡片（比如科研实力top1等）
    - 背景：提供tailwindCss风格的渐变背景

  ## 历史沿革
  功能：介绍学校厚重的历史
  视觉：通过标题和副标题总结该区域，同时介绍学校历史
    - 左侧固定宽度历史图片，右侧历史总结
    - 下方再添加使用数据卡片展示学校的一些数据，比如办学历史、校园面积、教职工数量等
  数据卡片样式参考：
    - 样式1：从上往下依次展示图标、数据100年、描述文本，其中图标和100年都有特别的样式；
    - 样式2：

  ## 院系设置
  功能：介绍学校覆盖各类学科领域知识
  视觉：通过标题和副标题总结该区域，同时详细介绍下学院、王牌专业、教师数量等信息
    - 通过横向列表+卡片的形式来展示此区域
    - 卡片需要信息足够丰富，比如学院信息，是否王牌（使用高亮标签），教师和学生数量（使用图标+文字）
    - 同时提供了解更多的入口

  ## 科学研究
  功能：介绍学校浓厚的科学研究氛围和实力
  视觉：通过标题和副标题总结该区域，同时通过左右不对称的样式增加美观度
    - 左侧介绍中重点实验室、合作实验室等图片和信息
    - 右侧通过数据卡片，提供一些专利数量、论文数量、国家重点实验室等数据支持，可以通过边框来绘制带封边的卡片

  ## 页脚
  功能：展示快速导航、在线服务、联系方式、以及版权信息，同时底下提供版权信息、隐私政策和备案号等信息
  视觉：左右无间距的深色页脚，注意响应式，也可以添加几个平台的图标用于跳转其他平台账号
  
  # 参考风格和网站
  清华大学、harvard.edu等校园网站设计`,
    fileName: 'XX页面需求文档.md'
  })}

推荐采用以下组件进行搭建：
${fileFormat({
    content: `[
  {
    "namespace": "mybricks.somelib.icon"
  },
  {
    "namespace": "mybricks.somelib.text"
  },
  {
    "namespace": "mybricks.somelib.button"
  },
  {
    "namespace": "mybricks.somelib.list"
  },
  {
    "namespace": "mybricks.somelib.image"
  }
]`,
    fileName: 'XX页面所需要的组件信息.json'
  })}
  </assistant_response>
</example>`
}

function generatePageActionExamplesPrompts() {
  return `
<example>
  <user_query>搭建一个个人中心页面框架</user_query>
  <assistant_response>
    首先，必须根据页面内容设置一个合适的页面的高度。
    其次，必须对页面布局设置一个合理的布局。
    然后
    基于用户当前的选择上下文，我们来实现一个个人中心页面框架，由于是框架，所以我仅给出主体部分，思考过程如下：
    1. 搭建页面时一般用从上到下的楼层化搭建方式，我们推荐在页面最外层设置为flex的垂直布局，设置子组件的左右margin以及高度，这样好调整位置；
    2. 将页面从上到下分成顶部信息、个人信息、中间入口、底部按钮四个部分；
    3. 个人信息部分，图文编排卡片，用flex布局实现左右布局；
    4. 中间入口是竖排的入口，为了方便上下调整，我们可以使用flex布局；
    5. 底部居下固定的修改个人信息的按钮；

    ${fileFormat({
      content: `["_root_",":root","setLayout",{"height": 820}]
      ["_root_",":root","doConfig",{"path":"root/标题","value":"个人中心页面框架"}]
      ["_root_",":root","doConfig",{"path":"root/布局","value":{"display":"flex","flexDirection":"column","alignItems":"center"}}]
      ["_root_",":root","doConfig",{"path":"root/样式","style":{"background":"#F5F5F5"}}]
      ["_root_","_rootSlot_","addChild",{"title":"顶部信息","ns":"some.banner","comId":"u_top32","enhance":true,"layout":{"width":"100%","height":80,"marginTop":8,"marginLeft":12,"marginRight":12},"configs":[{"path":"常规/布局","value":{"display":"flex"}}]}]
      ["_root_","_rootSlot_","addChild",{"title":"个人信息","ns":"some.container","comId":"u_a2fer","enhance":true,"layout":{"width":"100%","height":100,"marginLeft":8,"marginRight":8},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center"}}]}]
      ["u_a2fer", "content", "addChild",{"title":"头像","ns":"some.avatar","comId":"u_avatar1","layout":{"width":64,"height":64},"configs":[]}]
      ["u_a2fer", "content", "addChild",{"title":"用户信息","ns":"some.container","comId":"u_info4","ignore":true,"layout":{"width":"fit-content","height":"fit-content"},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","alignItems":"center"}}]}]
      ["_root_","_rootSlot_","addChild",{"title":"中间入口","ns":"some.container","comId":"u_iiusd7","enhance":true,"layout":{"width":"100%","height":200,"marginLeft":8,"marginRight":8},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"column"}}]}]
      ["_root_","_rootSlot_","addChild",{"title":"底部固定按钮","comId":"u_btm21","enhance":true,"ns":"some.container","layout":{"width":"100%","height":84,"position":"fixed","bottom":0,"left":0},"configs":[{"path":"常规/布局","value":{"display":"flex"}}]}]`,
      fileName: '生成个人中心页面操作步骤.json'
    })}

    注意：
    - 用户信息布局组件父组件为布局组件，且仅承担布局功能，不承担样式、点击功能，我们添加ignore标记来优化。
    - 顶部信息、个人信息区域、中间入口、底部固定按钮的flex容器组件属于图文信息卡片，我们添加了enhance标记，优化flex布局的体验。
  </assistant_response>
</example>

<example>
  <user_query>搭建一个云服务器管理中后台页面</user_query>
  <assistant_response>
    基于用户当前的需求，我们来实现一个云服务器管理中后台页面，思考过程如下：

    分析下布局，这是一个经典的顶部导航+中间内容（左侧菜单 + 右侧内容）+ 底部页脚的中后台页面。
    必须先确认_root_的情况，必须先配置 页面高度 和 设置布局为垂直布局，然后开始搭建。
    
    首先，用一个左右布局的容器，完成顶部导航的左右部分内容；
    然后是中间内容，这是一个典型的左侧固定宽度菜单 + 右侧自适应内容的布局，我们用直接用容器来实现
      - 添加一个垂直的容器布局，注意图片上内容有左右和上下的间距，配置margin；
      - 添加左侧菜单部分，使用一个固定宽度的容器，配置合理的marginRight间距；
        - 添加左侧内容...
      - 添加右侧内容部分，使用一个自适应宽度（width=100%）的容器；
        - 添加右侧内容...
    最后是底部页脚，配置一个纯色背景，同时添加一个居中的容器来放置各类页脚内容，包含（产品和定价、支持与服务、文档与社区、关注我们等等）。

    \`\`\`json file="actions.json"
    ["_root_",":root","setLayout",{"height": 1600}]
    ["_root_",":root","doConfig",{"path":"root/布局","value":{"display":"flex", "flexDirection": "column"}}]
    ["_root_",":root","doConfig",{"path":"root/样式","style":{"background":"#f5f5f5"}}]
    ["_root_","_rootSlot_","addChild",{"title":"顶部导航","ns":"some.container","comId":"u_header","enhance": true,"layout":{"width":"100%","height":64},"configs":[{"path":"常规/布局","value":{"display":"flex", "justifyContent": "space-between", "alignItems": "center"}}]}]
    ["u_header","content","addChild",{"title":"左侧Logo容器","ns":"some.container","comId":"u_logo_cont","enhance": true,"layout":{"width":160,"height":"fit-content","marginLeft":12},"configs":[{"path":"常规/布局","value":{"display":"flex", "alignItems": "center"}}]}]
    ["u_logo_cont","content","addChild",{"title":"Logo","ns":"some.image","comId":"u_logo","layout":{"width":32,"height":32},"configs":[]}]
    ["u_header","content","addChild",{"title":"右侧内容","ns":"some.container","comId":"u_header_right","layout":{"width":"fit-content","height":"fit-content","marginRight":12},"configs":[]}]
    ["_root_","_rootSlot_","addChild",{"title":"中间内容","ns":"some.container","comId":"u_main","layout":{"width":"100%","height":1452,"marginTop":12,"marginBottom":12},"configs":[{"path":"常规/布局","value":{"display":"flex"}}]}]
    ...TODO...
    ["u_main","content","addChild",{"title":"左侧菜单","ns":"some.container","comId":"u_sidebar","layout":{"width":200,"height":"fit-content","marginRight":12},"configs":[{"path":"常规/布局","value":{"display":"flex", "flexDirection": "column"}}]}]
    ["u_main","content","addChild",{"title":"右侧内容","ns":"some.container","comId":"u_content","layout":{"width":"100%","height":"fit-content"},"configs":[{"path":"常规/布局","value":{"display":"flex", "flexDirection": "column"}}]}]
    ["_root_","_rootSlot_","addChild",{"title":"底部页脚","ns":"some.container","comId":"u_footer","enhance": true,"layout":{"width":"100%","height":80,"backgroundColor":"#222222"},"configs":[{"path":"常规/布局","value":{"display":"flex", "justifyContent": "center", "alignItems": "center"}}]}]
    ...TODO...
    \`\`\`
  
    在上述内容中：
    我们遵循了以下关键事项：
    流程：从「根组件高度和布局配置」-> 从上往下分区开始搭建内容 -> 。
    特别注意点：
      - 在中间内容中的布局中，右侧内容使用了自适应内容宽度的布局，宽度设置为100%，左侧固定，完成了自适应页面宽度的要求；
      - 「左侧菜单」和「右侧内容」，使用了关键性的自适应宽度，我们不能打上ignore标记，「左侧Logo容器」很有可能也会有点击时间，不能打上ignore标记；
      - 「顶部导航」、「左侧Logo容器」、「底部页脚」为信息展示的flex布局，且没有ignore标记，可以打上enhance标记；
      
  </assistant_response>
</example>

<example>
  <user_query>添加一个一行三列的导航</user_query>
  <assistant_response>
    好的，一行三列的导航考察的是我们布局的关键知识，一行三列，就是均分布局，均分我们一般选择使用flex布局。
    所以提供一个flex容器，确定子组件的宽度，并将内容平铺上去。
    
    首先，必须根据页面内容设置一个合适的页面的高度。
    其次，必须对页面布局设置一个合理的布局。
    
    ${fileFormat({
      content: `["_root_",":root","setLayout",{"height": 360}]
      ["_root_",":root","doConfig",{"path":"root/标题","value":"一行三列的导航"}]
      ["_root_",":root","doConfig",{"path":"root/布局","value":{"display":"flex","flexDirection":"column","alignItems":"center"}}]
      ["_root_","_rootSlot_","addChild",{"title":"Flex容器","ns":"some.container","comId":"u_iiusd7","enhance": true,"layout":{"width":"100%","height":200,"marginLeft":8,"marginRight":8},"configs":[{"path":"常规/布局","value":{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap"}}]}]
      ["u_iiusd7","content","addChild",{"title":"导航1","ns":"some.icon","comId":"u_icon1","layout":{"width":120,"height":120,"marginTop":8},"configs":[{"path":"样式/文本","style":{"background":"#0000FF"}}]}]`,
      fileName: '一行三列导航操作步骤.json'
    })}

  注意：
    - 这个Flex容器是根组件的直接子组件，并且很有可能后续提供点击事件，所以不允许添加ignore标记，同时他属于图文展示，可以添加enhance标记。
  </assistant_response>
</example>`
}