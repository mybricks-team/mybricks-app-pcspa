// import { getNewDSL as genGetNewDsl, getDSLPrompts as genGetDslPrompts, getSystemPrompts as genGetSystemPrompts, DslHelper, Services } from '/Users/cocolbell/Desktop/projects/mybricks/sdk-for-ai/dist/index.umd'
import { getNewDSL as genGetNewDsl, getDSLPrompts as genGetDslPrompts, getSystemPrompts as genGetSystemPrompts, DslHelper, Services } from '@mybricks/ai-utils'

const { checkValueType, getValidSlotStyle, getValidSizeValue, transformToValidBackground } = DslHelper

const getNewDSL = (params) => {
  const { designerRef } = params;
  let gridComponentNamespace = "";
  let customContainerComponentNamespace = "";
  return genGetNewDsl({
    flex: (component) => {
      if (!gridComponentNamespace) {
        const allComDef = designerRef.current.components.getAllComDef()
        const keys = Object.keys(allComDef)

        if (keys.find((key) => key.startsWith("mybricks.basic-comlib.antd5"))) {
          gridComponentNamespace = "mybricks.basic-comlib.antd5.grid"
        } else {
          gridComponentNamespace = "mybricks.basic-comlib.grid"
        }

        if (keys.find((key) => key.startsWith("mybricks.normal-pc.antd5"))) {
          customContainerComponentNamespace = "mybricks.normal-pc.antd5.custom-container"
        } else {
          customContainerComponentNamespace = "mybricks.normal-pc.custom-container"
        }
      }

      if (component?.style?.styleAry) {
        component?.style?.styleAry?.forEach?.(item => {
          if (!item.css) {
            item.css = {}
          }
          // [TODO] 幻觉处理
          if (item.css.margin) {
            delete item.css.margin
          }
        })
      }
  
      // 处理幻觉
      if (component.style?.paddingLeft) {
        component.style.marginLeft = component.style?.paddingLeft
        delete component.style?.paddingLeft
      }
      if (component.style?.paddingRight) {
        component.style.marginRight = component.style?.paddingRight
        delete component.style?.paddingRight
      }
  
      // 处理绝对定位兼容
      const rootStyle = component?.style?.styleAry?.find?.(s => s.selector === ':root')?.css
      if (rootStyle?.position === 'absolute') {
        component.style.position = rootStyle.position;
  
        if (rootStyle.left) {
          component.style.left = rootStyle.left
          delete rootStyle.left
        }
        if (rootStyle.right) {
          component.style.right = rootStyle.right
          delete rootStyle.right
        }
        if (rootStyle.top) {
          component.style.top = rootStyle.top
          delete rootStyle.top
        }
        if (rootStyle.bottom) {
          component.style.bottom = rootStyle.bottom
          delete rootStyle.bottom
        }
  
        delete rootStyle.position
      }
  
      const shouldTransformToGrid = component.style?.flexDirection === 'row' && component?.comAry?.some(com => {
        return !!com.style.flex || (checkValueType(com.style?.width) === 'percentage' && com.style?.width !== '100%')
      })
  
      if (shouldTransformToGrid) {
        const { justifyContent = 'flex-start', alignItems = 'flex-start', columnGap = 0 } = component.style ?? {};
        component.namespace = gridComponentNamespace
  
        const heightProps = {
          height: '100%',
          mode: 'auto'
        }
        switch (true) {
          case component.style?.height === 'fit-content': {
            delete heightProps.height;
            heightProps.mode = 'auto';
            break
          }
        }
  
        component.data = {
          rows: [
            {
              cols: component?.comAry?.map((com, index) => {
                const comStyle = com.layout ?? com.style
  
                const base: any = {
                  key: `col${index}`,
                  isDragging: false,
                  isHover: false,
                  slotStyle: getValidSlotStyle(),
                  style: {
                    height: comStyle?.height || 'auto'
                  }
                }
  
                const widthType = checkValueType(getValidSizeValue(comStyle?.width))
  
                switch (true) {
                  case comStyle?.flex === 1: {
                    base.width = 50
                    base.widthMode = 'auto'
                    break
                  }
                  case comStyle?.width === undefined || comStyle.width === null: {
                    base.width = 50
                    base.widthMode = 'fit-content'
                    break
                  }
                  case comStyle?.width === 'fit-content': {
                    base.width = 50
                    base.widthMode = 'fit-content'
                    break
                  }
                  case widthType === 'percentage': {
                    base.width = parseFloat(getValidSizeValue(comStyle?.width) as any)
                    base.widthMode = '%'
                    break
                  }
                  case widthType === 'number': {
                    base.width = getValidSizeValue(comStyle?.width)
                    base.widthMode = 'px'
                    break
                  }
                }
  
                delete comStyle?.flex;
  
                return base
              }),
              key: 'row0',
              ...heightProps,
              style: {
                justifyContent,
                alignItems,
                columnGap
              }
            }
          ]
        }
        component?.comAry?.forEach((com, index) => {
          if (!component.slots) {
            component.slots = {}
          }
          component.slots[`col${index}`] = {
            id: `col${index}`,
            title: `列${index}`,
            comAry: [com],
            style: {
              width: '100%',
              height: com.style?.height
            }
          }
          com.style.width = '100%'
        })
        component.comAry = undefined
        delete component.comAry
  
        return
      }
  
      // 处理textAlign幻觉
      if (rootStyle?.textAlign) {
        if (component.style?.flexDirection === 'column') {
          component.style.alignItems = 'center'
        }
        if (component.style?.flexDirection === 'row') {
          component.style.justifyContent = 'center'
        }
      }
  
      if (component.style?.flexDirection === 'column' || component.style?.flexDirection === 'row') {
        component.namespace = customContainerComponentNamespace
        if (!component.data) {
          component.data = {}
        }
  
        let slotWidth = getValidSizeValue(component.style?.width, '100%')
        if (checkValueType(slotWidth) === 'number') {
          slotWidth = '100%'
        }
  
        let slotHeight = getValidSizeValue(component.style?.height, 'auto')
        if (checkValueType(slotHeight) === 'number') {
          slotHeight = '100%'
        }
  
        component.data.slotStyle = getValidSlotStyle(component.style)
        component.slots = {
          content: {
            id: 'content',
            title: component.title ? `${component.title}插槽` : '内容',
            style: {
              width: slotWidth,
              height: slotHeight,
              flexDirection: component.style.flexDirection,
              layout: `flex-${component.style.flexDirection}`,
              justifyContent: component.data.slotStyle.justifyContent,
              alignItems: component.data.slotStyle.alignItems,
            },
            comAry: component?.comAry
          }
        }
        component.comAry = undefined
        component.style = {
          ...(component.style ?? {}),
          width: getValidSizeValue(component.style?.width, 'fit-content'),
          height: getValidSizeValue(component.style?.height, 'auto'),
        }
        delete component.comAry
  
        return
      }
    },
  })
}

