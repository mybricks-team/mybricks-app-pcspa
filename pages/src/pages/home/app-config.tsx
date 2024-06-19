import React, { useEffect, useState } from 'react'
import { message, Tooltip } from 'antd'
import servicePlugin, {
  call as callConnectorHttp,
  mock as connectorHttpMock,
} from '@mybricks/plugin-connector-http'
import domainServicePlugin, {
  call as callDomainHttp,
} from '@mybricks/plugin-connector-domain'
// import { openFilePanel } from "@mybricks/sdk-for-app/ui";
import versionPlugin from 'mybricks-plugin-version'
import localePlugin from '@mybricks/plugin-locale'
// import notePlugin from '../../../../../plugin-note'
import notePlugin from '@mybricks/plugin-note'
import { use as useTheme } from '@mybricks/plugin-theme'
import { openFilePanel } from '@mybricks/sdk-for-app/ui'

import comlibLoaderFunc from './configs/comlibLoader'
import { comLibAdderFunc } from './configs/comLibAdder'
import CollaborationHttp from './plugin/collaboration-http'
import { runJs } from '../../utils/runJs'

import axios from 'axios'
import { shapeUrlByEnv } from '../../utils'
import { EnumMode } from './components/PublishModal'
import {
  GET_DEFAULT_PAGE_HEADER,
  GET_PAGE_CONFIG_EDITOR,
  USE_CUSTOM_HOST,
} from './constants'
import { fAxios } from '@/services/http'
import { createFromIconfontCN } from '@ant-design/icons'
import download from '@/utils/download'
import upload from '@/utils/upload'
import searchUser from '@/utils/searchUser'
import { blobToBase64 } from '@/utils/blobToBase64'
import {
  DESIGN_MATERIAL_EDITOR_OPTIONS,
  mergeEditorOptions,
  PURE_INTERNET_EDITOR_OPTIONS,
} from './editor-options'
// import { render as renderUI  } from '@mybricks/render-web';
import { isValidPascalCase } from './utils'
import OutCodeDirList, { OutCodeDirListType } from './components/out-code-dir-list'
import { getLocalData, setLocalData } from './utils/fileSystemHandle'
import { comlibDebugUtils } from './utils/comlibDebug'
import { EnumLocale, getLocaleLang } from '../setting/App/I18nConfig/utils'

const defaultPermissionComments = `/**
*
* interface Props {
*   key: string // 权限key
* }
*
* @param {object} props: Props
* @return {boolean \\ { permission: boolean, type: "hide" | "hintLink", hintLinkUrl?: string, hintLinkTitle?: string }}
*/
`

const defaultPermissionFn = `export default function ({ key }) {
  return true
}
`
const getComs = () => {
  const comDefs = {}
  const regAry = (comAray) => {
    comAray.forEach((comDef) => {
      if (comDef.comAray) {
        regAry(comDef.comAray)
      } else {
        comDefs[`${comDef.namespace}-${comDef.version}`] = comDef
      }
    })
  }

  const comlibs = [
    ...(window['__comlibs_edit_'] || []),
    ...(window['__comlibs_rt_'] || []),
  ]
  comlibs.forEach((lib) => {
    const comAray = lib.comAray
    if (comAray && Array.isArray(comAray)) {
      regAry(comAray)
    }
  })
  return comDefs
}

const getDomainFromPath = (path: string) => {
  if (!path) return path
  if (path.startsWith('http') || path.startsWith('https')) {
    const [protocol, url] = path.split('//')
    const domain = url.split('/')[0]
    return `${protocol}//${domain}`
  } else {
    return location.origin
  }
}

