// import '@tarojs/plugin-platform-h5/dist/runtime'

// import { initPxTransform } from '@tarojs/taro'
// import { createRouter, createHashHistory, handleAppMount } from '@tarojs/router'
// import '@tarojs/components/global.css'
// import component from "./app"
// import { window } from '@tarojs/runtime'
// import { createReactApp } from '@tarojs/plugin-framework-react/dist/runtime'

// import * as React from 'react'
// import ReactDOM from 'react-dom/client'

// import { findDOMNode, render, unstable_batchedUpdates } from 'react-dom'
// import { defineCustomElementTaroPullToRefreshCore } from '@tarojs/components/dist/components'


// var config = {"router":{},"pages":["pages/index/index"],"window":{"backgroundTextStyle":"light","navigationBarBackgroundColor":"#fff","navigationBarTitleText":"WeChat","navigationBarTextStyle":"black"}}
// window.__taroAppConfig = config

// if (config.tabBar) {
//   var tabbarList = config.tabBar.list
//   for (var i = 0; i < tabbarList.length; i++) {
//     var t = tabbarList[i]
//     if (t.iconPath) {
//       t.iconPath = tabbarIconPath[i]
//     }
//     if (t.selectedIconPath) {
//       t.selectedIconPath = tabbarSelectedIconPath[i]
//     }
//   }
// }
// config.routes = [
//   Object.assign({
//   path: 'pages/index/index',
//   load: function(context, params) {
//     const page = import("./pages/index/index")
//     return [page, context, params]
//   }
// }, {"navigationBarTitleText":"首页"})
// ]
// Object.assign(ReactDOM, { findDOMNode, render, unstable_batchedUpdates })
// defineCustomElementTaroPullToRefreshCore()

// var inst = createReactApp(component, React, ReactDOM, config)
// var history = createHashHistory({ window })
// handleAppMount(config, history)
// createRouter(history, inst, config, React)
// initPxTransform({
//   designWidth: 750,
//   deviceRatio: {"375":2,"640":1.17,"750":1,"828":0.905},
//   baseFontSize: 20,
//   unitPrecision: undefined,
//   targetUnit: undefined
// })


