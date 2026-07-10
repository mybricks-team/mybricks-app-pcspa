import type { Plugin } from '@rollup/browser'
import less from 'less'
//import initSwc from '@swc/wasm-web'
import { ModuleMatcher } from './type'
import {
  compilerFetchText,
  createModuleWrapper,
  getCssModule,
  isCSSModuleImport,
  log,
  matchFile,
  transformImportToReferer,
  transformJSX,
  wrapComponentCode,
} from './utils'

// const esmCDN = `https://esm.sh`
const esmCDN = `./public/esm.sh`

// 解析相对路径为绝对路径
function resolvePath(basePath: string, relativePath: string): string {
  // 获取基础目录（去掉文件名）
  const baseDir = basePath.includes('/')
    ? basePath.substring(0, basePath.lastIndexOf('/'))
    : ''

  // 分割相对路径
  const parts = relativePath.split('/')
  const resolvedParts = baseDir ? baseDir.split('/') : []

  for (const part of parts) {
    if (part === '..') {
      // 向上一级目录
      if (resolvedParts.length > 0) {
        resolvedParts.pop()
      }
    } else if (part !== '.' && part !== '') {
      // 普通目录或文件名
      resolvedParts.push(part)
    }
  }

  return resolvedParts.join('/')
}

// esm.sh 插件：解析外部依赖和 CSS
export const createLoaderPlugin = (options: {
  sourceFiles: Record<string, string>
  enableESMCDN?: boolean
  externalModulesMatcher?: Array<ModuleMatcher>
  external?: Record<string, string>
}): Plugin => {
  const {
    sourceFiles,
    enableESMCDN = false,
    externalModulesMatcher = [],
    external = {},
  } = options
  const cachedModuleMap = new Map<string, string>()
  const cssModuleMap = new Map<string, boolean>()
  let packageJson: { dependencies?: Record<string, string> } = {}
  if (sourceFiles['package.json']) {
    try {
      packageJson = JSON.parse(sourceFiles['package.json'])
    } catch (error) {
      console.error('parse package.json error', error)
    }
  }
  return {
    name: 'esm-sh-plugin',
    async resolveId(id: string, importer: string | undefined) {
      if (external[id]) {
        cachedModuleMap.set(id, id)
        return { id, external: true }
      }
      const res = resolveModule(id, importer, {
        sourceFiles,
        enableESMCDN,
        externalModulesMatcher,
        dependencies: packageJson.dependencies || {},
      })
      // @ts-expect-error resolveId may return a string or an object with id
      const newId = res?.id || res
      cachedModuleMap.set(newId, id)

      // 检测CSS模块导入类型
      if (
        !id.startsWith('http') &&
        (id.endsWith('.less') || id.endsWith('.css')) &&
        importer &&
        sourceFiles[importer]
      ) {
        const importerCode = sourceFiles[importer]
        const isCssModuleImport = isCSSModuleImport(importerCode, id)
        cssModuleMap.set(newId, isCssModuleImport)
        log('CSS Module detection:', id, isCssModuleImport)
      }

      log('resolveId result:', id, res, 'importer is:', importer)
      return res
    },

    async load(id: string) {
      log('load', id)
      if (id.startsWith('http') || id.startsWith(esmCDN)) {
        const code = await compilerFetchText(id)
        if (!id.startsWith(esmCDN) && cachedModuleMap.has(id)) {
          return createModuleWrapper(code, cachedModuleMap.get(id) || '')
        }
        return code
      }

      // 加载内部源文件
      if (sourceFiles[id]) {
        const code = sourceFiles[id]
        log('load code', id, code)

        if (/(ts|tsx|jsx|js)$/.test(id)) {
          let transformed = await transformJSX(code, id)
          transformed = await transformImportToReferer(transformed, {
            moduleMatcher: externalModulesMatcher,
            external,
          })
          return transformed
        }

        // 将import 外部模块，转成从window获取变量
        return code
      }

      return ''
    },

    renderChunk(code, chunk) {
      if (chunk.fileName === 'entry.js') {
        return wrapComponentCode(code, external)
      }
      // 必须返回 null 或原始代码，因为我们不打算修改它
      return null
    },

    async transform(code, id) {
      if (id.endsWith('.less') || id.endsWith('.css')) {
        const isModuleImport = cssModuleMap.get(id) || false
        if (isModuleImport) {
          return await transformCSSModule(code)
        }
        return await transformCSS(code)
      }
    },
  }
}

async function transformCSSModule(code) {
  const { cssContent, classMap } = await getCssModule(code)
  const finalCode = `(function() {
    const style = document.createElement("style");
    style.textContent = \`${cssContent}\`;
    document.head.appendChild(style);
  })();
  const style = ${JSON.stringify(classMap)};
  export default style;
  `
  return finalCode
}

