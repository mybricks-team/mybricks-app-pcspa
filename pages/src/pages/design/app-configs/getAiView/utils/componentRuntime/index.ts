// ------ taro ------
import babelPlugins from './babelPlugins'
import getDependencies from './getDependencies'

export default {
  babelPlugins,
  getDependencies,
  entryFile: 'app.config.ts',
  canvas: {
    width: 414,
    height: 896
  }
}