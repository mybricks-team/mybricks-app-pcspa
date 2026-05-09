import less from 'less'
// import initSwc, { InitOutput, transformSync } from '@swc/wasm-web'
import * as babel from '@babel/standalone'
import { parse } from 'acorn'
import * as escodegen from 'escodegen'
import { LC_MODULE, ModuleMatcher } from './type'

export const log = (...args: any[]) => {
  // console.log('%c[Live React]:', 'color: red; font-weight: bold;', ...args)
}

const uuid = () => Math.random().toString(36).substring(2, 15)

function readBalancedSegment(
  source: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
) {
  let depth = 0
  let content = ''

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]

    if (char === openChar) {
      depth += 1
      if (depth === 1) continue
    }

    if (char === closeChar) {
      depth -= 1
      if (depth === 0) {
        return {
          content,
          endIndex: i,
        }
      }
    }

    if (depth >= 1) {
      content += char
    }
  }

  return null
}

function extractGlobalSegments(source: string) {
  const placeholders: Array<[string, string]> = []
  let code = ''

  for (let i = 0; i < source.length; ) {
    if (source.startsWith(':global(', i)) {
      const segment = readBalancedSegment(
        source,
        i + ':global'.length,
        '(',
        ')',
      )

      if (segment) {
        const token = `__LC_GLOBAL_INLINE_${placeholders.length}__`
        const content = normalizeGlobalSyntax(segment.content)
        placeholders.push([token, content])
        code += token
        i = segment.endIndex + 1
        continue
      }
    }

    if (source.startsWith(':global', i)) {
      let cursor = i + ':global'.length

      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1
      }

      if (source[cursor] === '{') {
        const segment = readBalancedSegment(source, cursor, '{', '}')

        if (segment) {
          const token = `__LC_GLOBAL_BLOCK_${placeholders.length}__`
          const content = normalizeGlobalSyntax(segment.content)
          placeholders.push([token, content])
          code += token
          i = segment.endIndex + 1
          continue
        }
      }
    }

    code += source[i]
    i += 1
  }

  return {
    code,
    placeholders,
  }
}

function restoreGlobalSegments(
  source: string,
  placeholders: Array<[string, string]>,
) {
  return placeholders.reduce(
    (code, [token, content]) => code.replaceAll(token, content),
    source,
  )
}

function normalizeGlobalSyntax(source: string) {
  const { code, placeholders } = extractGlobalSegments(source)
  return restoreGlobalSegments(code, placeholders)
}

export async function getCssModule(lessContent: string) {
  const classMap: Record<string, string> = {}
  const uid = uuid()
  const result = await less.render(lessContent, {
    javascriptEnabled: true,
    plugins: [
      {
        install: function (less, pluginManager) {
          pluginManager.addPreProcessor({
            process: function (src) {
              const { code, placeholders } = extractGlobalSegments(src)
              const hashedCode = code.replace(
                /\.([a-zA-Z][a-zA-Z0-9_-]*)/g,
                (_match, className) => {
                  const hashedName = `${className}_${uid}`
                  classMap[className] = hashedName
                  return `.${hashedName}`
                },
              )

              return restoreGlobalSegments(hashedCode, placeholders)
            },
          })
        },
      },
    ],
  })
  return {
    cssContent: result.css,
    classMap,
  }
}

export function transformJSX(code: string, filename: string): string {
  try {
    const result = (window as any).Babel.transform(code, {
      presets: ['react', ['typescript', { allExtensions: true, isTSX: true }]],
      filename,
    })
    // const result = babel.transform(code, {
    //   presets: ['react', ['typescript', { allExtensions: true, isTSX: true }]],
    //   filename,
    // })
    return result.code
  } catch (error) {
    debugger
    console.error('Babel transform error:', error)
    throw error
  }
  debugger
}

