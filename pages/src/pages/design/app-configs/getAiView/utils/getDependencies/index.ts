import antd from './antd'
import antDesignIcons from './ant-design-icons'
import dayjs from './dayjs'
import echartsForReact from './echarts-for-react'

export default function () {
  return {
    [antd.name]: {
      ...antd,
      get module() {
        return window['antd_5_21_4']
      }
    },
    [antDesignIcons.name]: {
      ...antDesignIcons,
      get module() {
        return window['icons']
      }
    },
    [dayjs.name]: {
      ...dayjs,
      get module() {
        return window['dayjs']
      }
    },
    [echartsForReact.name]: {
      ...echartsForReact,
      get module() {
        return window['EChartsForReact']
      }
    },
  }
}