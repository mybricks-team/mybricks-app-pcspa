import AIPlugin, { createCustomRequest } from '@mybricks/plugin-ai'
console.log('[AIPlugin]', AIPlugin)
import componentRuntime from './componentRuntime'
import promptSections from './promptSections'

const requestCustom = typeof createCustomRequest === 'function'
  ? createCustomRequest({
      provider: () => 'openai',
      apiUrl: () => 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      apiKey: () => 'ec89d011ef6e4ee6976c3fedf1e4cafe.eW9ez2gZqqDI9bRV',
      model: () => 'glm-4.6v',
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
