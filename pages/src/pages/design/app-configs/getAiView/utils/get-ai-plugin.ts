import AIPlugin from '@mybricks/plugin-ai'
import context from './context'
import getDependencies from './getDependencies'
import babelPlugins from './babelPlugins'
import getTools from './tools'
import promptSections from './promptSections'

let canvasUpdate: (appConfig) => void = () => {}

export default ({ user, key, plugins = [], designerRef }: any) => {
  const aiPlugin = AIPlugin({
    promptSections,
    user,
    key,
    plugins,
    tools: [
      ...getTools({
        requestAI: params => {
          const comId = Object.keys(
            designerRef.current?.toJSON()?.scenes?.[0]?.coms,
          )[0]
          return aiPlugin.controller.requestAI(comId, params)
        },
      }),
    ],
    componentRuntime: {
      mode: 'prototype',
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
      getDependencies: () => {
        const dependencies = getDependencies()
        return {
          ...dependencies,
          _: {
            version: '1.0.0',
            module: {
              defineAppConfig(appConfig) {
                context.appConfig = appConfig
                canvasUpdate(appConfig)
              },
            },
            excludeFromPrompt: true,
          },
        }
      },
      babelPlugins: babelPlugins({ context }),
      canvas: {
        update: (fn: (appConfig) => void) => {
          canvasUpdate = fn
        },
      },
      eslint: {
        globals: {
          defineAppConfig: 'readonly',
        },
      },
      getUserContextMessage() {
        return [formatAppConfig(context.appConfig)]
      },
    }
  })

  return aiPlugin
}

function formatAppConfig(appConfig) {
  if (!appConfig)
    return [
      '<app-config>',
      '当前项目没有 app.config.ts 文件，必须先调用 ask_user_question 工具询问用户是否需要多端适配；如果用户只需要单端开发，仅配置一个对应的 viewports，并将 breakpoints 设置为空数组。',
      '</app-config>',
    ].join('\n')

  const sections: string[] = []

  sections.push(
    [
      '<视口配置>',
      'viewports 表示设计态可切换的画布宽度，仅用于预览和运行容器宽度控制，不代表需要生成媒体查询；viewports 是必填项，至少包含一个视口。',
      appConfig.viewports?.length
        ? JSON.stringify(appConfig.viewports, null, 2)
        : '当前 viewports 为空，这是无效配置；必须至少声明一个视口。',
      '</视口配置>',
    ].join('\n'),
  )

  sections.push(
    [
      '<断点配置>',
      'breakpoints 表示需要生成媒体查询的断点规则，是必填项但可以为空数组。只有 breakpoints 非空时，才允许在 less 中生成 @media 代码；breakpoints 为空数组时，禁止生成 @media 代码。',
      'breakpoints[].id 是断点规则唯一标识，宽度适配场景建议与 viewports[].id 保持一致；breakpoints[].media 表示媒体查询条件，如 { maxWidth: 480 } 对应 @media (max-width: 480px)。',
      appConfig.breakpoints?.length
        ? JSON.stringify(appConfig.breakpoints, null, 2)
        : '当前 breakpoints 为空数组，请直接按当前视口编写默认样式，不要编写媒体查询。',
      '</断点配置>',
    ].join('\n'),
  )

  return ['<app-config>', sections.join('\n\n'), '</app-config>'].join('\n')
}
