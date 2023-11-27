import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect
} from 'react'
import axios from 'axios'
import { fAxios } from '../../services/http'
import moment from 'moment'
import { message } from 'antd'
import API from '@mybricks/sdk-for-app/api'
import { Locker, Toolbar } from '@mybricks/sdk-for-app/ui'
import config from './app-config'
import { fetchPlugins, removeBadChar } from '../../utils'
import { getRtComlibsFromConfigEdit } from './../../utils/comlib'
import { PreviewStorage } from './../../utils/previewStorage'
import { unionBy } from 'lodash'
import { MySelf_COM_LIB, PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from '../../constants'
import PublishModal, { EnumMode } from './components/PublishModal'
import { createFromIconfontCN } from '@ant-design/icons';
import { i18nLangContentFilter } from '../../utils/index'

import css from './app.less'
import { USE_CUSTOM_HOST } from './constants'

// 兜底物料
export const localizationDefaultComlibs = APP_TYPE === 'react' ? [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB] : []

const msgSaveKey = 'save'

export default function MyDesigner({ appData: originAppData }) {

  const appData = useMemo(() => {
    let data = { ...originAppData }
    // 防止触发originAppData.fileContent的getter计算
    data.fileContent = { ...data.fileContent }
    return data
  }, [originAppData])
  const coms = []
  if (appData?.defaultComlibs?.length) {
    appData?.defaultComlibs.forEach(lib => {
      const { namespace, content, version } = lib;
      const com = localizationDefaultComlibs.find(lib => lib.namespace === namespace)
      const { editJs, rtJs, coms: componentComs } = JSON.parse(content)
      if (com) {
        coms.push({ id: com.id, namespace, version, editJs, rtJs, coms: componentComs })
      } else {
        coms.push({ ...lib, editJs, rtJs, coms: componentComs })
      }
    })
  } else {
    coms.push(...localizationDefaultComlibs)
  }

  let comlibs = [];

  if (!appData.fileContent?.content?.comlibs) {
    coms.unshift(MySelf_COM_LIB)
    comlibs = coms;
  } else {
    const myselfComlib = appData.fileContent?.content?.comlibs?.find(lib => lib.id === "_myself_") ?? MySelf_COM_LIB
    coms.unshift(myselfComlib)
    if (appData.fileContent?.content?.comlibs?.some(lib => typeof lib === 'string')) {
      comlibs = coms;
    } else {
      comlibs = appData.fileContent?.content?.comlibs;
    }
  }

  const designer = './public/designer-spa/1.3.65/index.min.js'

  const appConfig = useMemo(() => {
    let config = null
    try {
      const originConfig = appData.config[APP_NAME]?.config || {}
      config = typeof originConfig === 'string' ? JSON.parse(originConfig) : originConfig
    } catch (error) {
      console.error('get appConfig error', error)
    }
    return config || {}
  }, [appData.config[APP_NAME]?.config])

  const { plugins = [] } = appConfig
  const uploadService = appConfig?.uploadServer?.uploadService || '';

  const [ctx, setCtx] = useState(() => {
    const envList = getMergedEnvList(appData, appConfig)
    const executeEnv = appData.fileContent?.content?.executeEnv || ''
    const debugMode = executeEnv === USE_CUSTOM_HOST
      ? EnumMode.CUSTOM
      : envList.length > 0
        ? EnumMode.ENV
        : EnumMode.DEFAULT
    return {
      sdk: {
        projectId: appData.projectId,
        openUrl: appData.openUrl
      },
      user: appData.user,
      fileName: appData.fileContent?.name,
      fileId: appData.fileId,
      setting: appData.config || {},
      hasMaterialApp: appData.hasMaterialApp,
      comlibs,
      latestComlibs: [],
      debugQuery: appData.fileContent?.content?.debugQuery,
      executeEnv,
      envList,
      i18nLangContent: {},
      i18nUsedIdList: [],
      debugMode,
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
      operable: false,
      isDebugMode: false,
      saveContent(content) {
        ctx.save({ content })
      },
      async save(
        param: { name?; shareType?; content?; icon?},
        skipMessage?: boolean
      ) {
        const { name, shareType, content, icon } = param

        await appData.save({
          userId: ctx.user?.id,
          fileId: ctx.fileId,
          name,
          shareType,
          content: removeBadChar(content),
          icon,
        }).then(() => {
          !skipMessage && message.success({ content: `保存完成`, key: msgSaveKey });
          if (content) {
            setSaveTip(`改动已保存-${moment(new Date()).format('HH:mm')}`)
          }
        }).catch(e => {
          !skipMessage && message.error({ content: `保存失败：${e.message}`, key: msgSaveKey });
          if (content) {
            setSaveTip('保存失败')
          }
        }).finally(() => {
          setSaveLoading(false)
        })
      }
    }
  })
  const publishingRef = useRef(false)
  const designerRef = useRef<{ dump; toJSON; geoView; switchActivity; getPluginData, loadContent }>()
  const [beforeunload, setBeforeunload] = useState(false)
  const [operable, setOperable] = useState(false)
  const [saveTip, setSaveTip] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [SPADesigner, setSPADesigner] = useState(null);
  const [remotePlugins, setRemotePlugins] = useState(null);
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [latestComlibs, setLatestComlibs] = useState<[]>()
  const [isDebugMode, setIsDebugMode] = useState(false)

  // 只有预览时 search 会携带 version 字段
  const isPreview = window.location.search.includes('version');

  //页面刷新的时候，添加fontJS资源
  useEffect(() => {
    createFromIconfontCN({
      scriptUrl: ctx.fontJS, // 在 iconfont.cn 上生成
    });
  }, [ctx.fontJS])

  useEffect(() => {
    const needSearchComlibs = comlibs.filter(lib => lib.id !== "_myself_");
    if (!!needSearchComlibs?.length) {
      API.Material.getLatestComponentLibrarys(needSearchComlibs.map(lib => lib.namespace)).then((res: any) => {
        const latestComlibs = (res || []).map(lib => ({ ...lib, ...JSON.parse(lib.content) }))
        setLatestComlibs(latestComlibs)
      })
    } else {
      setLatestComlibs([]);
    }
  }, [JSON.stringify(comlibs.map(lib => lib.namespace))])

  useEffect(() => {
    fetchPlugins(plugins).then(setRemotePlugins);
    console.log('应用数据:', appData);
  }, [])

  useEffect(() => {
    let designerSPAVerison = ''
    const regex = /(\d+?\.\d+\.\d+)/g;
    const matches = designer.match(regex);
    if (matches) {
      designerSPAVerison = matches[0];
    }
    const appInfo = {
      app: {
        verison: APP_VERSION || '',
        name: APP_NAME || ''
      },
      designerSPAVerison,
      renderWebVersion: RENDERWEB_VERSION || '',
      plugins: plugins.map(item => {
        const { name, title, updateTime } = item || {}
        return {
          name,
          title,
          updateTime
        }
      }),
      comlibs: comlibs.filter(item => item.id !== "_myself_").map(item => {
        const { id, namespace: name, version } = item || {}
        return {
          id,
          name,
          version
        }
      }),
    }

    // 简单判断本地环境，不上报数据
    if (window.location.origin.includes('http://localhost')) return
    appData.report({
      jsonData: {
        type: 'appInfo',
        payload: appInfo,
      }
    })
  }, [])

  useMemo(() => {
    if (designer) {
      const script = document.createElement('script');
      script.src = designer
      document.head.appendChild(script);
      script.onload = () => {
        (window as any).mybricks.SPADesigner && setSPADesigner((window as any).mybricks.SPADesigner);
      };
    }
  }, [designer])

  useEffect(() => {
    if (beforeunload) {
      window.onbeforeunload = () => {
        return true
      }
    } else {
      window.onbeforeunload = null
    }
  }, [beforeunload])

  const onEdit = useCallback(() => {
    setBeforeunload(true);
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
    if (!ctx.operable) {
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
    json.directConnection = ctx.directConnection
    json.executeEnv = ctx.executeEnv
    json.MYBRICKS_HOST = ctx.MYBRICKS_HOST
    json.envList = ctx.envList
    json.debugMainProps = ctx.debugMainProps
    json.hasPermissionFn = ctx.hasPermissionFn
    json.debugHasPermissionFn = ctx.debugHasPermissionFn
    json.fontJS = ctx.fontJS

    json.projectId = ctx.sdk.projectId;

    await ctx.save({ name: ctx.fileName, content: JSON.stringify(json) })

    setBeforeunload(false)

    await API.App.getPreviewImage({ // Todo... name 中文乱码
      element: designerRef.current?.geoView.canvasDom,
    }).then(async (res) => {
      const url = new URL(res)

      if (url.protocol === 'https:') {
        url.protocol = 'http:'
      }

      await ctx.save({ icon: url.href }, true)
    }).catch((err) => {
      console.error(err)
    })

  }, [isPreview])

  const preview = useCallback(() => {
    const json = designerRef.current?.toJSON()

    const previewStorage = new PreviewStorage({ fileId: ctx.fileId })
    previewStorage.savePreviewPageData({
      dumpJson: json,
      executeEnv: ctx.executeEnv,
      MYBRICKS_HOST: ctx.MYBRICKS_HOST,
      directConnection: ctx.directConnection,
      envList: ctx.envList,
      comlibs: getRtComlibsFromConfigEdit(ctx.comlibs),
      hasPermissionFn: ctx.hasPermissionFn,
      appConfig: JSON.stringify(appConfig),
      i18nLangContent: ctx.i18nLangContent
    })

    window.open(`./preview.html?fileId=${ctx.fileId}`)
  }, [appConfig])

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
        ; return (async () => {
          /** 先保存 */
          const json = designerRef.current?.dump();

          json.comlibs = ctx.comlibs
          json.debugQuery = ctx.debugQuery
          json.executeEnv = ctx.executeEnv
          json.MYBRICKS_HOST = ctx.MYBRICKS_HOST
          json.envList = ctx.envList
          json.debugMainProps = ctx.debugMainProps
          json.hasPermissionFn = ctx.hasPermissionFn
          json.debugHasPermissionFn = ctx.debugHasPermissionFn
          json.projectId = ctx.sdk.projectId;
          json.i18nLangContent = i18nLangContentFilter(ctx.i18nLangContent, ctx.i18nUsedIdList)

          await ctx.save({ content: JSON.stringify(json), name: ctx.fileName }, true);
          setBeforeunload(false);

          const curToJSON = designerRef?.current?.toJSON();

          const curComLibs = await genLazyloadComs(ctx.comlibs, curToJSON)

          const toJSON = JSON.parse(JSON.stringify({
            ...curToJSON,
            configuration: {
              // scripts: encodeURIComponent(scripts),
              comlibs: curComLibs,
              title: ctx.fileName,
              publisherEmail: ctx.user.email,
              publisherName: ctx.user?.name,
              projectId: ctx.sdk.projectId,
              envList: ctx.envList,
              i18nLangContent: i18nLangContentFilter(ctx.i18nLangContent, ctx.i18nUsedIdList),
              // 非模块下的页面直接发布到项目空间下
              folderPath: '/app/pcpage',
              fileName: `${ctx.fileId}.html`,
              groupName: appData?.hierarchy?.groupName || '',
              groupId: appData?.hierarchy?.groupId || 0,
              appConfig,
            },
            hasPermissionFn: ctx.hasPermissionFn
          }));

          const res: { code: number, message: string } = await fAxios.post('/api/pcpage/publish', {
            userId: ctx.user?.id,
            fileId: ctx.fileId,
            json: toJSON,
            envType,
            commitInfo
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

        })()
          .catch((e) => {
            console.error(e)
            close()
            message.error({
              key: 'publish',
              content: '网络错误，请稍后再试',
              duration: 2,
            })
          }).finally(() => {
            publishingRef.current = false
            setPublishLoading(false)
          })
    },
    [appData]
  )

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
    message.destroy();
    message[type](msg);
  }, []);

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
      directConnection: ctx.directConnection,
      // executeEnv: ctx.executeEnv,
      // MYBRICKS_HOST: ctx.MYBRICKS_HOST,
      // envList: ctx.envList,
      debugMainProps: ctx.debugMainProps,
      hasPermissionFn: ctx.hasPermissionFn,
      debugHasPermissionFn: ctx.debugHasPermissionFn
    }
    return json
  }, [JSON.stringify(ctx)])
  window.designerRef = designerRef
  return (
    <div className={`${css.view} fangzhou-theme`}>
      <Toolbar
        title={ctx.fileName}
        updateInfo={<Toolbar.LastUpdate
          content={saveTip}
          onClick={handleSwitch2SaveVersion} />}
      >
        {!isPreview && RenderLocker}
        {
          !isPreview && <>
            <Toolbar.Save
              disabled={!operable || isDebugMode}
              loading={saveLoading}
              onClick={() => {
                save()
              }}
              dotTip={beforeunload}
            />
            <Toolbar.Button disabled={isDebugMode} onClick={preview}>预览</Toolbar.Button>
            <Toolbar.Button
              disabled={!operable || isDebugMode}
              loading={publishLoading}
              onClick={() => setPublishModalVisible(true)}
            >发布</Toolbar.Button>
          </>
        }
        <div className={`${isPreview ? css.toolbarWrapperPreview : ""}`}>
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
        {SPADesigner && remotePlugins && latestComlibs && window?.mybricks?.createObservable && (
          <>
            <SPADesigner
              ref={designerRef}
              config={config(window?.mybricks?.createObservable(Object.assign(ctx, { latestComlibs })), appData, save, designerRef, remotePlugins)}
              onEdit={onEdit}
              onMessage={onMessage}
              onDebug={onDebug}
              _onError_={(ex: any) => {
                console.error(ex);
                onMessage('error', ex.message);
              }}
            />
          </>
        )}
      </div>
      <PublishModal
        envList={ctx.envList}
        visible={publishModalVisible}
        onOk={(publishConfig) => {
          publish(publishConfig)
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
  const curComLibs = JSON.parse(JSON.stringify(comlibs));
  const mySelfComMap = {}
  comlibs.forEach((comLib) => {
    if (comLib?.defined && Array.isArray(comLib.comAray)) {
      comLib.comAray.forEach((com) => {
        mySelfComMap[`${com.namespace}@${com.version}`] = true
      })
    }
  });

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
  ];

  let definedComsDeps = []
  let modulesDeps = []

  if (toJSON.definedComs) {
    Object.keys(toJSON.definedComs).forEach(key => {
      definedComsDeps = [...definedComsDeps, ...toJSON.definedComs[key].json.deps]
    })
  }

  if (toJSON.modules) {
    Object.keys(toJSON.modules).forEach(key => {
      modulesDeps = [...modulesDeps, ...toJSON.modules[key].json.deps]
    })
  }

  let deps = [
    ...(toJSON.scenes || [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [])
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(toJSON.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [])
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ];

  deps = deps.reduce((accumulator, current) => {
    const existingObject = accumulator.find(obj => obj.namespace === current.namespace);
    if (!existingObject) {
      accumulator.push(current);
    }
    return accumulator;
  }, []);

  if (deps.length) {
    const willFetchComLibs = curComLibs.filter(lib => !lib?.defined && lib.coms);
    const allComLibsRuntimeMap = (await Promise.all(willFetchComLibs.map(lib => axios.get(lib.coms, { withCredentials: false }))))
      .map(data => data.data);
    const noThrowError = comlibs.some(lib => !lib.coms && !lib.defined);

    deps.forEach(component => {
      let libIndex = allComLibsRuntimeMap.findIndex(lib => lib[component.namespace + '@' + component.version]);
      let curComponent = null;
      if (libIndex !== -1) {
        curComponent = allComLibsRuntimeMap[libIndex][component.namespace + '@' + component.version];
      } else {
        libIndex = allComLibsRuntimeMap.findIndex(lib => Object.keys(lib).find(key => key.startsWith(component.namespace)));

        if (libIndex === -1) {
          if (noThrowError) {
            return;
          } else {
            throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
          }
        }
        curComponent = allComLibsRuntimeMap[libIndex][Object.keys(allComLibsRuntimeMap[libIndex]).find(key => key.startsWith(component.namespace))];
      }

      if (!curComponent) {
        if (noThrowError) {
          return;
        } else {
          throw new Error(`找不到 ${component.namespace}@${component.version} 对应的组件资源`);
        }
      }

      if (!willFetchComLibs[libIndex].componentRuntimeMap) {
        willFetchComLibs[libIndex].componentRuntimeMap = {};
      }
      willFetchComLibs[libIndex].componentRuntimeMap[component.namespace + '@' + curComponent.version] = curComponent;
    });
  }

  return curComLibs
}

const getMergedEnvList = (appData, appConfig) => {
  // 页面已有的环境信息
  const pageEnvlist = appData.fileContent?.content?.envList || []
  // 全局配置的环境信息
  const configEnvlist = appConfig?.publishEnvConfig?.envList?.map(item => ({
    title: item.title,
    name: item.name,
    value: item.defaultApiPrePath
  })) || []

  return unionBy([...pageEnvlist, ...configEnvlist], 'name')
}