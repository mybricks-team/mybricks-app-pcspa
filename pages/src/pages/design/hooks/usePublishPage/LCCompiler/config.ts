import { ModuleMatcher } from '../compiler/type'

export const MUI_EXTERNAL_RESOURCES = {
  css: [],
  js: [],
}

export const defaultExternal = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'antd': 'antd',
  'dayjs': 'dayjs',
  '@ant-design/icons': 'icons',
  'echarts-for-react': 'echarts',
  'react/jsx-runtime': 'react_jsx_runtime',
}

// 针对每个场景添加不同的全局变量映射
export const getExtraExternal = target => {
  switch (target) {
    case 'react':
    case 'react-page':
    case 'react-style': {
      const res = MUI_EXTERNAL_RESOURCES.js.reduce((acc, item) => {
        acc[item.packageName] = item.globalName
        return acc
      }, {})
      return res
    }
    default:
      return {}
  }
}

export const getExternalInfo = target => {
  return {
    ...defaultExternal,
    ...getExtraExternal(target),
  }
}

export const moduleMatcher: Array<ModuleMatcher> = [
  {
    matcher: item => item.replace(/\?.*$/, '').endsWith('jsx-runtime'),
    resolve: () => 'https://esm.sh/react@18.0.0/jsx-runtime',
  },
]
