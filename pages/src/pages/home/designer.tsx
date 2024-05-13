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
import { message } from 'antd'
import API from '@mybricks/sdk-for-app/api'
import { Locker, Toolbar } from '@mybricks/sdk-for-app/ui'
import config from './app-config'
import { fetchPlugins, removeBadChar } from '../../utils'
import { PreviewStorage } from './../../utils/previewStorage'
import { unionBy } from 'lodash'
import PublishModal, { EnumMode } from './components/PublishModal'
import { createFromIconfontCN } from '@ant-design/icons'
import { i18nLangContentFilter } from '../../utils/index'

import { DESIGNER_STATIC_PATH } from '../../constants'
import { GET_DEFAULT_PAGE_HEADER, USE_CUSTOM_HOST } from './constants'
import { getInitComLibs } from '../../utils/getComlibs'
import { proxLocalStorage, proxSessionStorage } from '@/utils/debugMockUtils'
import download from '@/utils/download'

import css from './app.less'

const msgSaveKey = 'save'

/**
 * @description 获取当前应用setting
 * @returns object
 */
const getAppSetting = async () => {
  const settings = await API.Setting.getSetting([APP_NAME])

  return settings[APP_NAME]?.config
}

export default function MyDesigner({ appData: originAppData }) {
  const appData = useMemo(() => {
    let data = { ...originAppData }
    // 防止触发originAppData.fileContent的getter计算
    data.fileContent = { ...data.fileContent }
    return data
  }, [originAppData])

  const appConfig = useMemo(() => {
    let config = null
    try {
      const originConfig = appData.config[APP_NAME]?.config || {}
      config =
        typeof originConfig === 'string'
          ? JSON.parse(originConfig)
          : originConfig
    } catch (error) {
      console.error('get appConfig error', error)
    }
    return config || {}
  }, [appData.config[APP_NAME]?.config])

  const designer = useMemo(
    () => appConfig.designer?.url || DESIGNER_STATIC_PATH,
    [appConfig]
  )

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

    return {
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
      setting: appData.config || {},
      hasMaterialApp: appData.hasMaterialApp,
      comlibs: [],
      latestComlibs: [],
      debugQuery: appData.fileContent?.content?.debugQuery,
      executeEnv,
      envList,
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
      versionApi: null,
      appConfig,
      uploadService,
      runtimeUploadService,
      operable: false,
      isDebugMode: false,
      saveContent(content) {
        ctx.save({ content })
      },
      async save(
        param: { name?; shareType?; content?; icon? },
        skipMessage?: boolean
      ) {
        const { name, shareType, content, icon } = param

        const operationListStr = JSON.stringify(operationList.current.reverse())

        const settings = await getAppSetting()
        const isEncode = !!settings?.publishLocalizeConfig?.isEncode

        await appData
          .save({
            userId: ctx.user?.id,
            fileId: ctx.fileId,
            name,
            shareType,
            content: removeBadChar(content),
            isEncode,
            icon,
            operationList: operationListStr,
          })
          .then(() => {
            !skipMessage &&
              message.success({ content: `保存完成`, key: msgSaveKey })
            operationList.current = []
            if (content) {
              setSaveTip(`改动已保存-${moment(new Date()).format('HH:mm')}`)
            }
          })
          .catch((e) => {
            !skipMessage &&
              message.error({
                content: `保存失败：${e.message}`,
                key: msgSaveKey,
              })
            if (content) {
              setSaveTip('保存失败')
            }
          })
          .finally(() => {
            setSaveLoading(false)
          })
      },
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
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const operationList = useRef<any[]>([])

  useLayoutEffect(() => {
    getInitComLibs(appData)
      .then(async ({ comlibs, latestComlibs }) => {
        setCtx((pre) => ({ ...pre, comlibs, latestComlibs }))
      })
      .finally(loadDesigner)
  }, [designer])

  const loadDesigner = useCallback(() => {
    if (designer) {
      const script = document.createElement('script')
      script.src = designer
      document.head.appendChild(script)
      script.onload = () => {
        ;(window as any).mybricks.SPADesigner &&
          setSPADesigner((window as any).mybricks.SPADesigner)
      }
    }
  }, [designer])

  // 只有预览时 search 会携带 version 字段
  const isPreview = window.location.search.includes('version')

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
    console.log('应用数据:', appData)
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
      window.onbeforeunload = () => {
        return true
      }
    } else {
      window.onbeforeunload = null
    }
  }, [beforeunload])

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

  const save = useCallback(async () => {
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

    message.loading({
      key: msgSaveKey,
      content: '保存中..',
      duration: 0,
    })
    //保存
    const json = designerRef.current?.dump()
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
    json.fontJS = ctx.fontJS
    json.pageHeader = ctx.pageHeader

    json.projectId = ctx.sdk.projectId

    await ctx.save({
      name: ctx.fileName,
      content: JSON.stringify(json),
    })

    setBeforeunload(false)
    // 保存缩略图
    await API.App.getPreviewImage({
      // Todo... name 中文乱码
      element: designerRef.current?.geoView.canvasDom,
    })
      .then(async (res) => {
        await ctx.save({ icon: res }, true)
      })
      .catch((err) => {
        console.error(err)
      })
  }, [isPreview, ctx])

  const preview = useCallback(() => {
    const json = designerRef.current?.toJSON()

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

        json.comlibs = ctx.comlibs
        json.debugQuery = ctx.debugQuery
        json.debugMockConfig = ctx.debugMockConfig
        json.executeEnv = ctx.executeEnv
        json.MYBRICKS_HOST = ctx.MYBRICKS_HOST
        json.envList = ctx.envList
        json.debugMainProps = ctx.debugMainProps
        json.hasPermissionFn = ctx.hasPermissionFn
        json.debugHasPermissionFn = ctx.debugHasPermissionFn
        json.projectId = ctx.sdk.projectId
        json.i18nLangContent = i18nLangContentFilter(
          ctx.i18nLangContent,
          ctx.i18nUsedIdList
        )
        json.pageHeader = ctx.pageHeader

        await ctx.save(
          {
            content: JSON.stringify(json),
            name: ctx.fileName,
          },
          true
        )
        setBeforeunload(false)

        const curToJSON = designerRef?.current?.toJSON()

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
            i18nLangContent: i18nLangContentFilter(
              ctx.i18nLangContent,
              ctx.i18nUsedIdList
            ),
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

        const res: { data?: any; code: number; message: string } =
          await fAxios.post('/api/pcpage/publish', {
            userId: ctx.user?.id,
            fileId: ctx.fileId,
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
          message.error({
            content: res.message || '发布失败',
            duration: 2,
          })
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
    [appData, ctx]
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

  const RenderLocker = useMemo(() => {
    return (
      <Locker
        statusChange={(status) => {
          setOperable(status === 1)
          ctx.operable = status === 1
        }}
        compareVersion={true}
      />
    )
  }, [])

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
    }
    return json
  }, [JSON.stringify(ctx)])

  useEffect(() => {
    const removeLocalProxy = proxLocalStorage(
      ctx.debugMockConfig?.localStorageMock
    )
    const removeSessionProxy = proxSessionStorage(
      ctx.debugMockConfig?.sessionStorageMock
    )

    return () => {
      removeLocalProxy()
      removeSessionProxy()
    }
  }, [
    ctx.debugMockConfig?.localStorageMock,
    ctx.debugMockConfig?.sessionStorageMock,
  ])

  window.designerRef = designerRef

  const downloadCode = async () => {
    const close = message.loading({
      key: 'toCode',
      content: '出码中...',
      duration: 0,
    })

    let toJSON

    try {
      toJSON = designerRef.current.toJSON({ withDiagrams: true })
    } catch (e) {
      console.error('toJSON({ withDiagrams: true }) 报错: ', e)
      message.error(
        `出码失败: toJSON({ withDiagrams: true }) 报错 ${e.message}`
      )
      close()
    }

    if (toJSON) {
      fAxios({
        method: 'post',
        url: '/api/pcpage/toCode',
        responseType: 'blob',
        data: {
          json: toJSON,
        },
      })
        .then((response) => {
          // // 创建一个URL指向blob响应数据
          const url = window.URL.createObjectURL(new Blob([response]))
          // 创建一个a标签用于触发下载
          const link = document.createElement('a')
          link.href = url
          // 设置下载后的文件名，如果服务器未指定，则可以在这里指定
          link.setAttribute('download', '出码-react.zip') // 注意: 该名称可以根据实际情况命名
          // 将a标签添加到body，触发点击事件，然后移除
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          // 清理用完的URL对象
          window.URL.revokeObjectURL(url)
        })
        .catch((error) => {
          console.error('出码失败，报错信息:', error)
          message.error(`出码失败: ${error.message}`)
          throw error
        })
        .finally(() => {
          close()
        })
    }
  }

  return (
    <div className={`${css.view} fangzhou-theme`}>
      <Toolbar
        title={ctx.fileName}
        updateInfo={
          <Toolbar.LastUpdate
            content={saveTip}
            onClick={handleSwitch2SaveVersion}
          />
        }
      >
        <Toolbar.Tips />
        {!isPreview && RenderLocker}
        {!isPreview && (
          <>
            <Toolbar.Save
              disabled={!operable || isDebugMode}
              loading={saveLoading}
              onClick={() => {
                save()
              }}
              dotTip={beforeunload}
            />
            <Toolbar.Button disabled={isDebugMode} onClick={preview}>
              预览
            </Toolbar.Button>
            <Toolbar.Button
              disabled={!operable || isDebugMode}
              loading={publishLoading}
              onClick={() => setPublishModalVisible(true)}
            >
              发布
            </Toolbar.Button>
            <Toolbar.Button onClick={downloadCode}>出码</Toolbar.Button>
          </>
        )}
        <div className={`${isPreview ? css.toolbarWrapperPreview : ''}`}>
          <Toolbar.Tools
            onImport={async (value) => {
              try {
                const { content, pageConfig } = JSON.parse(value)
                Object.assign(ctx, pageConfig ?? {})
                await designerRef.current.loadContent(content)
                await save()
                location.reload()
              } catch (e) {
                message.error(e)
                console.error(e)
              }
            }}
            getExportDumpJSON={() => {
              return getDumpJson()
            }}
            getExportToJSON={() => {
              return designerRef.current.toJSON()
            }}
          />
        </div>
      </Toolbar>
      <div className={css.designer}>
        {SPADesigner && remotePlugins && window?.mybricks?.createObservable && (
          <>
            <SPADesigner
              ref={designerRef}
              config={config(
                window?.mybricks?.createObservable(ctx),
                appData,
                save,
                designerRef,
                remotePlugins
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
        )}
      </div>
      <PublishModal
        envList={ctx.envList}
        projectId={ctx.sdk.projectId}
        visible={publishModalVisible}
        onOk={(publishConfig) => {
          publish(publishConfig)
          setPublishModalVisible(false)
        }}
        onOkAndDownload={async (publishConfig) => {
          publishAndDownload(publishConfig)
          setPublishModalVisible(false)
        }}
        onCancel={() => setPublishModalVisible(false)}
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

  // 解析云组件依赖项
  window['__comlibs_edit_'].forEach((comLib) => {
    if (comLib?.defined && Array.isArray(comLib.comAray)) {
      comLib.comAray.forEach((com) => {
        if (com?.title === '云组件依赖') {
          cloudDeps = com.comAray.map((item) => {
            return {
              namespace: item.namespace,
              verison: item.version,
            }
          })
        }
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
  ]

  let definedComsDeps = []
  let modulesDeps = []

  if (toJSON.definedComs) {
    Object.keys(toJSON.definedComs).forEach((key) => {
      definedComsDeps = [
        ...definedComsDeps,
        ...toJSON.definedComs[key].json.deps,
      ]
    })
  }

  if (toJSON.modules) {
    Object.keys(toJSON.modules).forEach((key) => {
      modulesDeps = [...modulesDeps, ...toJSON.modules[key].json.deps]
    })
  }

  let deps = [
    ...(toJSON.scenes || [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [])
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
      let libIndex = allComLibsRuntimeMap.findIndex(
        (lib) => lib[component.namespace + '@' + component.version]
      )
      let curComponent = null
      if (libIndex !== -1) {
        curComponent =
          allComLibsRuntimeMap[libIndex][
            component.namespace + '@' + component.version
          ]
      } else {
        libIndex = allComLibsRuntimeMap.findIndex((lib) =>
          Object.keys(lib).find((key) => key.startsWith(component.namespace))
        )

        if (libIndex === -1) {
          if (noThrowError) {
            return
          } else {
            throw new Error(
              `找不到 ${component.namespace}@${component.version} 对应的组件资源`
            )
          }
        }
        curComponent =
          allComLibsRuntimeMap[libIndex][
            Object.keys(allComLibsRuntimeMap[libIndex]).find((key) =>
              key.startsWith(component.namespace)
            )
          ]
      }

      if (!curComponent) {
        if (noThrowError) {
          return
        } else {
          throw new Error(
            `找不到 ${component.namespace}@${component.version} 对应的组件资源`
          )
        }
      }

      if (!willFetchComLibs[libIndex].componentRuntimeMap) {
        willFetchComLibs[libIndex].componentRuntimeMap = {}
      }
      willFetchComLibs[libIndex].componentRuntimeMap[
        component.namespace + '@' + curComponent.version
      ] = curComponent
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
