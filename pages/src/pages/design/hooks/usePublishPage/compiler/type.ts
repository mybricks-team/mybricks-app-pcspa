export type ModuleMatcher = {
  matcher: (name: string) => boolean // 模块是否匹配
  resolve: (name: string, dependencies: Record<string, string>) => string // 匹配后对应的网址
  options?: any // 可选配置项，暂时为空
}
export type TCompilerOptions = {
  target: 'esm' | 'umd' | 'cjs'
  entry: string // 文件输入
  name?: string // 组件名称, 生成umd代码时需要
  files: Record<string, string> // 文件内容
  runableContainer?: string
  external?: Record<string, string> // 配置外部模块名称和window上对应的变量名
  innerExternal?: string[] // 只有内部才有的external库
  preload?: Record<string, string> // 构建时按需添加的模块，会被打包进最后代码中， 不必从外部获取，与external不同
  externalModulesMatcher?: Array<ModuleMatcher>
}

export const LC_MODULE = '__LC_MODULE__'
