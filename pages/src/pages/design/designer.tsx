import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react'
import axios from 'axios'
import { fAxios } from '../../services/http'
import moment from 'moment'
import { message, Modal, Tooltip } from 'antd'
import API from '@mybricks/sdk-for-app/api'
import config from './app-configs/index'
import { fetchPlugins, removeBadChar } from '../../utils'
import {
  PC_NORMAL_COM_LIB,
  BASIC_COM_LIB,
  CHARS_COM_LIB,
  MySelf_COM_LIB,
  MY_SELF_ID,
} from '../../constants'
import { PreviewStorage } from './../../utils/previewStorage'
import unionBy from 'lodash/unionBy'
import PublishModal, { EnumMode } from './components/PublishModal'
import { createFromIconfontCN, InfoCircleTwoTone, DownloadOutlined, UploadOutlined, CloudUploadOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import { i18nLangContentFilter } from '../../utils/index'
import { usePageStayTime } from './utils/sendPageTimer'

import { DESIGNER_STATIC_PATH } from '../../constants'
import { GET_DEFAULT_PAGE_HEADER, USE_CUSTOM_HOST } from './constants'
import { getInitComLibs } from '../../utils/getComlibs'
import { proxLocalStorage, proxSessionStorage } from '@/utils/debugMockUtils'
import download from '@/utils/download'
import JSZip from 'jszip'
import {
  getMybricksStudioDB,
  initialSaveFileContent,
  addVersionContent,
} from './utils/saveContent'

import css from './app.less'
import {
  checkIfDebugComlib,
  comlibDebugUtils,
  replaceComlib,
} from './utils/comlibDebug'

import { preview as preview_icon } from './icon/preview'
import { publish as publish_icon } from './icon/publish'
import { branch as branch_icon } from './icon/branch'
import { code as code_icon } from './icon/code'
import classNames from 'classnames'
import { sendPageDeps } from './utils/sendPageDeps'
import { BranchMergeModal } from './components/branch-merge-modal'
import { useBranch } from './hooks/useBranch'
import { DesignerTitleBar, DesignerToolBar } from '@mybricks/sdk-for-app/ui'
import { usePublishPage } from './hooks/usePublishPage'
import PublishPageModal from './components/PublishPageModal'
import { preloadDependencies, getAllDependencies } from './app-configs/getAiView/utils/manifest'
import { useAiSourceCodeExport, useAiPrdExport } from './hooks/useCodeExport';
import useAISetting from './hooks/useAISetting';

const msgSaveKey = 'save'

/**
 * @description 获取当前应用setting
 * @returns object
 */
const getAppSetting = async () => {
  const settings = await API.Setting.getSetting([APP_NAME])

  return settings[APP_NAME]?.config
}

async function getOrCreateDir(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = path.split('/').filter(Boolean)
  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

async function writeFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
  content: string,
): Promise<void> {
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? ''
  if (!fileName) return
  const dir =
    parts.length > 0 ? await getOrCreateDir(root, parts.join('/')) : root

  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export default function MyDesigner({ appData: originAppData }) {
  const toolbarRef = useRef()
  const titleRef = useRef()
  window.fileId = originAppData.fileId
  window._disableSmartLayout = originAppData?.config?.['mybricks-app-pcspa']?.config?.feature?.disableSmartLayout; // 是否禁用智能布局

  const { branchInfo, branchName, mainFileId, getBranchInfoByMainFileId, getMainFileId } = useBranch()

  const [publishPageModalVisible, setPublishPageModalVisible] = useState(false)

  const appData = useMemo(() => {
    let data = { ...originAppData }
    const urlParams = new URLSearchParams(window.location.search)
    const previewTemplateId = urlParams.get('preview-template-id')
    // 防止触发originAppData.fileContent的getter计算
    if (previewTemplateId) {
      const dumpJson = JSON.parse(
        localStorage.getItem(`generate-page-dump-${previewTemplateId}`)
      )
      data.fileContent = {
        content: { content: dumpJson.content, ...dumpJson.pageConfig },
      }
    } else {
      data.fileContent = { ...data.fileContent }
    }
    return data
  }, [originAppData])

  useEffect(() => {
    if (appData?.fileId) {
      getBranchInfoByMainFileId(appData.fileId)
      getMainFileId(appData.fileId)
    }
  }, [appData?.fileId])

  // 查看特定版本或者指定为预览态时，展示预览态
  const isPreview =
    window.location.search.includes('version') || appData.isPreview

  const appConfig = useMemo(() => {
    let config = null
    try {
      const originConfig = appData.config[APP_NAME]?.config || {}
      config =
        typeof originConfig === 'string'
          ? JSON.parse(originConfig)
          : originConfig
      if (config?.ai) {
        try {
          config.ai = JSON.parse(decodeURIComponent(typeof config.ai === 'string' ? config.ai : JSON.stringify(config.ai)))
        } catch (error) {
          config.ai = {}
          console.error('parse ai config error', error)
        }
      }
    } catch (error) {
      console.error('get appConfig error', error)
    }
    return config || {}
  }, [appData.config[APP_NAME]?.config])

  useEffect(() => {
    setDependenciesSuccess(false)
    preloadDependencies(appConfig?.ai?.dependencies || []).then(() => {
      setDependenciesSuccess(true)
    })
  }, [appConfig?.ai?.dependencies?.schemaVersion])

  const { plugins = [] } = appConfig
  const uploadService = appConfig?.uploadServer?.uploadService || ''
  const runtimeUploadService =
    appConfig?.runtimeUploadServer?.uploadService || ''

  const [ctx, setCtx] = useState(() => {
    const envList = getMergedEnvList(appData, appConfig)

    const executeEnv = appData.fileContent?.content?.executeEnv || ''

    const debugMode =
      executeEnv === USE_CUSTOM_HOST
        ? EnumMode.CUSTOM
        : envList.length > 0
          ? EnumMode.ENV
          : EnumMode.DEFAULT

    // const fileContent = appData.fileContent?.content

    return {
      isPreview,
      sdk: {
        projectId: appData.projectId,
        openUrl: appData.openUrl,
      },
      user: appData.user,
      fileName: appData.fileContent?.name,
      pageHeader:
        appData.fileContent?.content?.pageHeader ||
        GET_DEFAULT_PAGE_HEADER(appData),
      absoluteNamePath: appData.hierarchy.absoluteNamePath,
      fileId: appData.fileId,
      version: appData.fileContent.version,
      setting: appData.config || {},
      hasMaterialApp: appData.hasMaterialApp,
      comlibs: [],
      latestComlibs: [],
      debugQuery: appData.fileContent?.content?.debugQuery,
      executeEnv,
      envList,
      i18nLangContentType:
        appData.fileContent?.content?.i18nLangContentType || 'lazy',
      i18nLangContent: {},
      i18nUsedIdList: [],
      debugMode,
      debugMockConfig: appData.fileContent?.content?.debugMockConfig || {
        debugQuery: [],
        debugProps: [],
        localStorageMock: [],
        debugHeaders: [],
        sessionStorageMock: [],
      },
      directConnection: appData.fileContent?.content?.directConnection || false,
      MYBRICKS_HOST: appData.fileContent?.content?.MYBRICKS_HOST || {},
      fontJS: appData.fileContent?.content?.fontJS,
      // 将新设置的环境附加到当前页面中，不能删除原有的环境
      debugMainProps: appData.fileContent?.content?.debugMainProps,
      hasPermissionFn: appData.fileContent?.content?.hasPermissionFn,
      debugHasPermissionFn: appData.fileContent?.content?.debugHasPermissionFn,
      // useAutoPreviewImage:
      //   typeof fileContent.useAutoPreviewImage === 'undefined'
      //     ? true
      //     : fileContent.useAutoPreviewImage,
      componentName: appData.fileContent.content.componentName,
      staticResourceToCDN: appData.fileContent.content.staticResourceToCDN,
      versionApi: null,
      appConfig,
      uploadService,
      runtimeUploadService,
      operable: false,
      isDebugMode: false,
      debug: checkIfDebugComlib(),
      saveContent(content) {
        ctx.save({ content })
      },
      async save(
        param: { name?; shareType?; content?; icon?},
        options?: {
          skipMessage?: boolean
          saveType?: string
        }
      ) {
        const { name, shareType, content, icon } = param

        const operationListStr = JSON.stringify(operationList.current.reverse())

        const settings = await getAppSetting()
        const isEncode = !!settings?.publishLocalizeConfig?.isEncode

        let res

        sendPageDeps(ctx, content)

        try {
          res = await appData.save({
            userId: ctx.user?.id,
            fileId: ctx.fileId,
            name,
            shareType,
            content: removeBadChar(content),
            isEncode,
            icon,
            operationList: operationListStr,
          })

          operationList.current = []

          if (name) {
            ctx.fileName = name
          }

          if (content) {
            setSaveTip(`改动已保存-${moment(new Date()).format('HH:mm')}`)
            toolbarRef.current.setSavedTime(Date.now())
          }

          // if (!options?.skipMessage) {
          //   console.log(
          //     `保存接口耗时 ${(new Date().getTime() - httpStartTime) / 1000}s`
          //   )
          // }

          if (options?.saveType === 'import') {
            location.reload()
          }

          setTimeout(() => {
            message.destroy(msgSaveKey)
          }, 3000)
        } catch (e) {
          res = e

          !options?.skipMessage &&
            message.error({
              content: `保存失败：${e.message}`,
              key: msgSaveKey,
            })

          if (content) {
            setSaveTip('保存失败')
          }

          console.error(`[MyBricks PC Error]: 保存失败 ${res}`)
        }

        return res
      },
      // 下面这俩字段在出码组件里面用到
      publishToComUrl: '/api/pcpage/publishToCom',
      publishToComDownloadUrl: '/api/pcpage/publishToComDownload',
    }
  })

  const publishingRef = useRef(false)

  const designerRef = useRef<{
    dump
    toJSON
    geoView
    switchActivity
    getPluginData
    loadContent
    toplView: { focusCom: (comId: string) => void }
  }>()

  const [beforeunload, setBeforeunload] = useState(false)
  const [operable, setOperable] = useState(false)
  const operableRef = useRef(operable)
  operableRef.current = operable
  const [saveTip, setSaveTip] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [SPADesigner, setSPADesigner] = useState(null)
  const [remotePlugins, setRemotePlugins] = useState(null)
  const [builtPlugins, setBuildPlugins] = useState(null);
  const [isDebugMode, setIsDebugMode] = useState(false)
  const operationList = useRef<any[]>([])
  const fileDBRef = useRef(null)
  const [dependenciesSuccess, setDependenciesSuccess] = useState(false)
  const beforeUnloadRef = useRef(false)

  const designer = useMemo(() => {
    if (ctx.debug && localStorage.getItem('__DEBUG_DESIGNER__')) {
      return localStorage.getItem('__DEBUG_DESIGNER__')
    }
    // return 'https://f2.eckwai.com/kos/nlav12333/mybricks/designer-spa/3.9.943.t5/index.min.js'
    return appConfig.designer?.url || DESIGNER_STATIC_PATH
  }, [appConfig])

  useLayoutEffect(() => {
    appData.getInitComLibs({
      localComlibs: APP_TYPE === "react" ? [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB] : [],
      currentComlibs: appData.fileContent?.content?.comlibs,
    }).then(({ comlibs, latestComlibs }) => {
      const newComlibs = ctx.debug
        ? replaceComlib(comlibs, comlibDebugUtils.get())
        : comlibs

      const hasAIComlib = comlibs.some(lib => lib.namespace === 'mybricks.ai-comlib-pc');

      setCtx((pre) => ({ ...pre, comlibs: newComlibs, hasAIComlib, latestComlibs }))
    }).finally(loadDesigner)
    // getInitComLibs(appData)
    //   .then(async ({ comlibs, latestComlibs }) => {
    //     const newComlibs = ctx.debug
    //       ? replaceComlib(comlibs, comlibDebugUtils.get())
    //       : comlibs

    //     const hasAIComlib = comlibs.some(lib => lib.namespace === 'mybricks.ai-comlib-pc');

    //     setCtx((pre) => ({ ...pre, comlibs: newComlibs, hasAIComlib, latestComlibs }))
    //   })
    //   .finally(loadDesigner)
  }, [designer])

  useEffect(() => {
    getMybricksStudioDB().then(async (r) => {
      fileDBRef.current = r
    })
  }, [])

  const loadDesigner = useCallback(() => {
    if (designer) {
      const script = document.createElement('script')
      script.src = designer
      document.head.appendChild(script)
      script.onload = () => {
        ; (window as any).mybricks.SPADesigner &&
          setSPADesigner((window as any).mybricks.SPADesigner)
      }
    }
  }, [designer])

  //页面刷新的时候，添加fontJS资源
  useEffect(() => {
    createFromIconfontCN({
      scriptUrl: ctx.fontJS, // 在 iconfont.cn 上生成
    })
  }, [ctx.fontJS])

  useEffect(() => {
    fetchPlugins(plugins, {
      user: appData.user,
      fileContent: appData.fileContent,
    }).then(setRemotePlugins)

    Promise.all([
      new Promise((resolve) => {
        import("@mybricks/plugin-note").then(resolve)
      }),
      new Promise((resolve) => {
        import("@mybricks/plugin-theme").then(resolve)
      }),
      new Promise((resolve) => {
        import("@mybricks/plugin-connector-http").then(resolve)
      })
    ]).then(([notePlugin, themePlugin, httpPlugin]) => {
      setBuildPlugins({
        notePlugin, themePlugin, httpPlugin
      })
    })
    // console.log('应用数据:', appData)
  }, [])

  useEffect(() => {
    let designerSPAVerison = ''
    const regex = /(\d+?\.\d+\.\d+)/g
    const matches = designer.match(regex)
    if (matches) {
      designerSPAVerison = matches[0]
    }
    const appInfo = {
      app: {
        verison: APP_VERSION || '',
        name: APP_NAME || '',
      },
      designerSPAVerison,
      plugins: plugins.map((item) => {
        const { name, title, updateTime } = item || {}
        return {
          name,
          title,
          updateTime,
        }
      }),
      comlibs: ctx.comlibs
        .filter((item) => item.id !== '_myself_')
        .map((item) => {
          const { id, namespace: name, version } = item || {}
          return {
            id,
            name,
            version,
          }
        }),
    }

    // 简单判断本地环境，不上报数据
    if (window.location.origin.includes('http://localhost')) return

    appData.report({
      jsonData: {
        type: 'appInfo',
        payload: appInfo,
      },
    })
  }, [])

  useEffect(() => {
    if (beforeunload) {
      window.onbeforeunload = (e) => {
        return true
      }
    } else {
      window.onbeforeunload = null
    }
    beforeUnloadRef.current = beforeunload
  }, [beforeunload])

  const { handleDownloadHtml, downloadHtmlLoading } = usePublishPage({
    vbDesignContext: {},
    chatId: ctx.fileId,
    getTitle() {
      return ctx.fileName
    },
    ctx
  })

  const getToJSON = () => {
    try {
      return designerRef?.current?.toJSON()
    } catch (e) {
      message.error('获取页面数据失败')
      console.error(e)
    }
  }

  const onEdit = useCallback((info) => {
    operationList.current.push({
      ...info,
      detail: info.title,
      updateTime: moment(),
    })
    setBeforeunload(true)
  }, [])

  const handleSwitch2SaveVersion = useCallback(() => {
    designerRef.current?.switchActivity?.('@mybricks/plugins/version')
    setTimeout(() => {
      ctx?.versionApi?.switchAciveTab?.('save')
    }, 0)
  }, [])

  const save = useCallback(
    async (params?: { saveType?: string }) => {
      if (isPreview) {
        message.warn('请回到编辑页面，再进行保存')
        return
      }
      if (!operableRef.current) {
        message.warn('请先点击右上角个人头像上锁获取页面编辑权限')
        return
      }
      if (ctx.isDebugMode) {
        console.warn('请退出调试模式，再进行保存')
        return
      }

      setSaveLoading(true)

      setSaveTip('正在保存中...')

      // message.loading({
      //   key: msgSaveKey,
      //   content: '保存中..',
      //   duration: 0,
      // })
      //保存
      const json = designerRef.current?.dump()
      // const canvasDom = designerRef.current?.geoView.canvasDom

      json.comlibs = ctx.comlibs
      json.debugQuery = ctx.debugQuery
      json.debugMockConfig = ctx.debugMockConfig
      json.directConnection = ctx.directConnection
      json.executeEnv = ctx.executeEnv
      json.MYBRICKS_HOST = ctx.MYBRICKS_HOST
      json.envList = ctx.envList
      json.debugMainProps = ctx.debugMainProps
      json.hasPermissionFn = ctx.hasPermissionFn
      json.debugHasPermissionFn = ctx.debugHasPermissionFn
      json.componentName = ctx.componentName
      json.staticResourceToCDN = ctx.staticResourceToCDN
      json.fontJS = ctx.fontJS
      json.pageHeader = ctx.pageHeader
      json.i18nLangContentType = ctx.i18nLangContentType
      // json.useAutoPreviewImage = ctx.useAutoPreviewImage

      json.projectId = ctx.sdk.projectId

      json.comlibs = json.comlibs.map((comlib) => {
        const { content, ...other } = comlib;
        return other;
      })

      let res

      try {
        await addVersionContent({
          fileId: ctx.fileId,
          json,
          version: ctx.version,
          fileDBRef,
        })

        setSaveLoading(false)

        res = await initialSaveFileContent(fileDBRef, ctx, params?.saveType)

        message.success('保存成功')

        // 在 50 个版本之前的文件版本将被删除
        try {
          API.File.deleteFileSaves({
            fileId: ctx.fileId,
            beforeNVersion: 50,
          })
        } catch (error) {
          console.error('删除超出文件版本报错:', error)
        }

        setBeforeunload(false)
      } catch (e) {
        setSaveLoading(false)
        console.error(e)
        setSaveTip('保存失败，请联系管理员')
        message.error('保存失败，请联系管理员')
      }

      return res

      // 保存缩略图
      // if (ctx.useAutoPreviewImage) {
      // saveFileImage(canvasDom, ctx.save)
      // }
    },
    [isPreview, ctx]
  )

  const preview = useCallback(() => {
    const json = getToJSON()

    if (!json) {
      return
    }

    const previewStorage = new PreviewStorage({ fileId: ctx.fileId })
    previewStorage.savePreviewPageData({
      dumpJson: json,
      executeEnv: ctx.executeEnv,
      MYBRICKS_HOST: ctx.MYBRICKS_HOST,
      directConnection: ctx.directConnection,
      debugMockConfig: ctx.debugMockConfig,
      envList: ctx.envList,
      comlibs: ctx.comlibs,
      hasPermissionFn: ctx.hasPermissionFn,
      appConfig: JSON.stringify(appConfig),
      i18nLangContent: ctx.i18nLangContent,
      runtimeUploadService: ctx.runtimeUploadService,
    })

    // 对象 => 拼接成路由参数
    const objectToQueryString = (params: { [key: string]: any }): string => {
      const queryParams: string[] = []

      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          const value = params[key]
          // 对齐连接器 如果属性值是数组，则将每个元素转换为类似于 `a[]=b&a[]=c` 的形式
          if (Array.isArray(value)) {
            value.forEach((item: string) => {
              queryParams.push(
                `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`
              )
            })
          }
          // 如果属性值是字符串、数字或布尔值，则直接转换为 `key=value` 的形式
          else if (['string', 'number', 'boolean'].includes(typeof value)) {
            queryParams.push(
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            )
          }
        }
      }

      // 如果queryParams不为空，则在前面加上 &，否则返回空字符串
      return queryParams.length > 0 ? `&${queryParams.join('&')}` : ''
    }

    window.open(
      `./preview.html?fileId=${ctx.fileId}${objectToQueryString(ctx?.debugQuery || {})}`
    )
  }, [appConfig, ctx])

  const publish = useCallback(
    async (publishConfig) => {
      if (publishingRef.current) {
        return
      }

      const curToJSON = getToJSON()

      if (!curToJSON) {
        return
      }

      const { envType = 'prod', commitInfo } = publishConfig
      publishingRef.current = true

      setPublishLoading(true)

      const close = message.loading({
        key: 'publish',
        content: '发布中...',
        duration: 0,
      })
      return (async () => {
        /** 先保存 */
        const json = designerRef.current?.dump()

        const i18nLangContent =
          ctx.i18nLangContentType === 'full'
            ? ctx.i18nLangContent
            : i18nLangContentFilter(ctx.i18nLangContent, ctx.i18nUsedIdList)

        json.comlibs = ctx.comlibs
        json.debugQuery = ctx.debugQuery
        json.debugMockConfig = ctx.debugMockConfig
        json.executeEnv = ctx.executeEnv
        json.MYBRICKS_HOST = ctx.MYBRICKS_HOST
        json.envList = ctx.envList
        json.debugMainProps = ctx.debugMainProps
        json.hasPermissionFn = ctx.hasPermissionFn
        json.debugHasPermissionFn = ctx.debugHasPermissionFn
        json.componentName = ctx.componentName
        json.staticResourceToCDN = ctx.staticResourceToCDN
        json.projectId = ctx.sdk.projectId
        json.i18nLangContent = i18nLangContent
        json.i18nLangContentType = ctx.i18nLangContentType

        json.pageHeader = ctx.pageHeader

        await ctx.save(
          { content: JSON.stringify(json), name: ctx.fileName },
          { skipMessage: true }
        )

        setBeforeunload(false)

        const curComLibs = await genLazyloadComs(ctx.comlibs, curToJSON)

        const settings = await getAppSetting()
        const isEncode = !!settings?.publishLocalizeConfig?.isEncode

        const jsonParams = {
          ...curToJSON,
          configuration: {
            // scripts: encodeURIComponent(scripts),
            comlibs: curComLibs,
            title: ctx.fileName,
            pageHeader: ctx.pageHeader,
            publisherEmail: ctx.user.email,
            publisherName: ctx.user?.name,
            runtimeUploadService: ctx.runtimeUploadService,
            projectId: ctx.sdk.projectId,
            envList: ctx.envList,
            i18nLangContent,
            // 非模块下的页面直接发布到项目空间下
            folderPath: '/app/pcpage',
            fileName: `${ctx.fileId}.html`,
            groupName: appData?.hierarchy?.groupName || '',
            groupId: appData?.hierarchy?.groupId || 0,
            appConfig,
          },
          hasPermissionFn: ctx.hasPermissionFn,
        }

        const toJSON = isEncode
          ? btoa(encodeURIComponent(JSON.stringify(jsonParams)))
          : jsonParams

        const res: {
          data?: any
          code: number
          message: string
          errorDetailMessage?: string
          comId?: string
        } = await fAxios.post('/api/pcpage/publish', {
          userId: ctx.user?.id,
          fileId: ctx.fileId,
          mainFileId,
          json: toJSON,
          envType,
          commitInfo,
        })

        if (res.code === 1) {
          close()
          message.success({
            key: 'publish',
            content: '发布成功',
            duration: 2,
          })

          designerRef.current?.switchActivity?.('@mybricks/plugins/version')
          setTimeout(() => {
            ctx?.versionApi?.switchAciveTab?.('publish', void 0)
          }, 0)
        } else {
          close()

          if (res.errorDetailMessage) {
            Modal.confirm({
              title: '详细报错信息',
              width: 800,
              okText: '确认',
              onOk: () => {
                designerRef.current.toplView?.focusCom?.(res.comId)
              },
              content: (
                <div className={css.errorDetail}>
                  <div className={css.message}>{res.message}</div>
                  <pre>{res.errorDetailMessage}</pre>
                </div>
              ),
              okCancel: false,
            })
          } else {
            message.error({
              content: res.message || '发布失败',
              duration: 2,
            })
          }
        }

        setPublishLoading(false)

        return res
      })()
        .catch((e) => {
          console.error(e)
          close()
          message.error({
            key: 'publish',
            content: '网络错误，请稍后再试',
            duration: 2,
          })
        })
        .finally(() => {
          publishingRef.current = false
          setPublishLoading(false)
        })
    },
    [appData, ctx, mainFileId]
  )

  const publishAndDownload = async (publishConfig) => {
    const res = await publish(publishConfig)
    if (res && res.code === 1 && res.data?.pib_id) {
      const loadingEnd = message.loading('正在下载发布产物...', 0)
      const { fileId, envType, version } = res.data
      let isSuccess = true
      try {
        await download(
          `api/pcpage/download-product/${fileId}/${envType}/${version}`
        )
      } catch (e) {
        isSuccess = false
        message.error('下载发布产物失败!')
      } finally {
        loadingEnd()
      }
      isSuccess && message.success('下载发布产物成功!')
    }
  }

  const beforeToggleUnLock: any = () => {
    if (!beforeUnloadRef.current) {
      return true
    }
    return new Promise((resolve) => {
      Modal.confirm({
        title: '解锁前确认',
        icon: <InfoCircleTwoTone />,
        content: `当前页面有内容未保存，请确定是否解锁页面？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve(true)
        },
        onCancel: () => {
          resolve(false)
        },
      })
    }) as Promise<boolean>
  }

  // const RenderLocker = useMemo(() => {
  //   return (
  //     <Locker
  //       statusChange={(status) => {
  //         setOperable(status === 1)
  //         ctx.operable = status === 1
  //       }}
  //       beforeToggleUnLock={beforeToggleUnLock}
  //       compareVersion={true}
  //       autoLock={true}
  //     />
  //   )
  // }, [])

  const onMessage = useCallback((type, msg) => {
    message.destroy()
    message[type](msg)
  }, [])

  const onDebug = useCallback(() => {
    setIsDebugMode(true)
    ctx.isDebugMode = true

    return () => {
      setIsDebugMode(false)
      ctx.isDebugMode = false
    }
  }, [])

  const getDumpJson = useCallback(() => {
    const json = designerRef.current?.dump()
    json.pageConfig = {
      comlibs: ctx.comlibs,
      debugQuery: ctx.debugQuery,
      debugMockConfig: ctx.debugMockConfig,
      directConnection: ctx.directConnection,
      // executeEnv: ctx.executeEnv,
      // MYBRICKS_HOST: ctx.MYBRICKS_HOST,
      // envList: ctx.envList,
      debugMainProps: ctx.debugMainProps,
      hasPermissionFn: ctx.hasPermissionFn,
      debugHasPermissionFn: ctx.debugHasPermissionFn,
      componentName: ctx.componentName,
      staticResourceToCDN: ctx.staticResourceToCDN,
    }
    return json
  }, [JSON.stringify(ctx)])

  useEffect(() => {
    const removeLocalProxy = proxLocalStorage(ctx.debugMockConfig)
    const removeSessionProxy = proxSessionStorage(ctx.debugMockConfig)
    return () => {
      removeLocalProxy()
      removeSessionProxy()
    }
  }, [
    ctx.debugMockConfig?.localStorageMock,
    ctx.debugMockConfig?.sessionStorageMock,
  ])

  const importDump = async (value) => {
    try {
      value = typeof value === 'string' ? JSON.parse(value) : value
      const { content, pageConfig } = value
      let newPageConfig
      if (!pageConfig || !pageConfig?.comlibs?.length) {
        // 无 pageConfig 或comlibs数组为空，导入时放入默认组件库 以及我的组件库，去更新到ctx.comlibs
        newPageConfig = pageConfig || {}
        newPageConfig.comlibs = appData.defaultComlibs?.length
          ? appData.defaultComlibs
          : [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB]
        // 放入默认的我的组件
        newPageConfig.comlibs.unshift(MySelf_COM_LIB)
      }
      Object.assign(ctx, newPageConfig ?? {})

      let ctxMySelfIndex = ctx?.comlibs.findIndex((t) => t?.id === MY_SELF_ID)

      if (pageConfig && pageConfig?.comlibs?.length) {
        const importMySelfLib = pageConfig?.comlibs.find(
          (comlib) => comlib.id === '_myself_'
        )
        // 导入的dumpJson中的我的组件下面的组件数组长度 > 0，更新我的组件数据
        if (importMySelfLib && importMySelfLib.comAray?.length > 0) {
          if (ctxMySelfIndex > -1) {
            ctx.comlibs[ctxMySelfIndex] = importMySelfLib
          } else {
            ctx.comlibs.unshift(importMySelfLib)
          }
        }
      }
      await designerRef.current.loadContent(content)
    } catch (e) {
      message.error(e)
      console.error(e)
    }
  }

  window.importDump = importDump
  window.designerRef = designerRef

  useEffect(() => {
    /** 供外部调用，模拟一次编辑以触发保存按钮的未保存状态（* 号） */
    ;(window as any)._mybricksOnEdit_ = (info?: { title?: string; [key: string]: any }) => {
      onEdit({ title: '手动触发编辑', ...info })
    }
    return () => {
      delete (window as any)._mybricksOnEdit_
    }
  }, [onEdit])

  useEffect(() => {
    ;(window as any).__vibeCodingCallbacks__ = {
      onStart() {
        // vibe coding 开始
      },
      async onComplete() {
        // 1. 打印 designer toJSON 数据
        let json: any
        try {
          json = designerRef.current?.toJSON()
        } catch (e) {
          console.error('[vibeCoding onComplete] toJSON failed:', e)
        }

        // 2. 从 json 中提取文件名并保存（仅当当前文件名为「未命名文件」时）
        if (json) {
          try {
            // 从所有 scenes 的 coms 中收集 files
            const allFiles: any[] = []
            const scenes: any[] = json.scenes ?? []
            for (const scene of scenes) {
              const coms = scene.coms ?? {}
              for (const comId of Object.keys(coms)) {
                const files = coms[comId]?.model?.data?.files
                if (Array.isArray(files)) {
                  allFiles.push(...files)
                }
              }
            }

            // 优先从 requirement.md 的 compiled.title 获取
            let newName: string | undefined
            const requirementFile = allFiles.find((f) => f.fileName === 'requirement.md')
            if (requirementFile?.compiled?.title) {
              newName = requirementFile.compiled.title
            }

            if (!newName) {
              try {
                const entryFile = allFiles.find((f) => ['index.jsx', 'index.tsx'].includes(f.fileName))
                if (entryFile?.jsDocMap) {
                  const jsDoc = JSON.parse(decodeURIComponent(entryFile.jsDocMap))
                  newName = jsDoc.default.title
                }
              } catch {}
            }

            // 退而从 README.md 的 compiled.default.title 获取
            if (!newName) {
              const readmeFile = allFiles.find((f) => f.fileName === 'README.md')
              if (readmeFile?.compiled?.default?.title) {
                newName = readmeFile.compiled.default.title
              }
            }

            if (newName) {
              titleRef.current.setTitle(newName)
              await ctx.save({ name: newName })
            }
          } catch (e) {
            console.error('[vibeCoding onComplete] 更新文件名失败:', e)
          }
        }
      },
    }
    return () => {
      delete (window as any).__vibeCodingCallbacks__
    }
  }, [ctx])

  async function designerIsComplete() {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (document.getElementById('_mybricks-geo-webview_')) {
          resolve(true)
          clearInterval(intervalId)
        }
      }, 100)
    })
  }

  /** 通知父页面渲染完成 */
  useEffect(() => {
    designerIsComplete().then(() => {
      console.log('publish-ready')
      window.parent.postMessage({ action: 'publish-ready', data: { fileId: ctx.fileId } }, '*')
    })
  }, [])

  /** 监听 auto-publish 事件 */
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      console.log('designer receive message', event.data)
      if (event.data?.action === 'auto-publish') {
        try {
          const res = await publish(event.data.data)
          console.log('自动发布结果', res)
          const data = {
                fileId: ctx.fileId,
                ...(res || {})
              }
          if (res && res.code === 1) {
            window.parent.postMessage({ action: 'publish-success', data }, '*')
          } else {
            window.parent.postMessage({ action: 'publish-error', data }, '*')
          }
        } catch (e) {
          window.parent.postMessage({ action: 'publish-error', data: { message: e.message || '发布失败' } }, '*')
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [ctx?.fileId, publish])

  // 上报页面的开发数据
  usePageStayTime({ operable, appData: ctx, currentRef: designerRef })

  const { handleExport } = useAiSourceCodeExport({
    getExportToJSON: () => designerRef.current?.toJSON?.(),
    folderName: "app",
    dependencies: getAllDependencies(appConfig?.ai?.dependencies),
  });
  const { handleExportPrd } = useAiPrdExport({
    getExportToJSON: () => designerRef.current?.toJSON?.(),
    getRuntimeFiles: (comId) => (window as any)._forApp_[comId].getFiles(),
  });
  const { openSetting } = useAISetting()

  const TrueDesigner = useMemo(() => {

    window._mybricks_export_ui_ = () => {
      const json = getDumpJson()
      const content = JSON.stringify(json, null, 2)
      const baseName = ctx.fileName ? ctx.fileName.replace(/\.[^.]+$/, '') : 'export'
      const fileName = `${baseName}.ui`
      const blob = new Blob([content], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }

    return (
      SPADesigner &&
      remotePlugins &&
      builtPlugins &&
      dependenciesSuccess &&
      window?.mybricks?.createObservable && (
        <>
          <SPADesigner
            ref={designerRef}
            titlebar={() => {
              return (
                <DesignerTitleBar
                  ref={titleRef}
                  appData={appData}
                />
              )
            }}
            toolbar={() => {
              return (
                <DesignerToolBar
                  ref={toolbarRef}
                  appData={appData}
                  beforeToggleUnLock={beforeToggleUnLock}
                  onOperableChange={(operable) => {
                    setOperable(operable)
                    ctx.operable = operable
                  }}
                  onSave={save}
                  moreActions={[
                    {
                      icon: <DownloadOutlined />,
                      title: '导出ui文件',
                      onClick: () => {
                        const json = getDumpJson()
                        const content = JSON.stringify(json, null, 2)
                        const baseName = ctx.fileName ? ctx.fileName.replace(/\.[^.]+$/, '') : 'export'
                        const fileName = `${baseName}.ui`
                        const blob = new Blob([content], { type: 'application/json' })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = fileName
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                      }
                    },
                    {
                      icon: <UploadOutlined />,
                      title: '导入ui文件',
                      onClick: () => {
                        if (!ctx.operable || isDebugMode) {
                          message.warn(!ctx.operable ? '请先点击右上角个人头像上锁获取页面编辑权限' : '请退出调试模式，再进行导入')
                          return
                        }
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.ui'
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = async (ev) => {
                            try {
                              const text = ev.target.result as string
                              const json = JSON.parse(text)
                              const { content, pageConfig } = json
                              const contentStr = JSON.stringify({ content, ...pageConfig })
                              setSaveLoading(true)
                              try {
                                await ctx.save({ content: contentStr }, { saveType: 'import' })
                              } finally {
                                setSaveLoading(false)
                              }
                            } catch (err) {
                              message.error('导入失败：文件格式不正确')
                              console.error(err)
                            }
                          }
                          reader.readAsText(file)
                        }
                        document.body.appendChild(input)
                        input.click()
                        document.body.removeChild(input)
                      }
                    },
                    ...(APP_ENV !== 'production' ? [{
                      icon: <DeleteOutlined />,
                      title: '清空画布',
                      onClick: async () => {
                        if (!ctx.operable || isDebugMode) {
                          message.warn(!ctx.operable ? '请先点击右上角个人头像上锁获取页面编辑权限' : '请退出调试模式，再进行操作')
                          return
                        }
                        setSaveLoading(true)
                        try {
                          await ctx.save({ content: '{}' }, { saveType: 'import' })
                        } finally {
                          setSaveLoading(false)
                        }
                      }
                    }] : []),
                    {
                      icon: <CloudUploadOutlined />,
                      title: '发布',
                      onClick: () => {
                        const coms = designerRef.current?.toJSON()?.scenes?.[0]?.coms
                        if (!coms) {
                          return message.warn('源代码为空，暂无可发布的内容!')
                        }

                        const comId = Object.keys(coms)[0]
                        if (!comId) {
                          return message.warn('源代码为空，暂无可发布的内容!')
                        }

                        const files = (window as any)._forApp_[comId].getFiles()

                        if (!files.length) {
                          return message.warn('源代码为空，暂无可发布的内容!')
                        }
                        setPublishPageModalVisible(true)
                      },
                    },
                    {
                      icon: <SettingOutlined />,
                      title: '设置',
                      onClick: openSetting,
                    }
                  ]}
                  exportActions={[
                    {
                      title: 'HTML',
                      onClick: async () => {
                        const coms = designerRef.current?.toJSON()?.scenes?.[0]?.coms
                        if (!coms) {
                          return message.warn('源代码为空，暂无可下载的内容!')
                        }

                        const comId = Object.keys(coms)[0]
                        if (!comId) {
                          return message.warn('源代码为空，暂无可下载的内容!')
                        }

                        const files = (window as any)._forApp_[comId].getFiles()

                        if (!files.length) {
                          return message.warn('源代码为空，暂无可下载的内容!')
                        }

                        await handleDownloadHtml()
                      }
                    },
                    {
                      title: '源代码',
                      onClick: handleExport
                    },
                    {
                      title: 'PRD',
                      onClick: handleExportPrd
                    },
                  ]}
                />
              )
            }}
            config={config(
              window?.mybricks?.createObservable(ctx),
              appData,
              save,
              designerRef,
              remotePlugins,
              fileDBRef,
              setBeforeunload,
              builtPlugins,
            )}
            onEdit={onEdit}
            onMessage={onMessage}
            onDebug={onDebug}
            _onError_={(ex: any) => {
              console.error(ex)
              onMessage('error', ex.message)
            }}
          />
        </>
      )
    )
  }, [SPADesigner, remotePlugins, builtPlugins, window?.mybricks?.createObservable, dependenciesSuccess])


  useEffect(() => {
    toolbarRef.current?.setCanSave(!(!operable || isDebugMode))
  }, [operable, isDebugMode])

  useEffect(() => {
    toolbarRef.current?.setIsSaving(saveLoading)
  }, [saveLoading])

  useEffect(() => {
    toolbarRef.current?.setHasUnsaved(beforeunload)
  }, [beforeunload])

  return (
    <div className={`${css.view} fangzhou-theme`}>
      <div className={css.designer}>{TrueDesigner}</div>
      <PublishPageModal
        visible={publishPageModalVisible}
        getTitle={() => {
          return ctx.fileName
        }}
        onCancel={() => {
          setPublishPageModalVisible(false)
        }}
        ctx={ctx}
        fileId={ctx.fileId}
      />
    </div>
  )
}

/**
 * @description 按需加载组件
 * @param comlibs
 * @param toJSON
 * @returns
 */
const genLazyloadComs = async (comlibs, toJSON) => {
  const curComLibs = JSON.parse(JSON.stringify(comlibs))
  const mySelfComMap = {}
  let cloudDeps = []

  comlibs.forEach((comLib) => {
    if (comLib?.defined && Array.isArray(comLib.comAray)) {
      comLib.comAray.forEach((com) => {
        mySelfComMap[`${com.namespace}`] = true
      })
    }
  })

  /**
   * 解析云组件依赖项，以 deps 字段为准
   */
  window['__comlibs_edit_'].forEach((comLib) => {
    if (comLib?.defined && Array.isArray(comLib.comAray)) {
      comLib.comAray.forEach((com) => {
        if (com?.deps && Array.isArray(com.deps)) {
          cloudDeps = [...cloudDeps, ...com.deps]
        }
        // if (com?.title === '云组件依赖') {
        //   cloudDeps = com.comAray.map((item) => {
        //     return {
        //       namespace: item.namespace,
        //       verison: item.version,
        //     }
        //   })
        // }
      })
    }
  })

  /**
   * 过滤掉 render-web 内置的组件
   */
  const ignoreNamespaces = [
    'mybricks.core-comlib.fn',
    'mybricks.core-comlib.var',
    'mybricks.core-comlib.type-change',
    'mybricks.core-comlib.connector',
    'mybricks.core-comlib.frame-input',
    'mybricks.core-comlib.frame-output',
    'mybricks.core-comlib.scenes',
    'mybricks.core-comlib.defined-com',
    'mybricks.core-comlib.module',
    'mybricks.core-comlib.group',
    'mybricks.core-comlib.selection',
    'mybricks.core-comlib.js-ai',
    'mybricks.core-comlib.domain'
  ]

  let definedComsDeps = []
  let modulesDeps = []

  if (toJSON.modules) {
    Object.entries(toJSON.modules).forEach(([, module]: any) => {
      if (module.json.deps) {
        modulesDeps = [...modulesDeps, ...module.json.deps]
      }
    })
  }

  if (toJSON.definedComs) {
    Object.keys(toJSON.definedComs).forEach((key) => {
      definedComsDeps = [
        ...definedComsDeps,
        ...toJSON.definedComs[key].json.deps,
      ]
    })
  }

  // if (toJSON.modules) {
  //   Object.keys(toJSON.modules).forEach((key) => {
  //     modulesDeps = [...modulesDeps, ...toJSON.modules[key].json.deps]
  //   })
  // }

  const scenesDeps = (toJSON.scenes || []).reduce(
    (pre, scene) => [...pre, ...scene.deps],
    []
  )

  scenesDeps.forEach((item) => {
    if (item.moduleId) {
      // 如果是模块，且存在 moduleId

      const module = toJSON?.modules[item.moduleId]

      if (module) {
        modulesDeps = [...modulesDeps, ...module?.json.deps]
      } else {
        console.warn(
          `[MyBicks PC Warn]：模块 ID ${item.moduleId} 不存在，数据可能存在错误`
        )
      }
    }
  })

  let deps = [
    ...scenesDeps
      .filter((item) => !mySelfComMap[`${item.namespace}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(toJSON.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [])
      .filter((item) => !mySelfComMap[`${item.namespace}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !mySelfComMap[`${item.namespace}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      .filter((item) => !mySelfComMap[`${item.namespace}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...cloudDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ]

  deps = deps.reduce((accumulator, current) => {
    const existingObject = accumulator.find(
      (obj) => obj.namespace === current.namespace
    )
    if (!existingObject) {
      accumulator.push(current)
    }
    return accumulator
  }, [])

  if (deps.length) {
    const willFetchComLibs = curComLibs.filter(
      (lib) => !lib?.defined && lib.coms
    )

    const allComLibsRuntimeMap = (
      await Promise.all(
        willFetchComLibs.map((lib) =>
          axios.get(lib.coms, { withCredentials: false })
        )
      )
    ).map((data) => data.data)

    const noThrowError = comlibs.some((lib) => !lib.coms && !lib.defined)

    deps.forEach((component) => {
      const rtComKey = component.namespace + '@' + component.version
      let libIndex = allComLibsRuntimeMap.findIndex((lib) => lib[rtComKey])
      let curComponent = null
      if (libIndex !== -1) {
        curComponent = allComLibsRuntimeMap[libIndex][rtComKey]
      } else {
        libIndex = allComLibsRuntimeMap.findIndex((lib) =>
          Object.keys(lib).find((key) => key.startsWith(component.namespace))
        )

        if (libIndex === -1) {
          if (noThrowError) {
            return
          } else {
            console.error(`找不到 ${rtComKey} 对应的组件资源`)
          }
        } else {
          curComponent =
            allComLibsRuntimeMap[libIndex][
            Object.keys(allComLibsRuntimeMap[libIndex]).find((key) =>
              key.startsWith(component.namespace)
            )
            ]
        }
      }

      if (!curComponent) {
        if (noThrowError) {
          return
        } else {
          console.error(`找不到 ${rtComKey} 对应的组件资源`)
        }
      }
      if (curComponent && libIndex !== -1) {
        if (!willFetchComLibs[libIndex].componentRuntimeMap) {
          willFetchComLibs[libIndex].componentRuntimeMap = {}
        }
        willFetchComLibs[libIndex].componentRuntimeMap[rtComKey] = curComponent
      }
    })
  }

  return curComLibs
}

const getMergedEnvList = (appData, appConfig) => {
  // 页面已有的环境信息
  const pageEnvlist = appData.fileContent?.content?.envList || []
  // 全局配置的环境信息
  const configEnvlist =
    appConfig?.publishEnvConfig?.envList?.map((item) => ({
      title: item.title,
      name: item.name,
      value: item.defaultApiPrePath,
    })) || []

  return unionBy([...pageEnvlist, ...configEnvlist], 'name')
}
/**
 * @description 页面截图
 * Todo ... 大页面会造成卡顿
 *  */
const saveFileImage = (canvasDom, save) => {
  let startImageTime = new Date().getTime()
  console.log('开始截图')

  API.App.getPreviewImage({
    // Todo... name 中文乱码
    element: canvasDom,
  })
    .then(async (res) => {
      console.log(`截图完成 ${(new Date().getTime() - startImageTime) / 1000}s`)
      await save({ icon: res }, true)
      console.log(
        `截图保存完成 ${(new Date().getTime() - startImageTime) / 1000}s`
      )
    })
    .catch((err) => {
      console.error(err)
    })
}
