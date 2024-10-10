// TODO: 将此文件迁移到根目录
// 升级版本的时候直接用 shift + command + F 全局搜索替换
export default {
  react: [
    {
      tag: "script",
      path: "public/moment/moment@2.29.4.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443543399.2.29.4_moment.min.js",
    },
    {
      tag: "script",
      path: "public/moment/locale/zh-cn.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443577599.2.29.4_locale_zh-cn.min.js",
    },
    {
      tag: "link",
      path: "public/antd/antd@4.21.6.variable.min.css",
      CDN: "//f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/antd.variable.min.css",
      path_compatible: "public/antd/antd@4.15.3.min.css",
      CDN_COMPATIBLE: "//f2.eckwai.com/kos/nlav12333/fangzhou/pub/pkg/antd-4.15.3/antd.min.css",
    },
    {
      tag: "script",
      path: "public/react@18.0.0.production.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690446345009.react.18.0.0.production.min.js",
      path_compatible: "public/react@17.0.2.production.min.js",
      CDN_COMPATIBLE: "//f2.eckwai.com/kos/nlav12333/fangzhou/pub/pkg/react-17.0.2/react.production.min.js",
    },
    {
      tag: "script",
      path: "public/react-dom@18.0.0.production.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443341846.umd_react-dom.production.min.js",
      path_compatible: "public/react-dom@17.0.2.production.min.js",
      CDN_COMPATIBLE: "//f2.eckwai.com/kos/nlav12333/fangzhou/pub/pkg/react-17.0.2/react-dom.production.min.js",
    },
    {
      tag: "script",
      path: "public/antd/antd@4.21.6.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690444184854.4.21.6_antd.min.js",
      path_compatible: "public/antd/antd@4.15.3.min.js",
      CDN_COMPATIBLE: "//f2.eckwai.com/kos/nlav12333/fangzhou/pub/pkg/antd-4.15.3/antd.min.js",
    },
    {
      tag: "script",
      path: "public/antd/locale/zh_CN.js",
      CDN: "//f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/locale/zh_CN.js",
    },
    {
      tag: "script",
      path: "public/ant-design-icons@4.7.0.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690444248634.ant-design-icons_4.7.0_min.js",
    },
    // {
    //   tag: "script",
    //   path: "public/ant-design-charts@1.3.5.min.js",
    //   CDN: "//f2.beckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/ant-design/charts-1.3.5/charts.min.js",
    // },
    {
      tag: "script",
      path: "public/plugin-http-connector/1.2.18/index.js",
      CDN: "//f1.eckwai.com/kos/nlav12333/mybricks/plugin-http-connector/1.2.18/index.js",
    },
    {
      tag: "script",
      path: "public/mybricks-plugin-connector-domain@0.0.44.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690445635042.mybricks_plugin-connector-domain@0.0.44.js",
    },
    {
      tag: "script",
      path: "public/render-web/1.3.35/index.min.js",
      CDN: "//f2.beckwai.com/kos/nlav12333/mybricks/render-web/1.3.35/index.min.js",
    },
  ],
  vue2: [
    {
      tag: "link",
      path: "public/elementUI/element@2.15.14.css",
      CDN: "https://unpkg.com/element-ui/lib/theme-chalk/index.css",
    },
    {
      tag: "script",
      path: "public/vue/2.7.14/vue.min.js",
      CDN: "https://f2.beckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/vue/2.7.14/vue.min.js",
    },
    {
      tag: "script",
      path: "public/elementUI/element-ui@2.15.14.min.js",
      CDN: "https://unpkg.com/element-ui/lib/index.js",
    },
    {
      tag: "script",
      path: "public/render-web-vue2/0.0.5/index.min.js",
      CDN: "//f2.eckwai.com/kos/nlav12333/mybricks/render-web-vue2/0.0.5/index.min.js",
    },
    // {
    //   tag: "script",
    //   path: "public/plugin-http-connector/1.1.79/index.js",
    //   CDN: "//f2.eckwai.com/kos/nlav12333/mybricks/plugin-http-connector/1.1.79/index.js",
    // },
    {
      tag: "script",
      path: "public/plugin-http-connector/1.2.3/index.js",
      CDN: "//f2.eckwai.com/kos/nlav12333/mybricks/plugin-http-connector/1.2.3/index.js",
    },
    {
      tag: "script",
      path: "public/moment/moment@2.29.4.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443543399.2.29.4_moment.min.js",
    },
    {
      tag: "script",
      path: "public/moment/locale/zh-cn.min.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443577599.2.29.4_locale_zh-cn.min.js",
    },
  ],
  vue3: [
    {
      tag: "script",
      path: "public/vue/3.5.6/vue.global.prod.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/mybricks/vue/3.5.6/vue.global.prod.js"
    },
    {
      tag: "script",
      path: "public/plugin-http-connector/1.2.3/index.js",
      CDN: "//f2.eckwai.com/kos/nlav12333/mybricks/plugin-http-connector/1.2.3/index.js",
    },
    {
      tag: "script",
      path: "public/render-web-vue3/0.0.1/index.umd.js",
      CDN: "//f2.eckwai.com/kos/nlav11092/mybricks/render-web-vue3/0.0.1/index.umd.js"
    },
  ],

  // 应用需要但发布页面不直接需要的依赖
  others: {
    react: [
      // 引擎相关资源
      {
        path: "public/designer-spa/1.3.49/index.min.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.49/index.min.js",
      },
      // {
      //   path: "public/designer-spa/1.3.48/828.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/828.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/635.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/635.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/74.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/74.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/239.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/239.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/554.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/554.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/452.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/452.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/9.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/9.index.min.js",
      // },
      // 兜底组件库
      {
        path: "public/comlibs/5952_1.0.1/2023-07-25_22-02-32/edit.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.1/2023-07-25_22-02-32/edit.js",
      },
      {
        path: "public/comlibs/5952_1.0.1/2023-07-25_22-02-32/rt.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.1/2023-07-25_22-02-32/rt.js",
      },
      {
        path: "public/comlibs/7182_1.0.29/2023-07-25_22-04-55/rt.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.29/2023-07-25_22-04-55/rt.js",
      },
      {
        path: "public/comlibs/7182_1.0.29/2023-07-25_22-04-55/edit.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.29/2023-07-25_22-04-55/edit.js",
      },
      {
        path: "public/comlibs/7632_1.2.72/2023-08-28_16-50-20/edit.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.72/2023-08-28_16-50-20/edit.js",
      },
      {
        path: "public/comlibs/7632_1.2.72/2023-08-28_16-50-20/rt.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.72/2023-08-28_16-50-20/rt.js",
      },
      // 其他
      {
        path: "public/axios@0.18.1.min.js",
        CDN: "https://w1.eckwai.com/kos/nlav12333/mybricks/axios0.18.1.min.js",
      },
    ],
    vue2: [
      // 引擎相关资源
      {
        path: "public/designer-spa/1.3.49/index.min.js",
        CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.49/index.min.js",
      },
      // {
      //   path: "public/designer-spa/1.3.48/74.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/74.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/9.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/9.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/452.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/452.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/239.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/239.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/828.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/828.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/635.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/635.index.min.js",
      // },
      // {
      //   path: "public/designer-spa/1.3.48/554.index.min.js",
      //   CDN: "https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.48/554.index.min.js",
      // },
    ],
  },
};