const injectUpload = (
  editConfig: Record<string, any>,
  uploadService: string,
  manateeUserInfo: { token: string; session: string },
  fileId: string
) => {
  if (!!editConfig && !editConfig.upload) {
    editConfig.upload = async (files: Array<File>): Promise<Array<string>> => {
      /**
       * @description 图片上传支持返回Base64
       */
      if (editConfig.options?.useBase64) {
        try {
          const b64 = await blobToBase64(files[0])
          return [b64]
        } catch (e) {
          throw Error(`【图片转Base64出错】: ${e}`)
        }
      }
      // =========== 图片上传支持返回Base64 end ===============

      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('folderPath', `/files/${fileId}`)

      const useConfigService = !!uploadService

      if (!useConfigService) {
        uploadService = '/paas/api/flow/saveFile'
      }

      try {
        const res = await axios<any, any>({
          url: uploadService,
          method: 'post',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            ...manateeUserInfo,
          },
        })
        const { status, data, message, code } = res.data

        if (status === 200 || code === 1) {
          let url = ''
          if (Array.isArray(data)) {
            url = data?.[0]?.url
          } else {
            url = data.url
          }
          if (!url) {
            throw Error(`没有返回图片地址`)
          }
          const staticUrl = /^http/.test(url)
            ? url
            : `${getDomainFromPath(uploadService)}${url}`
          return [staticUrl].map((url) => url.replace('https', 'http'))
        }

        throw Error(`【图片上传出错】: ${message}`)
      } catch (error) {
        message.error(error.message)
        return []
      }
    }
  }
}

const CUSTOM_HOST_TITLE = `自定义域名`
const DOMAIN_APP_NAMESPACE = 'mybricks-domain'

const isReact = APP_TYPE === 'react'

const getExecuteEnvByMode = (debugMode, ctx, envList) => {
  if (debugMode === EnumMode.DEFAULT) {
    ctx.executeEnv = ''
  } else if (
    debugMode === EnumMode.ENV &&
    (!ctx.executeEnv || !envList.find((item) => item.name === ctx.executeEnv))
  ) {
    ctx.executeEnv = envList[0].name
  } else if (debugMode === EnumMode.CUSTOM) {
    ctx.executeEnv = USE_CUSTOM_HOST
  }
}

