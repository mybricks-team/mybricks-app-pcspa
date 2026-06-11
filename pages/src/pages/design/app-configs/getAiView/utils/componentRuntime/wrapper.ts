import React from 'react'

export default function ({ children }) {
  const ConfigProvider = window['antd_5_21_4'].ConfigProvider
  return React.createElement(ConfigProvider, {
    prefixCls: 'helloworld',
  }, children)
}