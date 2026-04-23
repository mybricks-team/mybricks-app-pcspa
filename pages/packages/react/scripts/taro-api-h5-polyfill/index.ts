import taro from './taro'
import * as taroH5 from './taro-h5'
import * as pluginFrameworkReact from './plugin-framework-react'

const Taro = {
  ...taro,
  ...taroH5,
  ...pluginFrameworkReact,
}

export * from './taro'
export * from './taro-h5'
export * from './plugin-framework-react'

export default Taro
