import AIPlugin, { IDBHistory } from '@mybricks/plugin-ai'
import skills from './skills'

const COMLIB_NAMESPACE_LITE = 'mybricks.normal-pc-lite'
const COMLIB_NAMESPACE_AI = 'mybricks.ai-comlib-pc'

/** Returns 'ai' when both lite and ai comlib namespaces exist in window.__comlibs_edit_, otherwise 'atomic'. */
function getGenerationStrategy(): 'ai' | 'atomic' {
  const comlibs = (typeof window !== 'undefined' && (window as any).__comlibs_edit_) as Array<{ namespace?: string }> | undefined
  if (!Array.isArray(comlibs) || comlibs.length === 0) return 'ai'
  const hasLite = comlibs.some((lib) => lib?.namespace === COMLIB_NAMESPACE_LITE)
  const hasAi = comlibs.some((lib) => lib?.namespace === COMLIB_NAMESPACE_AI)
  return hasLite && hasAi ? 'ai' : 'atomic'
}

export default ({ requestAsStream, user, key, guidePrompt, enableDefaultEventFlow, config, plugins = [] }: any) => AIPlugin({
  // requestAsStream,
  user,
  isMutiCanvas: false,
  deviceType: 'desktop',
  config,
  key,
  plugins,
  skills
  // componentRuntime: {
  //   chat: {
  //     agent: {
  //       key: "simple-chat",
  //       request: requestAsStreamInfra,
  //       history: new IDBHistory({
  //         dbName: "@plugin-ai/simple-chat",
  //       }),
  //       system: "你是一个闲聊助手",
  //     },
  //     panel: {
  //       user: {
  //         name: 'user',
  //         avatar: 'https://my.mybricks.world/default_avatar.png',
  //       },
  //       header: false,
  //       copilot: { name: 'MyBricks', avatar: 'https://my.mybricks.world/image/icon.png' }
  //     }
  //   }
  // }
  // onRequest: (params) => {
  //   return createRequestAsStream({ useInfra: false })?.(params)
  // },
  // llm: {
  //   providers: [{
  //     providerId: 'kimi',
  //     format: 'openai',
  //     baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
  //     apiKey: '',
  //     models: [{
  //       id: 'kimi-k2.6',
  //       name: 'kimi-k2.6'
  //     }]
  //   }]
  // },
  // ...commonCodePreset
})
