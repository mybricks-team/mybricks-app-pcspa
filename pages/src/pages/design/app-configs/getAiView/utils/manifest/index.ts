import { loadUMDS } from './loadScript';
import type { AIConfigManifestDependency } from '@/types/aiConfigManifest';

export const DEPENDENCIES_MAP_KEY = '__componentRuntimeDependencies__'

export async function preloadDependencies (dependencies: AIConfigManifestDependency[]) {
  const arr = dependencies.reduce((acc, dep) => {
    acc = acc.concat(dep.umd)
    return acc
  }, [])
  const res = await loadUMDS(arr)
  window[DEPENDENCIES_MAP_KEY] = res
  return res
}

export function getDependenciesConfig (dependencies: AIConfigManifestDependency[]) {
  const dependenciesMap = window[DEPENDENCIES_MAP_KEY]
  const result = {}
  dependencies?.forEach((dep) => {
    const module = dependenciesMap[dep.libraryName]
    if (module) {
      result[dep.name] = {
        version: dep.version,
        readme: dep.readme,
        module,
      }
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
