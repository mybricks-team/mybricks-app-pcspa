import AIPlugin, { createCustomRequest } from '@mybricks/plugin-ai'
import componentRuntime from './componentRuntime'
import promptSections from './promptSections'

const requestCustom = typeof createCustomRequest === 'function'
  ? createCustomRequest({
      provider: () => 'openai',
      apiUrl: () => '',
      apiKey: () => '',
      model: () => '',
    })
  : null

export default ({ user, key }: any) => AIPlugin({
  user,
  key,
  onRequest: async (params: any) => {
    return requestCustom(params)
  },
  // ------ taro ------
  componentRuntime,
  promptSections
})
