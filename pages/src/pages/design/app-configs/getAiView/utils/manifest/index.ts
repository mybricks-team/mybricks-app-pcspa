import { loadUMDS } from './loadScript';
import type { AIConfigManifestDependency } from '@/types/aiConfigManifest';

export const DEPENDENCIES_MAP_KEY = '__componentRuntimeDependencies__'

// 当没有注入依赖时，使用的默认附加库。
// 导出源代码时用，同步ai插件里的默认附加库
const PRESET_ADDON_LIBS = [
  {
    name: 'antd',
    version: '5.21.4',
    libraryName: 'antd',
    umd: ['https://unpkg.com/antd@5.21.4/dist/antd.min.js'],
    css: ['https://unpkg.com/antd@5.21.4/dist/reset.css']
  },
  {
    name: '@ant-design/icons',
    version: '5.5.0',
    libraryName: 'icons',
    umd: ['https://unpkg.com/@ant-design/icons@5.5.0/dist/index.umd.js'],
  },
  // {
  //   name: 'echarts',
  //   version: '5.6.0',
  //   libraryName: 'echarts',
  //   umd: ['https://unpkg.com/echarts@5.6.0/dist/echarts.min.js']
  // },
  // {
  //   name: 'echarts-for-react',
  //   version: '5.6.0',
  //   libraryName: 'EChartsForReact',
  //   umd: ['http://localhost:9001/public/publish/echarts/5.6.0/echarts-for-react.min.js']
  // }
]

export async function preloadDependencies (dependencies: AIConfigManifestDependency[]) {
  const arr = dependencies.reduce((acc, dep) => {
    acc = acc.concat(dep.umd.map((url) => ({ url, libraryName: dep.libraryName })))
    return acc
  }, [] as Array<{ url: string; libraryName: string }>)
  const res = await loadUMDS(arr)
  window[DEPENDENCIES_MAP_KEY] = res
  return res
}

export function getDependenciesConfig (dependencies: AIConfigManifestDependency[]) {
  const dependenciesMap = window[DEPENDENCIES_MAP_KEY]
  const result = {}
  dependencies?.forEach((dep) => {
    const dependencie = dependenciesMap[dep.libraryName]
    if (dependencie) {
      result[dep.name] = {
        version: dep.version,
        readme: dep.readme,
        module: dependencie,
      }

      if (dep.modules) {
        dep.modules.forEach((module) => {
          try {
            result[module.modulePath] = dependencie[module.umdPath]
          } catch (error) {
            console.error('[依赖模块获取失败]', error)
          }
        })
      }
    } else {
      console.error('[依赖获取失败]', dep.libraryName)
    }
  })

  if (Object.keys(result).length) {
    return () => result
  }
  return undefined
}

export function getDependenciesCSS (dependencies: AIConfigManifestDependency[]) {
  const css =  dependencies?.reduce((acc, dep) => {
    acc = acc.concat(dep.css)
    return acc
  }, [])
  return css || []
}

// 获取所有依赖库，包括基础库和预设库/注入的依赖库
export function getAllDependencies (dependencies: AIConfigManifestDependency[]) {
  const libs =  dependencies?.length ? dependencies : PRESET_ADDON_LIBS
  return libs
}
