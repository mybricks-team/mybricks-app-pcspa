// ------ taro ------
import * as TaroComponents from '@tarojs/components'
import * as TaroHooks from '@tarojs/taro'
import * as NutuiIcons from '@nutui/icons-react-taro'

console.log('[TaroComponents]', TaroComponents)
console.log('[TaroHooks]', TaroHooks)

const getDependencies = (params) => {
  console.log('[getDependencies - params]', params)
  return {
    '@tarojs/components': {
      version: '4.2.0',
      readme: '',
      module: TaroComponents
    },
    '@tarojs/taro': {
      version: '4.2.0',
      readme: '',
      module: TaroHooks
    },
    '@nutui/icons-react-taro': {
      version: '3.0.2-cpp.3.beta.9',
      readme: '',
      module: NutuiIcons
    },
  }
}

export default getDependencies