export const matchFile = (
  id: string,
  filenames: string[],
  extentions = ['ts', 'js', 'tsx', 'jsx', 'less', '.css'],
) => {
  if (filenames.includes(id)) return id

  // 尝试添加扩展名
  const ext = extentions.find(ext => filenames.includes(id + '.' + ext))
  if (ext) return id + '.' + ext

  // 处理 id/index 的情况
  const indexFile = extentions.find(ext =>
    filenames.includes(id + '/index.' + ext),
  )
  if (indexFile) return id + '/index.' + indexFile

  return null
}

// compiler 专用的带缓存 fetch，处理并发与失败回退
const fetchCache = new Map<string, Promise<string>>()

export async function compilerFetchText(url: string): Promise<string> {
  if (!url) throw new Error('compilerFetchText: url is required')

  const cached = fetchCache.get(url)
  if (cached) return cached

  const controller = new AbortController()

  // 设置30秒超时
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 30000)

  const promise = (async () => {
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      const text = await res.text()
      clearTimeout(timeoutId)
      return text
    } catch (err) {
      clearTimeout(timeoutId)
      // 失败时清理缓存，避免永久脏数据
      fetchCache.delete(url)

      // 如果是因为超时被中止，提供更友好的错误信息
      if (err.name === 'AbortError') {
        const timeoutError = new Error(`请求超时：${url} 加载超过30秒`)
        console.error('compilerFetchText timeout error', timeoutError)
        throw timeoutError
      }

      console.error('compilerFetchText error', err)
      throw err
    }
  })()

  fetchCache.set(url, promise)
  return await promise
}

/**
 * 构建常量声明的 AST 节点，用于从 LC_MODULE 中获取模块
 * 生成代码格式: const local = __LC_MODULE__['globalName'].__esModule && __LC_MODULE__['globalName'].default
 *                              ? __LC_MODULE__['globalName'].default
 *                              : __LC_MODULE__['globalName']
 *
 * @param local - 本地变量名
 * @param globalName - LC_MODULE 中的模块名
 * @returns AST 节点
 */
function buildConst(local, globalName) {
  return {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: local },
        init: {
          type: 'ConditionalExpression',
          test: {
            type: 'LogicalExpression',
            operator: '&&',
            left: {
              type: 'MemberExpression',
              object: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: LC_MODULE },
                property: {
                  type: 'Literal',
                  value: globalName,
                  raw: `'${globalName}'`,
                },
                computed: true,
                optional: false,
              },
              property: { type: 'Identifier', name: '__esModule' },
              computed: false,
              optional: false,
            },
            right: {
              type: 'MemberExpression',
              object: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: LC_MODULE },
                property: {
                  type: 'Literal',
                  value: globalName,
                  raw: `'${globalName}'`,
                },
                computed: true,
                optional: false,
              },
              property: { type: 'Identifier', name: 'default' },
              computed: false,
              optional: false,
            },
          },
          consequent: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: LC_MODULE },
              property: {
                type: 'Literal',
                value: globalName,
                raw: `'${globalName}'`,
              },
              computed: true,
              optional: false,
            },
            property: { type: 'Identifier', name: 'default' },
            computed: false,
            optional: false,
          },
          alternate: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: LC_MODULE },
            property: {
              type: 'Literal',
              value: globalName,
              raw: `'${globalName}'`,
            },
            computed: true,
            optional: false,
          },
        },
      },
    ],
  }
}

