import { ICON_NAMES } from './iconNames'
import validator from './validator'

const usageMd: string = require('./usage.md').default

export default {
  name: '@nutui/icons-react-taro',
  version: '3.0.2-cpp.3.beta.9',
  readme: usageMd + '\n\n## 可用图标列表\n' + ICON_NAMES.join(', '),
  validator,
}
