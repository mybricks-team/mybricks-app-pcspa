// ------ taro ------
import * as TaroComponents from '@tarojs/components'
import * as TaroHooks from '@tarojs/taro'

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
  }
}

export default getDependencies