const getSystemPrompts = genGetSystemPrompts({
  title: "京东购物PC网站",
  pages: [
    {
      title: "首页",
      prd: `#### （1）顶部导航栏
      - **功能**：提供平台基础功能快捷入口，如购物车、我的订单、企业采购等；展示用户账号信息（含PLUS会员标识 ）；支持语言/模式切换（如网站无障碍模式 ）。
      - **视觉**：简洁清晰，与平台整体风格统一，突出关键功能入口，PLUS会员标识等做差异化显示 。

      #### （2）搜索栏区域
      - **功能**：支持商品关键词搜索，提供搜索历史、热门搜索词推荐；“京东AI”按钮可唤起智能搜索/推荐辅助功能 。
      - **视觉**：搜索框占据显眼位置，按钮样式突出，与整体风格协调 。

      #### （3）左侧分类导航
      - **功能**：梳理平台商品分类，如家用电器、手机数码、服饰美妆等，快速引导用户找到商品类目；展示特色业务（如京东新品专属推广位 ）。
      - **视觉**：分类层级清晰，文字简洁，搭配简洁图标（可选 ），侧边栏固定，方便用户随时操作 。

      #### （4）中间核心内容区
      - **轮播图/营销banner**
          - **功能**：展示平台大促活动、热门业务、重点推荐商品等营销内容，吸引用户关注 。
          - **视觉**：画面清晰、色彩鲜艳，突出营销重点信息 。
      - **业务模块区**
          - 涵盖“京选好物”“企业会员权益”“京东直播”“京东秒杀”“国家补贴×百亿补贴”等板块，分别展示对应业务的商品、权益、活动内容 。
          - **视觉**：模块布局规整，区分明显，通过标题、样式突出业务特色 。
      - **推荐商品区**
          - 包含“为你推荐”“潮电好物”“居家优品”等个性化推荐板块，基于用户行为数据展示商品 。
          - **视觉**：商品排版整齐，图片清晰，价格、标题等信息展示明确 。

      #### （5）右侧个人及功能快捷栏
      - **功能**：展示用户账号基本信息（含PLUS会员权益 ）、订单状态快捷入口（待付款等 ）、功能快捷按钮（购物车、我的、客服、反馈 ）；呈现浏览记录、收藏等信息 。
      - **视觉**：布局紧凑，突出个人相关信息与快捷操作，样式与整体风格统一 。
      `
    },
    {
      title: "购物车",
      prd: `1. **顶部区域**：展示京东logo、搜索栏（可快捷搜索商品） ，及用户相关入口（我的订单、我的京东等） ，与京东PC站全局导航保持一致，强化品牌与用户便捷访问路径。 
2. **商品筛选与分类区**：提供“全选”“自营”等筛选按钮，支持按商品属性（如自营/第三方）快速筛选；展示“全部商品”分类及数量统计，清晰呈现购物车商品结构。 
3. **商品列表区**：以列表形式展示商品，包含商品勾选框、商品信息（名称、规格、套装组成等）、单价、数量、操作（删除、移入关注等） ，布局规整，信息层级清晰，方便用户快速浏览与操作。 
4. **营销与结算区**：显示营销信息（如降价提醒） 、已选商品统计、总价，及“去结算”按钮，突出结算引导，结合优惠信息刺激下单。 
5. **猜你喜欢区**：在购物车底部或侧边，基于用户行为推荐商品，拓展消费场景，提升平台GMV 。 `
    },
    {
      title: "订单",
      prd: `## 一、头部导航模块
- **功能**：承载品牌标识展示（京东 logo、“我的京东” 标识 ）、全局跳转（返回京东首页 ）、通用工具（搜索框用于站内商品/订单搜索、购物车入口便捷查看购物车内容 ），是连接京东 PC 站全局与订单页的枢纽，帮助用户快速切换核心场景 。 

## 二、左侧导航栏模块
- **功能**：对用户在 “我的京东” 下的核心功能进行分类聚合，涵盖订单管理（订单中心：我的订单、评价晒单等 ，满足订单全流程操作需求 ）、关注管理（关注中心：关注商品、店铺、活动 ，沉淀用户关注内容，便于二次触达 ）、资产管理（资产中心：小金库、京东白条、领货码等 ，集中管理金融及权益类资产 ）、特色业务（特色业务：企业租赁、我的营业厅等 ，拓展业务场景，服务企业及多元需求用户 ） 。 
## 三、订单状态筛选模块
- **功能**：提供订单状态维度的筛选能力，包含 “全部订单、待付款、待收货/使用、待评价、订单回收站” 标签切换，以及商品/订单号搜索、高级筛选（如时间、金额区间 ），支持用户按不同订单进度、精准条件快速定位订单 。 

## 四、订单列表展示模块
- **功能**：以条目形式呈现订单核心信息，包括下单时间、订单号、商品信息（图 + 名称 + 规格 ）、收货人、金额与支付方式、订单状态，同时配套操作入口（查看发票、订单详情 ），是订单信息与操作的载体 。 

## 五、订单操作模块
- **功能**：围绕订单提供深度操作能力，“订单详情” 跳转/弹窗展示完整订单链路信息（商品、地址、物流、支付 ）；“查看发票” 关联发票管理页，支持发票信息查看与电子票下载；订单删除/回收功能，支持订单清理与误删恢复，覆盖订单全生命周期管理需求 。 

## 六、分页功能模块
- **功能**：对多页订单数据进行切分，通过 “上一页、页码、下一页” 控件，支持用户翻页浏览不同页订单，控制单页订单展示数量，保障页面加载与浏览体验 。`
    },
  ],
  style: `网页的设计要富有美感，关注设计元素间距，圆角，字体大小，图片配合等，网页的纵向排列应包含尽可能多的功能模块
  一个偏向活力的京东红风格是一个不错的选择
  颜色
    主题色：#e93b3d
    次要色：#333
    背景色：#f5f5f5
  字体
    标题：bold 16px
    正文：14px
  边框
    圆角：4px
    阴影：0 2px 8px rgba(0,0,0,0.1)
  
  你也可以任意发挥，但是尽量遵循需求，如果要求模仿某个网站，一定要以该网站主题主题、排版布局为准。
  通常可以参考一些比较出名的网站，不限于风格，比如京东、淘宝、特斯拉等网站的元素设计。`
})

