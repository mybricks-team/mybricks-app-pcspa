import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect
} from 'react'
import { fAxios } from '../../services/http'
import moment from 'moment'
import { message } from 'antd'
import API from '@mybricks/sdk-for-app/api'
import { Locker, Toolbar } from '@mybricks/sdk-for-app/ui'
import config from './app-config'
// import { getManateeUserInfo } from '../../utils'
import { fetchPlugins, getManateeUserInfo } from '../../utils'
import { getRtComlibsFromConfigEdit } from './../../utils/comlib'
import { PreviewStorage } from './../../utils/previewStorage'
import { MySelf_COM_LIB, PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from '../../constants'
import PublishModal from './components/PublishModal'

import css from './app.less'

// const DefaultUploadService = '/biz/uploadExternalFileLocal'

// 兜底物料
export const defaultComlibs = [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB]

export default function MyDesigner({ appData }) {
  const coms = []
  if (appData?.defaultComlibs?.length) {
    appData?.defaultComlibs.forEach(lib => {
      const { namespace, content, version } = lib;
      const com = defaultComlibs.find(lib => lib.namespace === namespace)
      const { editJs, rtJs } = JSON.parse(content)
      if (com) {
        coms.push({ id: com.id, namespace, version, editJs, rtJs })
      } else {
        coms.push({ ...lib, editJs, rtJs })
      }
    })
  } else {
    coms.push(...defaultComlibs)
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
  comlibs.forEach(lib => lib.coms = undefined);

  const designer = 'https://f2.beckwai.com/kos/nlav12333/mybricks/designer-spa/1.3.8/index.min.js'

  // const configComlibs = comlibs.map(lib => lib.editJs)

  // const [manateeUserInfo] = useState(getManateeUserInfo())

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

  const [ctx, setCtx] = useState({
    sdk: appData,
    user: appData.user,
    fileId: appData.fileId,
    fileItem: appData.fileContent || {},
    setting: appData.config || {},
    hasMaterialApp: appData.hasMaterialApp,
    comlibs,
    latestComlibs: [],
    debugQuery: appData.fileContent?.content?.debugQuery,
    executeEnv: appData.fileContent?.content?.executeEnv || '',
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
    save(
      param: { name?; shareType?; content?; icon?},
      skipMessage?: boolean
    ) {
      const { name, shareType, content, icon } = param
      API.File.save({
        userId: ctx.user?.id,
        fileId: ctx.fileId,
        name,
        shareType,
        content,
        icon,
      }).then(() => {
        !skipMessage && message.success(`保存完成`);
        if (content) {
          setSaveTip(`改动已保存-${moment(new Date()).format('HH:mm')}`)
        }
      }).catch(e => {
        !skipMessage && message.error(`保存失败：${e.message}`);
        if (content) {
          setSaveTip('保存失败')
        }
      }).finally(() => {
        setSaveLoading(false)
      })
    },
    setName(name) {
      if (ctx.fileItem.name !== name) {
        ctx.fileItem.name = name
      }
    }
  })
  const publishingRef = useRef(false)
  const designerRef = useRef<{ dump; toJSON; geoView; switchActivity; getPluginData }>()
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

  useEffect(() => {
    API.Material.getLatestComponentLibrarys(comlibs.filter(lib => lib.id !== "_myself_").map(lib => lib.namespace)).then((res: any) => {
      const latestComlibs = (res || []).map(lib => ({ ...lib, ...JSON.parse(lib.content) }))
      setLatestComlibs(latestComlibs)
    })
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
    if (!ctx.operable) {
      message.warn('请先点击右上角个人头像上锁获取页面编辑权限')
      return
    }
    if (ctx.isDebugMode) {
      console.warn('请退出调试模式，再进行保存')
      return
    }

    setSaveLoading(true)
    //保存
    const json = designerRef.current?.dump()
    ctx.comlibs.forEach(lib => lib.coms = undefined);
    json.comlibs = ctx.comlibs
    json.debugQuery = ctx.debugQuery
    json.executeEnv = ctx.executeEnv
    json.debugMainProps = ctx.debugMainProps
    json.hasPermissionFn = ctx.hasPermissionFn
    json.debugHasPermissionFn = ctx.debugHasPermissionFn

    json.projectId = ctx.sdk.projectId;

    ctx.save({ name: ctx.fileItem.name, content: JSON.stringify(json) })

    setBeforeunload(false)

    API.App.getPreviewImage({ // Todo... name 中文乱码
      element: designerRef.current?.geoView.canvasDom,
      // name: `${ctx.fileItem.name}.png`
    }).then(res => {
      const url = new URL(res)

      if (url.protocol === 'https:') {
        url.protocol = 'http:'
      }

      ctx.save({ icon: url.href }, true)
    }).catch((err) => {
      console.error(err)
    })

  }, [])

  const preview = useCallback(() => {
    const json = designerRef.current?.toJSON()

    const previewStorage = new PreviewStorage({ fileId: ctx.fileId })
    previewStorage.savePreviewPageData({
      dumpJson: json,
      executeEnv: ctx.executeEnv,
      comlibs: getRtComlibsFromConfigEdit(ctx.comlibs),
      hasPermissionFn: ctx.hasPermissionFn
    })

    window.open(`./preview.html?fileId=${ctx.fileId}`)
  }, [])

  const publish = useCallback(
    (publishConfig) => {
      if (publishingRef.current) {
        return
      }
      const { envType = 'prod', commitInfo } = publishConfig
      publishingRef.current = true

      setPublishLoading(true)

      const close = message.loading({
        key: 'publish',
        content: '页面发布中',
        duration: 0,
      })
        ; return (async () => {
          /** 先保存 */
          const json = designerRef.current?.dump();

          ctx.comlibs.forEach(lib => lib.coms = undefined);
          json.comlibs = ctx.comlibs
          json.debugQuery = ctx.debugQuery
          json.executeEnv = ctx.executeEnv
          json.debugMainProps = ctx.debugMainProps
          json.hasPermissionFn = ctx.hasPermissionFn
          json.debugHasPermissionFn = ctx.debugHasPermissionFn
          json.projectId = ctx.sdk.projectId;

          await ctx.save({ content: JSON.stringify(json), name: ctx.fileItem.name }, true);

          setBeforeunload(false);

          const toJSON = JSON.parse(JSON.stringify({
            ...designerRef?.current?.toJSON(),
            configuration: {
              // scripts: encodeURIComponent(scripts),
              comlibs: ctx.comlibs,
              title: ctx.fileItem.name,
              publisherEmail: ctx.user.email,
              publisherName: ctx.user?.name,
              projectId: ctx.sdk.projectId,
              // 非模块下的页面直接发布到项目空间下
              folderPath: '/app/pcpage',
              fileName: `${ctx.fileItem.id}.html`,
              groupName: appData?.hierarchy?.groupName || '',
              groupId: appData?.hierarchy?.groupId || 0
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

  return (
    <div className={`${css.view} fangzhou-theme`}>
      <Toolbar
        title={ctx.fileItem?.name}
        updateInfo={<Toolbar.LastUpdate
        content={saveTip}
        onClick={handleSwitch2SaveVersion} />}
      >
        {RenderLocker}
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
      </Toolbar>
      <div className={css.designer}>
        {SPADesigner && remotePlugins && latestComlibs && (
          <>
            <SPADesigner
              ref={designerRef}
              config={config(Object.assign(ctx, { latestComlibs }), save, designerRef, remotePlugins)}
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
      <PublishModal envList={ctx?.appConfig?.publishEnvConfig?.envList || []} visible={publishModalVisible} onOk={(publishConfig) => {
        publish(publishConfig)
        setPublishModalVisible(false)
      }} onCancel={() => setPublishModalVisible(false)} />
    </div>
  )
}

