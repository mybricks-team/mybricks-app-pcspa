import { ICON_NAMES } from './iconNames'
import validator from './validator'

const usageMd: string = require('./usage.md').default

export default {
  readme: usageMd + '\n\n## 可用图标列表\n' + ICON_NAMES.join(', '),
  validator,
}
