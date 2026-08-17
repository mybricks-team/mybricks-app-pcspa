import { loadUMDS } from './loadScript';
import type { AIConfigManifestDependency } from '@/types/aiConfigManifest';

export const DEPENDENCIES_MAP_KEY = '__componentRuntimeDependencies__'

// 默认附加库
// - 运行时不需要注入，mybricks默认有
// - 导出源代码时，壳工程需要注入
const PRESET_ADDON_LIBS = [
  {
    name: 'antd',
    version: '5.21.4',
    libraryName: 'antd',
    umd: ['https://unpkg.com/antd@5.21.4/dist/antd-with-locales.min.js'],
    css: ['https://unpkg.com/antd@5.21.4/dist/reset.css']
  },
  {
    name: '@ant-design/icons',
    version: '5.5.0',
    libraryName: 'icons',
    umd: ['https://unpkg.com/@ant-design/icons@5.5.0/dist/index.umd.js'],
  },
  {
    name: 'echarts',
    version: '5.6.0',
    libraryName: 'echarts',
    umd: ['https://unpkg.com/echarts@5.6.0/dist/echarts.min.js']
  },
  {
    name: 'echarts-for-react',
    version: '5.6.0',
    libraryName: 'EChartsForReact',
    // 官方没有提供umd，暂时用work的吧
    umd: ['http://work.manateeai.com/mybricks-app-pcspa-vibe/public/publish/echarts/5.6.0/echarts-for-react.min.js']
  }
]

// 预加载所有依赖库
export async function preloadDependencies (dependencies: AIConfigManifestDependency[]) {
  const arr = dependencies.reduce((acc, dep) => {
    acc = acc.concat(dep.umd.map((url) => ({ url, libraryName: dep.libraryName })))
    return acc
  }, [] as Array<{ url: string; libraryName: string }>)
  const res = await loadUMDS(arr)
  window[DEPENDENCIES_MAP_KEY] = res
  return res
}

/**
 * 从依赖模块对象中按 umdPath 取值。
 * umdPath 形如 'antd.locales.zh_CN'，也可能以 'window.' 开头（需要去掉）；
 */
function getModuleValueByPath (module: any, umdPath: string) {
  if (!umdPath) return module

  // 去掉 window.
  const path = umdPath.replace(/^window\./i, '')
  if (!path) return window

  const keys = path.split('.').filter(Boolean)

  return keys.reduce((acc, key) => (acc == null ? undefined : acc[key]), module)
}

// 生成依赖库配置（AI插件）
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
            result[module.modulePath] = {
              version: dep.version,
              readme: module.readme,
              module: getModuleValueByPath(dependenciesMap, module.umdPath),
            }
          } catch (error) {
            console.error('[依赖模块获取失败]', error)
          }
        })
      }
    } else {
      console.error('[依赖获取失败]', dep.libraryName)
    }
  })
  console.log('[注入依赖]', result)

  if (Object.keys(result).length) {
    return () => result
  }
  return undefined
}

// 获取所有依赖库的css文件（appConfig）
export function getDependenciesCSS (dependencies: AIConfigManifestDependency[]) {
  const css =  dependencies?.reduce((acc, dep) => {
    acc = acc.concat(dep.css)
    return acc
  }, [])
  return css || []
}

// 获取所有依赖库（导出源代码）
export function getAllDependencies (dependencies: AIConfigManifestDependency[]) {
  const libs =  dependencies?.length ? dependencies : PRESET_ADDON_LIBS
  return libs
}

// 从 AI 配置依赖中提取 scripts / styles / external / zipAssets（发布）
export function buildAssetsFromDependencies(
  deps: AIConfigManifestDependency[],
): {
  external: Record<string, string>
  scripts: string[]
  styles: string[]
  zipAssets: Array<{ zipPath: string; fetchUrl: string }>
} {
  const external: Record<string, string> = {}
  const scripts: string[] = []
  const styles: string[] = []
  const zipAssets: Array<{ zipPath: string; fetchUrl: string }> = []

  for (const dep of deps) {
    if (dep.name && dep.libraryName) {
      external[dep.name] = dep.libraryName
      if (dep.modules?.length) {
        for (const module of dep.modules) {
          external[module.modulePath] = module.umdPath
        }
      }
    }
    for (const url of dep.umd || []) {
      scripts.push(url)
      const fileName = url.split('/').pop()
      zipAssets.push({ zipPath: `assets/${fileName}`, fetchUrl: url })
    }
    for (const url of dep.css || []) {
      styles.push(url)
      const fileName = url.split('/').pop()
      zipAssets.push({ zipPath: `assets/${fileName}`, fetchUrl: url })
    }
  }

  return { external, scripts, styles, zipAssets }
}