export default function (ctx, appData, save, designerRef, remotePlugins = []) {
  const envList = ctx.envList
  // 获得环境信息映射表
  const envMap = [
    ...envList,
    { name: USE_CUSTOM_HOST, title: CUSTOM_HOST_TITLE },
  ].reduce((res, item) => {
    res[item.name] = item.title
    return res
  }, {})

  const domainApp = appData.installedApps.find(
    (app) => app.namespace === DOMAIN_APP_NAMESPACE
  )

  ctx.debugMode =
    ctx.executeEnv === USE_CUSTOM_HOST
      ? EnumMode.CUSTOM
      : envList.length > 0
        ? EnumMode.ENV
        : EnumMode.DEFAULT

  getExecuteEnvByMode(ctx.debugMode, ctx, envList)

  const createMockConfigEditor = (field, title, description) => {
    return {
      title: title,
      type: 'mapCheckbox',
      options: {
        kType: 'auto',
        displayType: 'button',
        addTip: '添加',
        title: title,
      },
      description: description,
      value: {
        get() {
          return ctx.debugMockConfig[field]
        },
        //每个字段的数据结构为{ key, value, checked }
        set(context, v) {
          ctx.debugMockConfig[field] = v
        },
      },
    }
  }

  const debugModeOptions =
    envList.length > 0
      ? [
        { label: '选择环境', value: EnumMode.ENV },
        { label: '自定义域名', value: EnumMode.CUSTOM },
      ]
      : [
        { label: '默认', value: EnumMode.DEFAULT },
        { label: '自定义域名', value: EnumMode.CUSTOM },
      ]

  const adder: Array<{
    type: string
    title: string
    inputs?: { id: string; title: string; schema: Record<string, string> }[]
    template?: Record<string, any>
  }> = [
      {
        type: 'normal',
        title: '页面',
        inputs: [
          {
            id: 'open',
            title: '打开',
            schema: {
              type: 'any',
            },
          },
        ],
      },
    ]
  if (isReact) {
    adder.push(
      ...[
        {
          type: 'popup',
          title: '对话框',
          template: {
            namespace: 'mybricks.basic-comlib.popup',
            deletable: false,
            asRoot: true,
          },
        },
        {
          type: 'popup',
          title: '抽屉',
          template: {
            namespace: 'mybricks.basic-comlib.drawer',
            deletable: false,
            asRoot: true,
          },
        },
        {
          type: 'popup',
          title: '打印对话框',
          template: {
            namespace: 'mybricks.normal-pc.print',
            deletable: false,
            asRoot: true,
          },
        },
      ]
    )
  }

  const getCurrentLocale = () => {
    return getLocaleLang(ctx?.appConfig?.localeConfig)
  }

  const connetorPlugins: any[] = [
    servicePlugin({
      isPrivatization: ctx.setting?.system.config?.isPureIntranet === true,
      addActions: domainApp
        ? [
          {
            type: 'http-sql',
            title: '领域接口',
            noUseInnerEdit: true,
            getTitle: (item) => {
              return item.content?.domainServiceMap
                ? item.content.title
                : `${item.content.title || ''}(未选择)`
            },
            render: (props) => {
              return (
                <CollaborationHttp
                  {...props}
                  openFileSelector={() =>
                    openFilePanel({
                      allowedFileExtNames: ['domain'],
                      parentId: ctx.sdk.projectId,
                      fileId: ctx.fileId,
                    })
                  }
                />
              )
            },
          },
        ]
        : void 0,
    }),
  ]
  if (domainApp) {
    connetorPlugins.push(
      domainServicePlugin({
        openFileSelector() {
          return openFilePanel({
            allowedFileExtNames: ['domain'],
            parentId: ctx.sdk.projectId,
            fileId: ctx.fileId,
          })
        },
      })
    )
  }
  return {
    // debugger(json, opts) {
    //   return renderUI(json, opts)
    // },
    shortcuts: {
      'ctrl+s': [save],
    },
    plugins: [
      ...connetorPlugins,
      notePlugin({
        user: ctx.user,
        onUpload: async (file: File) => {
          return new Promise(async (resolve, reject) => {
            const { manateeUserInfo, fileId } = ctx
            let uploadService = ctx.uploadService
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folderPath', `/files/${fileId}`)

            const useConfigService = !!uploadService

            if (!useConfigService) {
              uploadService = '/paas/api/flow/saveFile'
            }

            try {
              const res = await axios<any, any>({
                url: uploadService,
                method: 'post',
                data: formData,
                headers: {
                  'Content-Type': 'multipart/form-data',
                  ...manateeUserInfo,
                },
              })
              const { data = {} } = res.data
              const { url } = data
              if (!url) {
                reject(`没有返回图片地址`)
              }
              const staticUrl = /^http/.test(url)
                ? url
                : `${getDomainFromPath(uploadService)}${url}`
              resolve({ url: staticUrl })
              reject(`【图片上传出错】: ${message}`)
            } catch (error) {
              message.error(error.message)
              reject(error)
            }
          })
        },
        onSearchUser: (keyword: string) => {
          return new Promise(async (resolve, reject) => {
            try {
              const res = await searchUser(`api/pcpage/searchUser`, {
                keyword,
              })
              // @ts-ignore
              const formatRes = (res || []).map((item) => {
                const { email, id, name, avatar } = item
                return {
                  name: name ? `${name}(${email})` : email,
                  id,
                  username: email,
                  orgDisplayName: '',
                  thumbnailAvatarUrl: avatar,
                }
              })
              resolve(formatRes)
            } catch (e) {
              message.error('搜索用户失败!')
              reject('搜索用户失败!')
            }
          })
        },
      }),
      localePlugin({
        defaultPackLink: ctx?.appConfig?.localeConfig?.defaultI18nLink || '/mybricks-app-pcspa/public/i18n-example.json',
        onPackLoad: ({ i18nLangContent }) => {
          ctx.i18nLangContent = i18nLangContent
        },
        onUsedIdChanged: ({ ids }) => {
          ctx.i18nUsedIdList = ids
        },
      }),
      ...remotePlugins,
      useTheme({ sdk: appData }),
      ...(ctx.isPreview ? [] : [versionPlugin({
        user: ctx.user,
        file: appData.fileContent || {},
        disabled: ctx.disabled,
        needSavePreview: true,
        needPublishRevert: true,
        envMap,
        onInit: (versionApi) => {
          ctx.versionApi = versionApi
        },
        onRevert: async (params: {
          pubAssetFilePath: string
          nowVersion: string
          fileId: number
          type: string
        }) => {
          const { fileId, nowVersion, pubAssetFilePath, type } = params
          try {
            const finish = message.loading('正在回滚...', 0)
            const res: { code: number; message: string } = await fAxios.post(
              '/api/pcpage/rollback',
              {
                filePath: pubAssetFilePath,
                nowVersion,
                type,
                fileId,
              }
            )
            finish()

            if (res.code === 1) {
              message.success(res.message)
            } else {
              message.error('回滚失败！')
            }
          } catch (e) {
            message.error('回滚失败！')
          }
        },
        modalActiveExtends: [
          {
            type: 'publish',
            title: (
              <Tooltip
                color="white"
                title={
                  <a
                    target="_blank"
                    href="https://docs.mybricks.world/docs/publish-integration/kjkj/"
                  >
                    使用说明
                  </a>
                }
              >
                下载
              </Tooltip>
            ),
            onClick({ fileId, type: envType, version }) {
              const loadend = message.loading(`版本 ${version} 下载中...`, 0)
              download(
                `api/pcpage/download-product/${fileId}/${envType}/${version}`
              ).finally(() => {
                loadend()
              })
            },
          },
        ],
      }),])
    ],
    ...(ctx.hasMaterialApp
      ? {
        comLibAdder: comLibAdderFunc(ctx),
      }
      : {}),
    comLibLoader: comlibLoaderFunc(ctx),
    pageContentLoader() {
      //加载页面内容
      return new Promise((resolve, reject) => {
        const content = appData.fileContent?.content || {}

        // 避免修改原始数据
        const _content = { ...content }
        delete _content.comlibs

        resolve(_content)
      })
    },
    toplView: {
      title: '交互',
      cards: {
        main: {
          title: '页面',
          inputs: [
            {
              id: 'open',
              title: '打开',
              schema: {
                type: 'any',
              },
            },
          ],
        },
      },
      globalIO: {
        startWithSingleton: true,
      },
      vars: {},
      fx: {},
      useStrict: false,
    },
    editView: {
      editorAppender(editConfig) {
        editConfig.fontJS = ctx.fontJS
        injectUpload(
          editConfig,
          ctx.uploadService,
          ctx.manateeUserInfo,
          ctx.fileId
        )
        return
      },
      items({ }, cate0, cate1, cate2) {
        cate0.title = `项目`
        cate0.items = [
          {
            items: [
              {
                title: '名称',
                type: 'Text',
                //options: {readOnly: true},
                value: {
                  get: (context) => {
                    return ctx.fileName
                  },
                  set: (context, v: any) => {
                    if (v !== ctx.fileName) {
                      ctx.fileName = v
                    }
                  },
                },
              },
              {
                title: '文件路径',
                type: 'Text',
                options: { readOnly: true },
                value: {
                  get: (context) => {
                    return ctx.absoluteNamePath
                  },
                  set: (context, v: any) => {
                    if (v !== ctx.absoluteNamePath) {
                      ctx.absoluteNamePath = v
                    }
                  },
                },
              },
            ],
          },
          {
            title: '全局方法',
            items: [
              {
                title: '权限校验',
                type: 'code',
                description: '设置权限校验方法，调试模式下默认不会启用',
                options: {
                  title: '权限校验',
                  comments: defaultPermissionComments,
                  displayType: 'button',
                },
                value: {
                  get() {
                    return decodeURIComponent(
                      ctx?.hasPermissionFn ||
                      encodeURIComponent(defaultPermissionFn)
                    )
                  },
                  set(context, v: string) {
                    ctx.hasPermissionFn = encodeURIComponent(v)
                  },
                },
              },
            ],
          },
          {
            title: '调试',
            items: [
              {
                title: '直连',
                type: 'Switch',
                description: '直连模式下服务接口访问将直接请求，不再走代理',
                value: {
                  get() {
                    return ctx.directConnection
                  },
                  set(_, value) {
                    ctx.directConnection = value
                  },
                },
              },
              {
                title: '调试模式',
                type: 'Radio',
                description: '选择配置接口前缀域名的方式',
                options: debugModeOptions,
                value: {
                  get() {
                    return ctx.debugMode
                  },
                  set(_, value) {
                    ctx.debugMode = value
                    getExecuteEnvByMode(value, ctx, envList)
                  },
                },
              },
              {
                title: '调试环境',
                type: 'select',
                description:
                  '所选环境对应的域名将拼接到接口地址前，发布时的环境不受此控制，你可以在应用配置处修改可选环境（需管理员权限）',
                ifVisible({ data }) {
                  return ctx.debugMode === EnumMode.ENV
                },
                options: {
                  options: envList.map((item) => ({
                    value: item.name,
                    label: item.title,
                  })),
                  placeholder: '请选择调试环境',
                },
                value: {
                  get() {
                    return ctx.executeEnv || ''
                  },
                  set(context, v) {
                    ctx.executeEnv = v
                  },
                },
              },
              {
                title: '自定义域名',
                description:
                  '自定义各个接口的域名，在接口中以{MYBRICKS_HOST.变量}的形式进行引用，发布后的页面需要主动在window.MYBRICKS_HOST对象上设置域名信息',
                type: 'map',
                ifVisible(info) {
                  return ctx.debugMode === EnumMode.CUSTOM
                },
                options: {
                  allowEmptyString: false,
                },
                value: {
                  get(info) {
                    if (!ctx.MYBRICKS_HOST) {
                      ctx.MYBRICKS_HOST = {}
                    } else if (!('default' in ctx.MYBRICKS_HOST)) {
                      ctx.MYBRICKS_HOST.default = 'https://your-domain-name.com'
                    }
                    return ctx.MYBRICKS_HOST
                  },
                  set(info, value) {
                    if (typeof value?.default === 'undefined') {
                      message.error('必须包含变量名为default的域名')
                    } else if (!value?.default) {
                      message.error('default域名不能为空')
                    } else if (Object.values(value).some((item) => !item)) {
                      message.error('域名不能为空')
                    } else {
                      ctx.MYBRICKS_HOST = value
                    }
                  },
                },
              },
              {
                title: '环境信息设置',
                description: '可以在应用配置处修改使用的环境',
                ifVisible({ data }) {
                  return ctx.debugMode === EnumMode.ENV
                },
                type: 'array',
                options: {
                  getTitle: (item) => {
                    return item.title
                  },
                  items: [
                    {
                      title: '环境标识(禁止修改)',
                      type: 'text',
                      value: 'name',
                      options: {
                        readonly: true,
                      },
                    },
                    {
                      title: '域名',
                      type: 'text',
                      value: 'value',
                    },
                  ],
                  addable: false,
                  deletable: false,
                  draggable: false,
                },
                value: {
                  get({ data, focusArea }) {
                    return ctx.envList
                  },
                  set({ data, focusArea, output, input, ...res }, value) {
                    ctx.envList = value
                  },
                },
              },
              {
                title: '权限校验',
                type: 'Switch',
                description: '调试模式下，是否开启权限校验',
                value: {
                  get() {
                    return ctx.debugHasPermissionFn
                  },
                  set(context, v) {
                    ctx.debugHasPermissionFn = v
                  },
                },
              },
              {
                title: '路由参数',
                type: 'code',
                description: '调试模式下，路由的参数配置',
                options: {
                  title: '编辑路由参数',
                  language: 'json',
                  width: 500,
                  minimap: {
                    enabled: false,
                  },
                  displayType: 'button',
                },
                value: {
                  get() {
                    return ctx.debugQuery
                      ? JSON.stringify(ctx.debugQuery, null, 2)
                      : '{}'
                  },
                  set(context: any, v: string) {
                    const jsonString = decodeURIComponent(v)
                    try {
                      const jsonData = JSON.parse(jsonString || '{}')
                      ctx.debugQuery = jsonData
                    } catch {
                      console.error('路由参数数据格式错误')
                    }
                  },
                },
              },
              {
                title: '主应用参数',
                type: 'code',
                description: '调试模式下，主应用参数配置',
                options: {
                  title: '编辑主应用参数',
                  language: 'json',
                  width: 500,
                  minimap: {
                    enabled: false,
                  },
                  displayType: 'button',
                },
                value: {
                  get() {
                    return ctx.debugMainProps
                      ? JSON.stringify(ctx.debugMainProps, null, 2)
                      : '{}'
                  },
                  set(context: any, v: string) {
                    const jsonString = decodeURIComponent(v)
                    try {
                      const jsonData = JSON.parse(jsonString || '{}')
                      ctx.debugMainProps = jsonData
                    } catch {
                      console.error('主应用参数数据格式错误')
                    }
                  },
                },
              },
              createMockConfigEditor(
                'localStorageMock',
                'localStorage模拟',
                '调试模式下，localStorage模拟'
              ),
              createMockConfigEditor(
                'sessionStorageMock',
                'sessionStorage模拟',
                '调试模式下，sessionStorage模拟'
              ),
              {
                title: '调试组件库',
                type: 'mapCheckbox',
                ifVisible({ data }) {
                  return ctx.debugComlib;
                },
                options: {
                  kType: 'auto',
                  displayType: 'button',
                  addTip: '添加',
                  title: '调试组件库',
                },
                value: {
                  get() {
                    return comlibDebugUtils.get()
                  },
                  //每个字段的数据结构为{ key, value, checked }
                  set(context, v) {
                    comlibDebugUtils.set(v)
                  },
                },
              }
            ],
          },
          {
            items: [
              {
                title: 'iconfont js链接',
                type: 'Text',
                description: '设置iconfont js链接',
                value: {
                  get() {
                    return ctx.fontJS
                  },
                  set(context, v: string) {
                    ctx.fontJS = v
                    createFromIconfontCN({
                      scriptUrl: v, // 在 iconfont.cn 上生成
                    })
                  },
                },
              },
            ],
          },
        ]
        if (!ctx.pageHeader) {
          ctx.pageHeader = GET_DEFAULT_PAGE_HEADER(appData)
        }
        const pageConfigEditor = GET_PAGE_CONFIG_EDITOR(ctx)
        cate1.title = pageConfigEditor.title
        cate1.items = pageConfigEditor.items

        cate2.title = `出码`
        cate2.items = [
          {
            title: '出码组件名',
            type: 'text',
            description: '需要大驼峰命名，如: TestCom',
            value: {
              get: () => {
                return ctx.componentName
              },
              set: (_: any, componentName: string) => {
                if (componentName && !isValidPascalCase(componentName)) {
                  message.error('出码组件名需要大驼峰命名，如: TestCom')
                } else {
                  ctx.componentName = componentName
                }
              },
            },
          },
          // {
          //   title: '静态资源是否上传CDN',
          //   description: '使用此功能前，需先配置上传接口',
          //   type: 'switch',
          //   value: {
          //     get: () => {
          //       return ctx.staticResourceToCDN
          //     },
          //     set: (_: any, staticResourceToCDN: boolean) => {
          //       ctx.staticResourceToCDN = staticResourceToCDN
          //     },
          //   },
          // },
          () => {
            const [value, setValue] = useState<OutCodeDirListType>([]);
            useEffect(() => {
              getLocalData().then(localData => {
                setValue(localData.outCodeDirList || [])
              });
            }, [])
            return <OutCodeDirList
              constantContext={ctx}
              variableContext={ctx}
              handleContext={{ ...ctx, handleSaveButtonClick: save, getToJson: () => designerRef.current.toJSON({ onlyDiff: true }) }}
              value={value}
              onChange={value => {
                setLocalData({ outCodeDirList: value })
                setValue(value)
              }}
            />
          },
        ]
      },
      editorOptions: mergeEditorOptions([
        !!ctx.setting?.system.config?.isPureIntranet &&
        PURE_INTERNET_EDITOR_OPTIONS,
        DESIGN_MATERIAL_EDITOR_OPTIONS(ctx),
      ]),
    },
    com: {
      env: {
        // renderCom(json, opts, coms) {
        //   return renderUI(
        //     json,
        //     {
        //       comDefs: { ...getComs(), ...coms },
        //       observable: window["mybricks"].createObservable,
        //       ...(opts || {}),
        //       env: {
        //         ...(opts?.env || {}),
        //         edit: false,
        //         runtime: true
        //       }
        //     }
        //   )
        // },
        i18n(title) {
          if (typeof title === 'string') return title
          const i18nLangContent = ctx.i18nLangContent || {}
          // 搭建页面使用中文
          return (
            i18nLangContent[title?.id]?.content?.[getCurrentLocale()]
            || i18nLangContent[title?.id]?.content?.['zh-CN']
            || JSON.stringify(title)
          )
        },
        /** 调用领域模型 */
        callDomainModel(domainModel, type, params) {
          return callDomainHttp(domainModel, params, { action: type } as any)
        },
        callConnector(connector, params, connectorConfig: any = {}) {
          const plugin = designerRef.current?.getPlugin(connector.connectorName)
          if (
            ctx.executeEnv === USE_CUSTOM_HOST &&
            !ctx.MYBRICKS_HOST.default
          ) {
            throw new Error(`自定义域名必须设置default域名`)
          }
          let newParams = params
          if (ctx.executeEnv === USE_CUSTOM_HOST) {
            if (params instanceof FormData) {
              newParams.append(
                'MYBRICKS_HOST',
                JSON.stringify(ctx.MYBRICKS_HOST)
              )
            } else if (Array.isArray(newParams)) {
              newParams['MYBRICKS_HOST'] = { ...ctx.MYBRICKS_HOST }
            } else if (typeof newParams === 'object') {
              newParams = { ...params, MYBRICKS_HOST: { ...ctx.MYBRICKS_HOST } }
            }
          }
          if (!plugin) {
            /** 启动 Mock */
            if (connectorConfig?.openMock) {
              return connectorHttpMock({ ...connector, ...connectorConfig })
            }

            //服务接口类型
            return callConnectorHttp(
              {
                ...connector,
                script: connector.script,
                useProxy: !ctx.directConnection,
              },
              newParams,
              {
                ...connectorConfig,
                before: (options) => {
                  return {
                    ...options,
                    url: shapeUrlByEnv(
                      envList,
                      ctx.executeEnv,
                      options.url,
                      ctx.MYBRICKS_HOST
                    ),
                  }
                },
              }
            )
          } else {
            return plugin.callConnector(
              { ...connector, useProxy: !ctx.directConnection },
              newParams,
              {
                ...connectorConfig,
                before: (options) => {
                  return {
                    ...options,
                    url: shapeUrlByEnv(
                      envList,
                      ctx.executeEnv,
                      options.url,
                      ctx.MYBRICKS_HOST
                    ),
                  }
                },
              }
            )
          }
        },
        vars: {
          get getExecuteEnv() {
            return () => ctx.executeEnv
          },
          get i18nLangContent() {
            return ctx.i18nLangContent || {}
          },
          get locale() {
            return getCurrentLocale()
          },
          getQuery: () => ({ ...(ctx.debugQuery || {}) }),
          getProps: () => ({ ...(ctx.debugMainProps || {}) }),
          get getRouter() {
            const toast = (info: string) => {
              message.info(info)
            }
            return () => ({
              reload: () => toast('reload'),
              redirect: ({ url }: { url: string }) => toast(`redirect: ${url}`),
              back: () => toast('back'),
              forward: () => toast('forward'),
              pushState: ({
                state,
                title,
                url,
              }: {
                state: any
                title: string
                url: string
              }) =>
                toast(`pushState: ${JSON.stringify({ state, title, url })}`),
              openTab: ({ url, title }: { url: string; title: string }) =>
                toast(`open a new tab: ${JSON.stringify({ url, title })}`),
            })
          },
          get getCookies() {
            return () => {
              return {}
            }
          },
        },
        get uploadFile() {
          return async (files) => {
            if (!ctx.runtimeUploadService) {
              message.warn('请先配置运行时上传接口')
              return
            }
            // 创建FormData对象
            const formData = new FormData()

            // 添加文件到FormData对象
            for (const file of files) {
              formData.append('file', file)
            }

            try {
              // 发送POST请求
              const response = await fetch(ctx.runtimeUploadService, {
                method: 'POST',
                body: formData,
              }).then((res) => {
                if (res.status !== 200 && res.status !== 201) {
                  throw new Error(`上传失败！`)
                }
                return res.json()
              })
              console.log(`res,`, response)
              return {
                url: response?.data?.url,
                name: files[0].name,
              }
            } catch (error) {
              message.error(`上传失败，请检查上传接口设置！`)
              // 错误处理
              console.error('文件上传失败', error)
              return {}
            }
          }
        },
        get hasPermission() {
          return ({ permission, key }) => {
            const hasPermissionFn = ctx?.hasPermissionFn

            if (!ctx.debugHasPermissionFn) {
              return true
            }

            if (!hasPermissionFn) {
              return true
            }

            // 编辑权限配置为”无“时，不需要进行权限校验
            if (permission?.type === 'none') {
              return true
            }

            const code = permission?.register?.code || key

            // 如果没有权限编码，不需要校验
            if (code === undefined) {
              return true
            }

            let result: boolean | { permission: boolean }

            try {
              result = runJs(decodeURIComponent(hasPermissionFn), [
                { key: code },
              ])

              if (
                typeof result !== 'boolean' &&
                typeof result?.permission !== 'boolean'
              ) {
                result = true
                designerRef.current?.console?.log.error(
                  '权限方法',
                  `权限方法返回值类型应为 Boolean 或者 { permission: Boolean } 请检查，[Key] ${code};[返回值] Type: ${typeof result}; Value: ${JSON.stringify(result)}`
                )
                console.error(
                  `权限方法返回值类型应为 Boolean 或者 { permission: Boolean } 请检查，[Key] ${code};[返回值] Type: ${typeof result}; Value: ${JSON.stringify(result)}`
                )
              }
            } catch (error) {
              result = true
              designerRef.current?.console?.log.error(
                '权限方法',
                `${error.message}`
              )
              console.error(`权限方法出错[Key] ${code};`, error)
            }

            return result
          }
        },
      },
      events: [
        //配置事件
        {
          type: 'jump',
          title: '跳转到',
          exe({ options }) {
            const page = options.page
            if (page) {
              window.location.href = page
            }
          },
          options: [
            {
              id: 'page',
              title: '页面',
              editor: 'textarea',
            },
          ],
        },
      ],
    },
    geoView: {
      scenes: {
        adder,
      },
      theme: {
        css: [
          'public/antd/antd@4.21.6.variable.min.css',
          ...(!isReact ? ['./public/elementUI/element@2.15.14.css'] : []),
        ],
      },
    },
  }
}
