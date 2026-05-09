// import { rollup } from '@rollup/browser'
import { createLoaderPlugin } from './plugins'
import type { TCompilerOptions } from './type'
import { log, transformJSX } from './utils'

const compile = async (options: TCompilerOptions) => {
  const {
    entry,
    files,
    target,
    external = {},
    name = 'component',
    externalModulesMatcher = [],
  } = options
  // @ts-expect-error rollup is injected on window at runtime
  if (typeof window?.rollup?.rollup !== 'function') {
    throw new Error('rollup is not loaded')
  }
  // @ts-expect-error rollup is injected on window at runtime
  const rollup = window.rollup.rollup
  const fileMap = await Object.keys(files).reduce(async (accPromise, key) => {
    const acc = await accPromise
    if (key.endsWith('.tsx') || key.endsWith('.jsx')) {
      acc[key] = await transformJSX(files[key], key)
    } else {
      acc[key] = files[key]
    }
    return acc
  }, Promise.resolve({}))
  log('Rollup bundle...', fileMap)
  const isESM = target === 'esm'
  const plugins = [
    createLoaderPlugin({
      sourceFiles: fileMap,
      enableESMCDN: false,
      externalModulesMatcher,
      external: { ...external },
    }),
  ]

  const bundle = await rollup({
    input: entry,
    plugins,
    treeshake: 'recommended',
    external: (id: string) => {
      const isExternal = !!external[id]
      log('external', id, isExternal, external)
      return isExternal
    },
    jsx: 'react-jsx',
  })

  log(`external:`, external)
  // 2. 生成代码
  log('🔨 生成打包代码...')
  const { output } = await bundle.generate({
    format: target,
    name,
    globals: isESM
      ? undefined
      : {
          ...external,
        },
  })

  const code = output[0].code
  log('生成的代码：\n', code)
  return code
}

export const compileToUMd = async (
  options: Omit<TCompilerOptions, 'target'>,
) => {
  const code = await compile({
    ...options,
    target: 'umd',
  })
  return code
}

export const compileToESM = async (
  options: Omit<TCompilerOptions, 'target'>,
) => {
  const code = await compile({
    ...options,
    target: 'esm',
  })
  return code
}
