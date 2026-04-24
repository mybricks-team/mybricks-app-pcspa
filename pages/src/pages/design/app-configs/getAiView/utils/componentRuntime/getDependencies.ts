// ------ taro ------
import * as NutuiIcons from '@nutui/icons-react-taro'
import * as TaroRuntime from './@tarojs/runtime/dist'
import * as TaroComponentsReact from '@tarojs/components/lib/react'
import * as TaroComponents from '@tarojs/components/dist/components/index'
import * as TaroFrameworkReact from './@tarojs/plugin-framework-react/dist/runtime'
import * as TaroRouter from './@tarojs/router/dist/index'
import * as ReactDOMClient from 'react-dom/client'
import * as Taro from '@tarojs/plugin-platform-h5/dist/runtime/apis'
import * as TaroShared from '@tarojs/shared'
import TaroStacks from '@tarojs/router/dist/router/stack.js'
import TaroJsTaroLibs from './availableLibraries/taro'
import NutuiIconsReactTaroLibs from './availableLibraries/nutuiIcons'

const getDependencies = (params) => {
  return {
    '@tarojs/components': {
      version: '4.2.0',
      readme: '',
      module: TaroComponentsReact
    },
    '@tarojs/taro': {
      version: '4.2.0',
      module: {
        ...Taro,
        ...TaroFrameworkReact,
        default: {
          ...Taro,
          ...TaroFrameworkReact
        }
      },
      ...TaroJsTaroLibs
    },
    '@nutui/icons-react-taro': {
      version: '3.0.2-cpp.3.beta.9',
      module: NutuiIcons,
      ...NutuiIconsReactTaroLibs
    },
    '@tarojs/runtime': {
      version: '4.2.0',
      readme: '',
      module: TaroRuntime
    },
    '@tarojs/components/dist/components': {
      version: '4.2.0',
      readme: '',
      module: TaroComponents
    },
    '@tarojs/plugin-framework-react/dist/runtime': {
      version: '4.2.0',
      readme: '',
      module: TaroFrameworkReact
    },
    '@tarojs/router': {
      version: '4.2.0',
      readme: '',
      module: TaroRouter
    },
    'react-dom/client': {
      version: '18.3.1',
      readme: '',
      module: ReactDOMClient
    },
    '@tarojs/shared': {
      version: '4.2.0',
      readme: '',
      module: TaroShared
    },
    '@tarojs/router/dist/router/stack.js': {
      version: '4.2.0',
      readme: '',
      module: TaroStacks
    },
  }
}

export default getDependencies
