import AIPlugin, { createCustomRequest } from '@mybricks/plugin-ai'
import componentRuntime from './componentRuntime'
import promptSections from './promptSections'
import { createApiDocTool } from './tools/api-doc'
import { createOperateApiTool } from './tools/operate-api'

const requestCustom = typeof createCustomRequest === 'function'
  ? createCustomRequest({
   
    })
  : null


export default ({ user, key }: any) => {
const apiDocTool = createApiDocTool(key)
const operateApiTool = createOperateApiTool(key)

  return AIPlugin({
  user,
  key,
  onRequest: async (params: any) => {
    return requestCustom(params)
  },
  tools: [apiDocTool, operateApiTool],
  // ------ taro ------
  componentRuntime,
  promptSections
})
}