export function transformImportToReferer(
  code: string,
  {
    moduleMatcher = [],
    strict: _strict = false,
    external = {},
  }: {
    moduleMatcher?: Array<ModuleMatcher>
    strict?: boolean
    external?: Record<string, string>
  } = {},
) {
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
  const newBody: any[] = []
  const seenSource = new Set()
  let hasMatchedModule = false

  function buildNamedImportConst(
    local: string,
    moduleName: string,
    imported: string,
  ) {
    return {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: local },
          init: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: LC_MODULE },
              property: {
                type: 'Literal',
                value: moduleName,
                raw: `'${moduleName}'`,
              },
              computed: true,
              optional: false,
            },
            property: { type: 'Identifier', name: imported },
            computed: false,
            optional: false,
          },
        },
      ],
    }
  }

  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') {
      newBody.push(node)
      continue
    }
    const source = node.source.value as string
    if (node.specifiers.length === 0) {
      // side-effect import
      newBody.push(node)
      continue
    }

    // 检查是否有匹配的模块
    const matchedModule = moduleMatcher.find(
      m => m.matcher(source) && m.options?.umd && !external[source],
    )

    if (!matchedModule) {
      // 没有匹配，保持原来的语句
      newBody.push(node)
      continue
    }

    hasMatchedModule = true

    // 有匹配的模块，添加 side-effect import
    if (!seenSource.has(source)) {
      newBody.push({
        type: 'ImportDeclaration',
        source: { type: 'Literal', value: source, raw: `'${source}'` },
        specifiers: [], // side-effect
      })
      seenSource.add(source)
    }

    for (const spec of node.specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') {
        const local = spec.local.name
        newBody.push(buildConst(local, source))
      } else if (spec.type === 'ImportSpecifier') {
        const imported = (spec.imported as any).name
        const local = spec.local.name
        newBody.push(buildNamedImportConst(local, source, imported))
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        const local = spec.local.name
        newBody.push(buildConst(local, source))
      }
    }
  }

  if (!hasMatchedModule) {
    return code
  }

  ast.body = newBody
  const res = escodegen.generate(ast, {
    format: { indent: { style: '  ' }, semicolons: true },
  })
  return res
}

export function createModuleWrapper(code: string, moduleName: string) {
  return `
${LC_MODULE}["${moduleName}"] = (function() {
     const exports = {};
     const module = { exports };
     ${code};
     return module.exports;
}());
  `
}

export function isCSSModuleImport(
  importerCode: string,
  cssFilePath: string,
): boolean {
  try {
    const ast = parse(importerCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    })

    for (const node of ast.body) {
      if (node.type !== 'ImportDeclaration') continue

      const source = node.source.value as string
      // 检查是否是目标CSS文件的导入
      if (
        source.endsWith(cssFilePath) ||
        source === cssFilePath ||
        source.endsWith(cssFilePath.replace(/^\.\//, '')) ||
        source === cssFilePath.replace(/^\.\//, '')
      ) {
        // 检查是否有默认导入或命名导入
        const hasDefaultImport = node.specifiers.some(
          spec => spec.type === 'ImportDefaultSpecifier',
        )
        const hasNamedImport = node.specifiers.some(
          spec =>
            spec.type === 'ImportSpecifier' ||
            spec.type === 'ImportNamespaceSpecifier',
        )

        return hasDefaultImport || hasNamedImport
      }
    }

    return false
  } catch (error) {
    // 如果解析失败，默认返回false（普通样式导入）
    console.warn('Failed to parse CSS import:', error)
    return false
  }
}

export function wrapComponentCode(
  code: string,
  externals: Record<string, string>,
) {
  return `
(function(originalRequire) {
  const __LC__EXTERNALS__ = ${JSON.stringify(externals)}
  const ${LC_MODULE} = {}
  window.${LC_MODULE} = ${LC_MODULE}
  const require = (moduleName) => {
    // 其次使用内网的require
    if(${LC_MODULE}[moduleName]) {
      const module = ${LC_MODULE}[moduleName]
      if(module.__esModule && module.default) {
        return module.default
      }  else {
        return ${LC_MODULE}[moduleName]
      }
    }
  // 优先使用外部的require
    if(typeof originalRequire !== 'undefined' && originalRequire?.(moduleName)) {
      return originalRequire(moduleName)
    }
  // 最后使用外部的window
    if(window[__LC__EXTERNALS__[moduleName]]) {
      return window[__LC__EXTERNALS__[moduleName]]
    }
  if(window[moduleName]) {
    return window[moduleName]
  }
    console.warn(\`[Compiler] 未找到匹配的文件: \${moduleName}\`)
  }


__LC_MODULE__['react/jsx-runtime'] = {
  Fragment: require('react').Fragment,
  jsx: require('react').createElement,
  jsxs: require('react').createElement
};

  ${code}
}(typeof require !== 'undefined' ? require : null));
`
}
