import AIPlugin, { IDBHistory } from '@mybricks/plugin-ai'
import skills from './skills'
import { getDependenciesConfig } from '@/pages/design/utils/aiConfigManifest'
import { onRequest } from '@/utils/aiRequest'
import { getAISetting } from "../../../hooks/useAISetting/storage";

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

export default ({ requestAsStream, user, key, guidePrompt, enableDefaultEventFlow, config, plugins = [], manifest }: any) => {
  const designRules = manifest?.rules?.designRules
  const codeRules = manifest?.rules?.codeRules

  // 从 localStorage 读取用户保存的 LLM 配置
  const savedSettings = getAISetting();
  // 平台默认
  const defaultProvider = {
    providerId: "auto",
    models: [
      { id: "kimi-k2.7-code-highspeed", name: "kimi-k2.7-code-highspeed" },
      { id: "kimi-k2.6", name: "kimi-k2.6" },
      { id: "kimi-k2.7-code", name: "kimi-k2.7-code" },
      { id: "deepseek-v4-pro", name: "deepseek-v4-pro" },
      { id: "deepseek-v4-flash", name: "deepseek-v4-flash" },
      { id: "glm-5.2", name: "glm-5.2" },
    ],
    request: onRequest,
  };
  // 用户配置的 providers
  const userProviders = savedSettings.providers || [];
  // 按渠道决定 providers：custom 走用户自定义，其余走平台兜底
  const effectiveProviders = savedSettings.channel === "custom" ? userProviders : [defaultProvider];

  return AIPlugin({
    // requestAsStream,
    user,
    isMutiCanvas: false,
    deviceType: 'desktop',
    config,
    key,
    llm:{
      providers: effectiveProviders,
    },
    plugins,
    skills: [...skills, ...(manifest?.skills || [])],
    componentRuntime: {
      workspace: {
        coder: {
          loaderConfig: {
            paths: {
              vs: './public/monaco-editor/0.45.0/min/vs'
            }
          },
          eslint: {
            src: './public/eslint/8.15.0/eslint.js',
            config: {
              env: {
                browser: true,
                es6: true,
              },
              parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
              },
            },
          },
          jsxHighlight: {
            customTypescriptUrl: `${location.origin}/public/typescript/4.6.4/typescript.min.js`
          }
        }
      },
      getDependencies: getDependenciesConfig(manifest?.dependencies)
    },
    promptSections: {
      designGuide: designRules ? {
        firstOfAll: designRules
      } : undefined,
      developeGuide: codeRules ? {
        firstOfAll: codeRules
      } : undefined,
    }
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
}