const getDSLPrompts = genGetDslPrompts({
  dslDemoPrompts: `
  page.dsl文件代表一个PC网站的其中一个页面，不局限于简单的demo，应该尽量的复杂，尽可能多的ui和交互，禁止过于简约。
  网页的设计要注重美观度，有设计感，关注设计元素间距，圆角，字体大小，图片配合等。

  如下为一个卡片中有一个文本：
  \`\`\`dsl file="page.dsl"
  <page title="你好世界" style={{backgroundColor: "#fff"}}>
    <card.component.namespace
      title="卡片"
      layout={{ width: '100%', height: 'fit-content' }}
      data={{"title":"卡片","useExtra":false,"bordered":true,"hoverable":false,"cursor":false,"size":"default","style":{},"bodyStyle":{},"outputContent":0,"dataType":"number","borderStyle":{"borderRadius":"8px 8px 8px 8px","borderColor":"#F0F0F0 #F0F0F0 #F0F0F0 #F0F0F0","borderWidth":"1px 1px 1px 1px","borderStyle":"solid solid solid solid"},"isAction":false,"items":[{"key":"key1","name":"操作项1"}],"padding":"24px","isHeight":false,"height":"80px","showTitle":true,"slotStyle":{"display":"flex","position":"inherit","flexDirection":"column","alignItems":"flex-start","justifyContent":"flex-start","flexWrap":"nowrap","rowGap":0,"columnGap":0}}}
    >
      <slots.body title="卡片内容" layout={{ width: '100%', height: '100%', "justifyContent":"flex-start","alignItems":"flex-start","layout":"flex-column" }}>
        <text.component.namespace
          title="文本"
          layout={{ width: 'fit-content' }}
          data={{"content":"文字","outputContent":"","align":"left","isEllipsis":false,"ellipsis":{"rows":1},"style":{},"useDynamicStyle":false,"useHoverStyle":true,"legacyConfigStyle":{}}}
        />
      </slots.body>
    </card.component.namespace>
  </page>
  \`\`\`
  注意：
  上述用到的“card.component.namespace”表达的是使用card组件的namesapce，如果包含多个card组件，优先选择namespace中包含antd5的组件namespace
  上述用到的“text.component.namespace”以及可能的其它组件均同上述card组件同理。
  “page”为特殊画布节点，不需要选择建议组件的namespace，直接使用“page”即可。
  “flex”组件为特殊组件，不需要选择建议组件的namespace，直接使用“flex”即可。
  上述只是一个简单的demo，注意生成PC页面时内容一定要足够丰富。
  更多用法关注组件使用建议，严格按照组件的文档提示来使用。
  网页的纵向排列应包含尽可能多的功能模块。

  建议：
    1. 电商网站可以参考淘宝、京东、Amazon、eBay、Walmart、Rakuten
    2. 门户网站可以参考Yahoo、Microsoft Service Network、Facebook、X、Twitter
    3. 给使用的组件都设置上主题色
  必须遵循：
    1. 必须包含尽可能多的元素，文字需求至少添加8个及以上UI层面的功能模块，搭建更多的内容。
    2. 优先使用图片组件，除非是工具类图标。
    3. 一个页面的需求分析规格说明书(prd.md)，至少包含8个及以上UI层面的功能模块，搭建更多的内容。
    4. 禁止超出3张页面
  `,
  canvasInfoPrompts: `
  由于我们都是PC端组件和PC端页面，所以需要遵循一些以下PC端规范。
  最多只能生成3张页面
  网页的纵向排列应包含尽可能多的功能模块。
  搭建内容必须丰富（元素足够多），必须检索你所了解的PC网站，学习PC网站设计、风格，并思考，将简单的一句话需求，转换为更复杂的场景，发挥你的想象。
  当前搭建画布宽度为1024，所有元素的尺寸都需要关注此信息，且尽可能自适应布局，1024只是在MyBricks搭建时的画布宽度，实际运行时可能会更宽，所以元素内容可以尽可能丰富。
  搭建内容必须参考PC端网站进行设计。
    比如:
      1. page下方的元素考虑是否需要配置宽度100%且配置左右margin，效果更好；
      2. 布局需要自适应画布宽度；
      3. 页面可以配置backgroundColor
  
  建议：
    1. 电商网站可以参考淘宝、京东、Amazon、eBay、Walmart、Rakuten
    2. 门户网站可以参考Yahoo、Microsoft Service Network、Facebook、X、Twitter、新浪网
  必须遵循：
    1. 必须包含尽可能多的元素，文字需求至少添加8个及以上UI层面的功能模块，搭建更多的内容。
    2. 优先使用图片组件，除非是工具类图标。
    3. 一个页面的需求分析规格说明书(prd.md)，至少包含8个及以上UI层面的功能模块，搭建更多的内容。
    4. 禁止超出3张页面
  `,
  // 特殊地，系统已经内置了底部导航栏和顶部导航栏，仅关注页面内容即可，不用实现此部分内容。
  componentSuggestionPrompts: `
  1. 基础布局必须使用“flex”组件，禁止使用容器、布局类组件；
  2. 文本、图片、按钮组件属于基础组件，任何情况下都可以优先使用，即使不在允许使用的组件里；
  3. 关于图片和图标
    3.1 如果是常规图片，使用https://ai.mybricks.world/image-search?term=dog&w=100&h=200，其中term代表搜索词，w和h可以配置图片宽高；
    3.2 如果是图标和Logo，可以使用https://placehold.co来配置一个带文本和颜色的图标，其中text需要为图标的英文搜索词，禁止使用emoji或者特殊符号；
  4. 尽可能使用margin替代padding，多注意组件是否需要配置margin，如果是横向布局，组件间的间距必须使用右侧组件的左间距，如果是横向布局，必须使用下侧组件的上间距；
  5. 仔细检查是否需要用到绝对定义，是相对于父元素的；
  6. page下方的元素注意配置左右margin；
  7. 优先使用图片组件，除非是工具类图标。
  8. 所有使用的组件必须有自定义的data数据源；
  9. 如果组件没有明确说明slots内可以不包含内容，每个slots里必须包含子组件
  10. 给所有使用到的组件设置主题色
  11. 所有组件都必须使用适应高度（layout={height:'fit-content'}），除非组件必须或建议固定高度
  12. 所有slots.xxx插槽必须默认设置为纵向排版（layout={{ width: '100%', height: '100%', "justifyContent":"flex-start","alignItems":"flex-start","layout":"flex-column" }}）
  `,
})