async function transformCSS(code) {
  const css = await less
    .render(code, { javascriptEnabled: true })
    .then(output => output.css)
  const finalCode = `(function() {
  const style = document.createElement("style");
  style.textContent = \`${css}\`;
  document.head.appendChild(style);
})();
`
  return finalCode
}

function resolveModule(
  id: string,
  importer: string | undefined,
  options: {
    sourceFiles: Record<string, string>
    enableESMCDN?: boolean
    externalModulesMatcher?: Array<ModuleMatcher>
    dependencies: Record<string, string>
  },
) {
  const {
    sourceFiles,
    enableESMCDN = false,
    externalModulesMatcher = [],
    dependencies = {},
  } = options
  const localFilePaths = Object.keys(sourceFiles).filter(
    path => !path.startsWith('http'),
  )

  // 额外指定的模块链接（一般是指定的内网模块）
  for (const module of externalModulesMatcher) {
    if (module.matcher(id)) {
      return module.resolve(id, dependencies)
    }
  }

  // 1. 如果已经是完整的 URL，直接返回
  if (id.startsWith('http://') || id.startsWith('https://')) {
    return {
      id,
      external: enableESMCDN,
    }
  }

  // 2. 根据 importer 来源判断处理逻辑
  // 如果是esm模块
  if (importer && importer.startsWith(esmCDN)) {
    // importer 是 esm.sh 上的模块
    if (id.startsWith('./') || id.startsWith('../') || id.startsWith('/')) {
      // 相对路径：解析为 esm.sh URL
      if (esmCDN.startsWith('http')) {
        // 远程 CDN：使用 URL API 解析
        const baseUrl = new URL(importer)
        const resolvedUrl = new URL(id, baseUrl)
        return resolvedUrl.href
      } else {
        if (id.startsWith('/')) {
          // 绝对路径（/xxx）：相对于 esmCDN 根，去掉 query string
          const pathWithoutQuery = id.split('?')[0]
          return `${esmCDN}${pathWithoutQuery}`
        } else {
          // 相对路径（./、../）：基于 importer 目录解析，去掉 query string 后解析
          const importerPath = importer.split('?')[0]
          return resolvePath(importerPath, id)
        }
      }
    } else if (!id.startsWith('/')) {
      // 裸模块导入：转换为 esm.sh URL
      return `${esmCDN}/${id}`
    }
  } else {
    // importer 是本地相对路径
    if (id.startsWith('./') || id.startsWith('../')) {
      // 带相对路径的情况
      // 基于 importer 计算绝对路径
      const resolvedId = importer
        ? resolvePath(importer, id)
        : id.replace(/^\.\//, '')

      // 如果没有文件扩展名，尝试添加扩展名
      if (
        !/\.[jt]sx?$/.test(resolvedId) &&
        !resolvedId.endsWith('.less') &&
        !resolvedId.endsWith('.css')
      ) {
        // 1. 先尝试直接添加扩展名
        const extensions = ['.tsx', '.ts', '.jsx', '.js']
        for (const ext of extensions) {
          const nameWithExt = resolvedId + ext
          if (matchFile(nameWithExt, localFilePaths)) {
            return nameWithExt
          }
        }

        // 2. 如果直接添加扩展名找不到，尝试作为文件夹查找 index 文件
        const indexExtensions = [
          '/index.tsx',
          '/index.ts',
          '/index.jsx',
          '/index.js',
        ]
        for (const indexExt of indexExtensions) {
          const indexPath = resolvedId + indexExt
          if (matchFile(indexPath, localFilePaths)) {
            return indexPath
          }
        }

        // 如果都没找到，抛出错误
        console.error('localFilePaths', localFilePaths, sourceFiles)
        throw new Error(
          `[Compiler] 未找到匹配的文件: ${id} (尝试过的路径: ${resolvedId} 及其 index 文件)`,
        )
      }

      // 有扩展名的情况，直接检查是否存在
      if (matchFile(resolvedId, localFilePaths)) {
        return resolvedId
      } else {
        console.error('localFilePaths', localFilePaths, sourceFiles)
        throw new Error(`[Compiler] 未找到匹配的文件: ${id} -> ${resolvedId}`)
      }
    } else if (matchFile(id, localFilePaths)) {
      // 如果是绝对路径本地文件
      // 本地绝对路径
      if (
        !/[jt]sx?$/.test(id) &&
        !id.endsWith('.css') &&
        !id.endsWith('.less')
      ) {
        return id + '.tsx'
      }
      return id
    } else {
      const path = id.endsWith('.css')
        ? id
        : `${id}?bundle&external=react,react-dom,react-dom/client`
      // 裸模块导入：转换为 esm.sh URL
      return {
        id: `${esmCDN}/${path}`,
        external: enableESMCDN,
      }
    }
  }
}
