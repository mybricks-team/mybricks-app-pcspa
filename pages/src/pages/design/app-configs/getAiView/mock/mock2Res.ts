export default `M:好的，我将根据知识库中的组件为您搭建一个现代化的大学官网。

## 1. 总体分析

**功能确定：**
- 展示学校形象与实力的权威官网
- 包含导航、Banner、学校介绍、历史沿革、院系设置、学术科研、页脚等完整模块

**UI设计原则：**
- 采用学术蓝色调，体现专业权威感
- 模块化卡片布局，信息层次清晰
- 响应式设计，适配1024画布宽度

## 2. 组件选择与布局方案

**整体布局：** 采用垂直布局，从上到下依次展示各模块
**核心组件：**
- 导航栏：menu组件 + 图片Logo + 文本
- Banner：大图背景 + 标题文本
- 数据展示：图标 + 文本组合
- 历史沿革：timeline组件
- 院系展示：list-new组件，卡片式布局
- 学术科研：图文结合展示

## 3. 详细组件分析

**导航栏：**
- 标题：北京理工大学官网
- 布局：水平排列，左侧Logo+校名，右侧导航菜单
- 样式：深蓝色背景，白色文字

**Banner区域：**
- 大图：校园风光图片
- 标题：学校Slogan文本
- 数据：图标+数字展示办学实力

**其他模块：**
- 历史沿革：时间轴展示发展历程
- 院系设置：网格卡片布局
- 学术科研：左右图文布局

## 4. 页面DSL文件

\`\`\`dsl file="page.dsl"
<page title="北京理工大学官网" style={{backgroundColor: "#f8f9fa"}}>
  
  <!-- 顶部导航栏 -->
  <flex row title="导航栏" layout={{width: '100%', height: 80, alignItems: 'center', justifyContent: 'space-between'}} styleAry={[{selector: ':root', css: {backgroundColor: '#1e3a8a', padding: '0 40px'}}]}>
    <flex row title="Logo区域" layout={{alignItems: 'center'}}>
      <mybricks.normal-pc.antd5.single-image
        title="学校Logo"
        layout={{width: 60, height: 60, marginRight: 16}}
        data={{src: "https://placehold.co/60x60/1e3a8a/ffffff?text=BIT"}}
      />
      <mybricks.normal-pc.antd5.text
        title="学校名称"
        layout={{width: 'fit-content'}}
        data={{content: "北京理工大学", align: "left"}}
        styleAry={[{selector: '[data-item-type="root"]', css: {color: '#ffffff', fontSize: '24px', fontWeight: 'bold'}}]}
      />
    </flex>
    <mybricks.normal-pc.antd5.menu
      title="主导航"
      layout={{width: 'fit-content'}}
      data={{
        mode: "horizontal",
        dataSource: [
          {key: "overview", title: "学校概况", defaultActive: true},
          {key: "departments", title: "院系设置"},
          {key: "research", title: "学术科研"},
          {key: "admission", title: "招生就业"},
          {key: "campus", title: "校园文化"},
          {key: "news", title: "新闻动态"}
        ]
      }}
      styleAry={[
        {selector: 'ul.ant-menu', css: {backgroundColor: 'transparent', borderBottom: 'none'}},
        {selector: 'ul li:not(.ant-menu-item-selected)', css: {color: '#ffffff', fontSize: '16px'}},
        {selector: 'ul li.ant-menu-item-selected', css: {color: '#60a5fa', fontSize: '16px'}},
        {selector: 'ul li.ant-menu-item-selected:after', css: {borderColor: '#60a5fa'}}
      ]}
    />
  </flex>

  <!-- Banner区域 -->
  <flex column title="Banner区域" layout={{width: '100%', height: 500, justifyContent: 'center', alignItems: 'center', position: 'relative'}}>
    <mybricks.normal-pc.antd5.single-image
      title="校园背景"
      layout={{width: '100%', height: 500, position: 'absolute', top: 0, left: 0}}
      data={{src: "https://ai.mybricks.world/image-search?term=university campus&w=1024&h=500", objectFit: "cover"}}
    />
    <flex column title="Banner内容" layout={{alignItems: 'center', position: 'absolute'}}>
      <mybricks.normal-pc.antd5.text
        title="学校标语"
        layout={{width: 'fit-content', marginBottom: 20}}
        data={{content: "德以明理 学以精工", align: "center"}}
        styleAry={[{selector: '[data-item-type="root"]', css: {color: '#ffffff', fontSize: '48px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}]}
      />
      <mybricks.normal-pc.antd5.text
        title="学校简介"
        layout={{width: 'fit-content'}}
        data={{content: "培养胸怀壮志、明德精工、创新包容、时代担当的领军领导人才", align: "center"}}
        styleAry={[{selector: '[data-item-type="root"]', css: {color: '#ffffff', fontSize: '20px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}]}
      />
    </flex>
  </flex>

  <!-- 学校数据展示 -->
  <flex column title="学校数据" layout={{width: '100%', alignItems: 'center', marginTop: 80, marginBottom: 80}}>
    <mybricks.normal-pc.antd5.text
      title="数据标题"
      layout={{width: 'fit-content', marginBottom: 40}}
      data={{content: "办学实力", align: "center"}}
      styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '32px', fontWeight: 'bold'}}]}
    />
    <flex row title="数据展示" layout={{width: '100%', justifyContent: 'center', alignItems: 'center'}}>
      <flex column title="数据项1" layout={{alignItems: 'center', marginRight: 80}}>
        <mybricks.normal-pc.antd5.icon
          title="学科图标"
          layout={{width: 48, height: 48, marginBottom: 12}}
          data={{icon: "BookOutlined"}}
          styleAry={[{selector: '.icon', css: {color: '#1e3a8a', fontSize: '48px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据数字"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "82年", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '28px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据描述"
          layout={{width: 'fit-content'}}
          data={{content: "办学历史", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#6b7280', fontSize: '16px'}}]}
        />
      </flex>
      <flex column title="数据项2" layout={{alignItems: 'center', marginRight: 80}}>
        <mybricks.normal-pc.antd5.icon
          title="学生图标"
          layout={{width: 48, height: 48, marginBottom: 12}}
          data={{icon: "UserOutlined"}}
          styleAry={[{selector: '.icon', css: {color: '#1e3a8a', fontSize: '48px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据数字"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "3.5万", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '28px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据描述"
          layout={{width: 'fit-content'}}
          data={{content: "在校学生", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#6b7280', fontSize: '16px'}}]}
        />
      </flex>
      <flex column title="数据项3" layout={{alignItems: 'center', marginRight: 80}}>
        <mybricks.normal-pc.antd5.icon
          title="奖项图标"
          layout={{width: 48, height: 48, marginBottom: 12}}
          data={{icon: "TrophyOutlined"}}
          styleAry={[{selector: '.icon', css: {color: '#1e3a8a', fontSize: '48px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据数字"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "15个", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '28px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据描述"
          layout={{width: 'fit-content'}}
          data={{content: "重点学科", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#6b7280', fontSize: '16px'}}]}
        />
      </flex>
      <flex column title="数据项4" layout={{alignItems: 'center'}}>
        <mybricks.normal-pc.antd5.icon
          title="科研图标"
          layout={{width: 48, height: 48, marginBottom: 12}}
          data={{icon: "ExperimentOutlined"}}
          styleAry={[{selector: '.icon', css: {color: '#1e3a8a', fontSize: '48px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据数字"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "2000+", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '28px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="数据描述"
          layout={{width: 'fit-content'}}
          data={{content: "科研成果", align: "center"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#6b7280', fontSize: '16px'}}]}
        />
      </flex>
    </flex>
  </flex>

  <!-- 历史沿革 -->
  <flex column title="历史沿革区域" layout={{width: '100%', alignItems: 'center', marginBottom: 80}} styleAry={[{selector: ':root', css: {backgroundColor: '#f1f5f9', padding: '60px 40px'}}]}>
    <mybricks.normal-pc.antd5.text
      title="历史标题"
      layout={{width: 'fit-content', marginBottom: 40}}
      data={{content: "历史沿革", align: "center"}}
      styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '32px', fontWeight: 'bold'}}]}
    />
    <mybricks.normal-pc.antd5.timeline
      title="发展历程"
      layout={{width: 800}}
      data={{
        timelines: [
          {
            id: "1",
            title: "1940年",
            subTitle: "学校创建",
            description: "延安自然科学院创建，开启了北京理工大学的历史征程"
          },
          {
            id: "2",
            title: "1949年",
            subTitle: "迁至北京",
            description: "学校迁至北京，更名为北京工业学院"
          },
          {
            id: "3",
            title: "1988年",
            subTitle: "更名理工",
            description: "正式更名为北京理工大学，成为全国重点大学"
          },
          {
            id: "4",
            title: "1995年",
            subTitle: "211工程",
            description: "进入国家211工程重点建设高校行列"
          },
          {
            id: "5",
            title: "2017年",
            subTitle: "双一流",
            description: "入选国家双一流建设高校，开启新的发展篇章"
          }
        ],
        mode: "left"
      }}
      styleAry={[
        {selector: 'ul.ant-timeline > li.ant-timeline-item > div.ant-timeline-item-head', css: {backgroundColor: '#1e3a8a', borderColor: '#1e3a8a'}},
        {selector: 'ul.ant-timeline > li.ant-timeline-item > div.ant-timeline-item-content span[data-type="title"]', css: {color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold'}},
        {selector: 'ul.ant-timeline > li.ant-timeline-item > div.ant-timeline-item-content span[data-type="subTitle"]', css: {color: '#374151', fontSize: '16px', fontWeight: '600'}},
        {selector: 'ul.ant-timeline > li.ant-timeline-item > div.ant-timeline-item-content div[data-type="desc"]', css: {color: '#6b7280', fontSize: '14px'}}
      ]}
    />
  </flex>

  <!-- 院系设置 -->
  <flex column title="院系设置" layout={{width: '100%', alignItems: 'center', marginBottom: 80, marginLeft: 40, marginRight: 40}}>
    <mybricks.normal-pc.antd5.text
      title="院系标题"
      layout={{width: 'fit-content', marginBottom: 40}}
      data={{content: "院系设置", align: "center"}}
      styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '32px', fontWeight: 'bold'}}]}
    />
    <mybricks.normal-pc.antd5.list-new
      title="院系列表"
      layout={{width: '100%'}}
      data={{
        direction: "row",
        wrap: true,
        grid: {gutter: [24, 24]},
        rowKey: "id"
      }}
    >
      <slots.item title="院系卡片" layout={{width: '30%'}}>
        <flex column title="院系卡片内容" layout={{width: '100%', height: 200}} styleAry={[{selector: ':root', css: {backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '24px'}}]}>
          <mybricks.normal-pc.antd5.text
            title="院系名称"
            layout={{width: 'fit-content', marginBottom: 12}}
            data={{content: "机械与车辆学院", align: "left"}}
            styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold'}}]}
          />
          <mybricks.normal-pc.antd5.text
            title="院系简介"
            layout={{width: '100%', marginBottom: 20}}
            data={{content: "拥有先进的实验设备和雄厚的师资力量，致力于培养机械工程和车辆工程领域的高级人才", align: "left"}}
            styleAry={[{selector: '[data-item-type="root"]', css: {color: '#6b7280', fontSize: '14px', lineHeight: '1.6'}}]}
          />
          <mybricks.normal-pc.antd5.custom-button
            title="查看详情"
            layout={{width: 'fit-content'}}
            data={{text: "查看详情", type: "primary", size: "small"}}
            styleAry={[{selector: '.button', css: {backgroundColor: '#1e3a8a', borderColor: '#1e3a8a'}}]}
          />
        </flex>
      </slots.item>
    </mybricks.normal-pc.antd5.list-new>
  </flex>

  <!-- 学术科研 -->
  <flex column title="学术科研" layout={{width: '100%', alignItems: 'center', marginBottom: 80}} styleAry={[{selector: ':root', css: {backgroundColor: '#f1f5f9', padding: '60px 40px'}}]}>
    <mybricks.normal-pc.antd5.text
      title="科研标题"
      layout={{width: 'fit-content', marginBottom: 40}}
      data={{content: "学术科研", align: "center"}}
      styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '32px', fontWeight: 'bold'}}]}
    />
    <flex row title="科研内容" layout={{width: '100%', alignItems: 'center', marginBottom: 40}}>
      <mybricks.normal-pc.antd5.single-image
        title="科研图片"
        layout={{width: 400, height: 300, marginRight: 60}}
        data={{src: "https://ai.mybricks.world/image-search?term=research laboratory&w=400&h=300", objectFit: "cover"}}
        styleAry={[{selector: '.img', css: {borderRadius: '8px'}}]}
      />
      <flex column title="科研文字" layout={{flex: 1}}>
        <mybricks.normal-pc.antd5.text
          title="科研标题"
          layout={{width: 'fit-content', marginBottom: 16}}
          data={{content: "前沿科学研究", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#1e3a8a', fontSize: '24px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="科研描述"
          layout={{width: '100%', marginBottom: 20}}
          data={{content: "学校在人工智能、新材料、生物医学工程等前沿领域取得了重要突破，承担了多项国家重大科研项目，为国家科技创新和经济社会发展做出了重要贡献。", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#374151', fontSize: '16px', lineHeight: '1.8'}}]}
        />
        <mybricks.normal-pc.antd5.custom-button
          title="了解更多"
          layout={{width: 'fit-content'}}
          data={{text: "了解更多", type: "primary", size: "middle"}}
          styleAry={[{selector: '.button', css: {backgroundColor: '#1e3a8a', borderColor: '#1e3a8a'}}]}
        />
      </flex>
    </flex>
  </flex>

  <!-- 页脚 -->
  <flex column title="页脚" layout={{width: '100%', alignItems: 'center'}} styleAry={[{selector: ':root', css: {backgroundColor: '#1e3a8a', padding: '40px'}}]}>
    <flex row title="页脚内容" layout={{width: '100%', justifyContent: 'center', marginBottom: 30}}>
      <flex column title="快速链接" layout={{marginRight: 80}}>
        <mybricks.normal-pc.antd5.text
          title="链接标题"
          layout={{width: 'fit-content', marginBottom: 16}}
          data={{content: "快速链接", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#ffffff', fontSize: '18px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="链接1"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "教务系统", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="链接2"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "图书馆", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="链接3"
          layout={{width: 'fit-content'}}
          data={{content: "邮箱系统", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
      </flex>
      <flex column title="联系我们" layout={{}}>
        <mybricks.normal-pc.antd5.text
          title="联系标题"
          layout={{width: 'fit-content', marginBottom: 16}}
          data={{content: "联系我们", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#ffffff', fontSize: '18px', fontWeight: 'bold'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="地址"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "北京市海淀区中关村南大街5号", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="电话"
          layout={{width: 'fit-content', marginBottom: 8}}
          data={{content: "电话：010-68912345", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
        <mybricks.normal-pc.antd5.text
          title="邮箱"
          layout={{width: 'fit-content'}}
          data={{content: "邮箱：info@bit.edu.cn", align: "left"}}
          styleAry={[{selector: '[data-item-type="root"]', css: {color: '#cbd5e1', fontSize: '14px'}}]}
        />
      </flex>
    </flex>
    <mybricks.normal-pc.antd5.text
      title="版权信息"
      layout={{width: 'fit-content'}}
      data={{content: "© 2024 北京理工大学. 版权所有", align: "center"}}
      styleAry={[{selector: '[data-item-type="root"]', css: {color: '#94a3b8', fontSize: '12px'}}]}
    />
  </flex>
</page>
\`\`\`

这个大学官网包含了完整的功能模块，采用了现代化的设计风格，色彩搭配专业权威，布局清晰合理，能够很好地展示学校的形象和实力。`