export const getExamplePrompts = () => {
  return `
  <example>
    <user_query>搭建一个书籍检索页面</user_query>
    <assistant_response>
    \`\`\`dsl file="page.dsl"
      <page title="书籍检索页面">
        <form-container.component.namespace
          title="查询表单"
          layout={{ width: '100%' }}
          data={{"layoutType":"Form","span":8,"items":[{"id":"u_wcnJM","comName":"u_3Vkb8","schema":{"type":"string"},"name":"bookName","label":"书籍名称","widthOption":"span","span":12,"colon":"default","labelWidthType":"default","hiddenLabel":false,"visible":true,"hidden":false,"tooltip":"请输入书籍名称"}],"additionalItems":[],"nameCount":1,"formItemColumn":2,"enable24Grid":true,"ellipseMode":"default","expandText":"展开","collapsedText":"收起","actions":{"visible":true,"widthOption":"flexFull","span":12,"align":"right","items":[{"title":"查询","type":"primary","isDefault":true,"visible":true,"outputId":"onClickSubmit","key":"submit","useDynamicDisabled":false,"useDynamicHidden":false,"disabled":false,"useIcon":false,"iconDistance":8,"icon":"HomeOutlined","iconLocation":"front"}]},"isFormItem":false,"wrapperCol":24,"labelWidthType":"px","labelWidth":98,"labelCol":4,"itemWidthType":"flex","paramsSchema":{},"submitHiddenFields":false,"validateHiddenFields":true,"config":{"colon":true,"layout":"inline","disabled":false,"size":"middle"},"domainModel":{"type":""},"mobileConfig":{"enableWidthAdaptive":true},"defaultCollapsed":true,"columnGap":0}}
        >
          <slots.content title="表单内容" layout={{ width: '100%', height: '100%' }}>
            <form-tex.component.namespace
              title="书籍名称"
              layout={{ width: '100%' }}
              data={{"visible":true,"rules":[],"validateTrigger":["onBlur","onPressEnter"],"config":{"allowClear":true,"placeholder":"请输入内容","disabled":false,"addonBefore":"","addonAfter":"","showCount":false,"maxLength":-1,"size":"middle"},"src":false,"innerIcon":"HomeOutlined","isEditable":true,"preSrc":false,"preInnerIcon":"HomeOutlined","setAutoFocus":false}}
            />
          </slots.content>
        </form-container.component.namespace>
        <table.component.namespace
          title="书籍表格"
          layout={{ width: '100%', height: 'fit-content' }}
          styleAry={[{"selector":".summaryCellTitle","css":{"textAlign":"center"}},{"selector":".summaryCellContent","css":{"textAlign":"center"}},{"selector":"tfoot.ant-table-summary>.summaryRow:hover","css":{"background":"#f5f7f9"}}]}
          data={{"rowKey":"id","dataSource":[],"columns":[{"title":"ID","key":"rowKey","width":"auto","visible":false,"contentType":"text","_id":"p24POF","dataIndex":"id","isRowKey":true},{"title":"书名","key":"u_trxz63","width":"auto","visible":true,"contentType":"text","_id":"p5KBRu","dataIndex":"bookName","keepDataIndex":true,"filter":{"filterIconInherit":true},"sorter":{"enable":false,"type":"size"},"isRowKey":false},{"title":"作者","key":"u_dddx68","width":"auto","visible":true,"contentType":"text","_id":"rVBDTw","dataIndex":"auther","keepDataIndex":true,"filter":{"filterIconInherit":true},"sorter":{"enable":false,"type":"size"},"isRowKey":false},{"title":"操作","key":"u_5yb5sr","width":"auto","visible":true,"contentType":"slotItem","_id":"GGaXOa","dataIndex":"action","keepDataIndex":true,"filter":{"filterIconInherit":true},"sorter":{"enable":false,"type":"size"},"isRowKey":false,"slotId":"u_21di73"}],"fixedHeader":false,"enableStripe":false,"headStyle":{"color":"#1f1f1f","background":"#f5f7f9"},"contentStyle":{},"scroll":{"y":"","scrollToFirstRowOnChange":true},"bordered":false,"size":"middle","useRowSelection":false,"enableRowClickSelection":false,"rowSelectionMessage":"已选中 { count } 项","rowSelectionPostion":["top","bottom"],"useLoading":true,"tableLayout":"fixed","loadingTip":"","usePagination":false,"paginationConfig":{"total":20,"text":"共 {total} 条结果","current":1,"currentPage":{"pageNum":1,"pageSize":10},"isDynamic":false,"disabled":false,"defaultPageSize":10,"align":"flex-end","size":"default","showSizeChanger":false,"pageSizeOptions":["10","20","50","100"],"showQuickJumper":false,"hideOnSinglePage":false,"useDynamicTitle":false},"domainModel":{},"useSummaryColumn":false,"summaryColumnTitle":"合计","summaryCellTitleCol":1,"summaryColumnContentType":"text","summaryColumnContentSchema":{"type":"string"},"mergeCheckboxColumn":false,"isEmpty":false,"description":"暂无数据","enableOnRow":false,"onRowScript":"","lazyLoad":false,"filterIconDefault":"FilterFilled","hasUpdateRowKey":1}}
        >
          <slots.u_21di73 title="操作-列" layout={{ width: '100%', height: '100%' }}>
            <button.component.namespace
              title="查看详情按钮"
              layout={{ width: 'fit-content', height: 'fit-content' }}
              data={{"asMapArea":false,"text":"详情","dataType":"number","outVal":0,"inVal":"","useIcon":false,"isCustom":false,"icon":"HomeOutlined","size":"small","type":"link","shape":"default","src":"","showText":true,"iconLocation":"front","iconDistance":8,"contentSize":[14,14]}}
            />
          </slots.u_21di73>
        </table.component.namespace>
      </page>
    \`\`\`
    </assistant_response>
  </example>
  `
}

const getAvailable = Services.getAvailable

export default {
  getAvailable,
  getNewDSL,
  getDSLPrompts,
  getSystemPrompts,
  getExamplePrompts
}