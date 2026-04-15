// ------ taro ------
import * as TaroComponents from '@tarojs/components'
import * as TaroHooks from '@tarojs/taro'

console.log('[TaroComponents]', TaroComponents)
console.log('[TaroHooks]', TaroHooks)

const getDependencies = (params) => {
  console.log('[getDependencies - params]', params)
  return {
    '@tarojs/components': TaroComponents,
    '@tarojs/taro': TaroHooks,
  }
}

export default getDependencies
