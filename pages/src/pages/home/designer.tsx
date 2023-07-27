import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback
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

const appName = 'mybricks-app-pcspa'

// const DefaultUploadService = '/biz/uploadExternalFileLocal'

// 兜底物料
export const defaultComlibs = [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB]

export default function MyDesigner({ appData }) {
  const coms = []
  if (appData?.defaultComlibs?.length) {
    appData?.defaultComlibs.forEach(lib => {
      const { namespace, content, version } = lib;
      const com = defaultComlibs.find(lib => lib.namespace === namespace)
      if (com) {
        coms.push({ id: com.id, namespace, ...JSON.parse(content), version })
      } else {
        coms.push({ ...lib, ...JSON.parse(content) })
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
  const designer = 'https://f2.beckwai.com/kos/nlav12333/mybricks/designer-spa/1.2.90/index.min.js'
  const { plugins = [] } = JSON.parse(appData.config[appName]?.config ?? "{}");
  // const configComlibs = comlibs.map(lib => lib.editJs)

  // const [manateeUserInfo] = useState(getManateeUserInfo())

  let uploadService = null;
  let appConfig = null // 记录应用所有配置
  try {
    appConfig = JSON.parse(appData.config[appName]?.config)
    uploadService = appConfig?.uploadServer?.uploadService
  } catch (error) {
  }

  const [ctx] = useState({
    sdk: appData,
    user: appData.user,
    fileId: appData.fileId,
    fileItem: appData.fileContent || {},
    setting: appData.config || {},
    hasMaterialApp: appData.hasMaterialApp,
    comlibs,
    latestComlibs: appData?.defaultComlibs,
    debugQuery: appData.fileContent?.content?.debugQuery,
    executeEnv: appData.fileContent?.content?.executeEnv || '',
    debugMainProps: appData.fileContent?.content?.debugMainProps,
    versionApi: null,
    appConfig,
    uploadService,
    // manateeUserInfo,
    operable: false,
    saveContent(content) {
      ctx.save({ content })
    },
    save(
      param: { name?; shareType?; content?; icon?},
      skipMessage?: boolean
    ) {
      const { name, shareType, content, icon } = param
      API.File.save({
        userId: ctx.user?.email,
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
  const [remotePlugins, setRemotePlugins] = useState([]);
  const [publishModalVisible, setPublishModalVisible] = useState(false)

  const envList = useMemo(() => {
    const list = ctx?.appConfig?.publishEnvConfig?.envList || []
    return list.map(item => ({
      label: item.title,
      type: item.name
    }))
  }, [])

  useEffect(() => {
    fetchPlugins(plugins, setRemotePlugins);
    console.log('应用数据:', appData);
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

    setSaveLoading(true)
    //保存
    const json = designerRef.current?.dump()
    json.comlibs = ctx.comlibs
    json.debugQuery = ctx.debugQuery
    json.executeEnv = ctx.executeEnv
    json.debugMainProps = ctx.debugMainProps

    json.toJSON = JSON.parse(JSON.stringify({
      ...designerRef?.current?.toJSON(), configuration: {
        comlibs: ctx.comlibs,
        title: ctx.fileItem.name,
        projectId: ctx.sdk.projectId,
        folderPath: '/app/pcpage',
        fileName: `${ctx.fileItem.id}.html`
      }
    }));

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
    })

    window.open(`./preview.html?fileId=${ctx.fileId}`)
  }, [])

  const publish = useCallback(
    (envType) => {
      if (publishingRef.current) {
        return
      }

      publishingRef.current = true

      setPublishLoading(true)

      message.loading({
        key: 'publish',
        content: '页面发布中',
        duration: 0,
      })
        ; return (async () => {
          /** 先保存 */
          const json = designerRef.current?.dump();
          json.comlibs = ctx.comlibs
          json.debugQuery = ctx.debugQuery
          json.executeEnv = ctx.executeEnv

          // let folderPath;

          // if (type === 'staging') {
          //   folderPath = '/staging/app/pcpage'
          // } else {
          //   folderPath = '/app/pcpage'
          // }

          json.toJSON = JSON.parse(JSON.stringify({
            ...designerRef?.current?.toJSON(), configuration: {
              // scripts: encodeURIComponent(scripts),
              comlibs: ctx.comlibs,
              title: ctx.fileItem.name,
              projectId: ctx.sdk.projectId,
              // 非模块下的页面直接发布到项目空间下
              folderPath: '/app/pcpage',
              fileName: `${ctx.fileItem.id}.html`
            }
          }));

          json.projectId = ctx.sdk.projectId;

          await ctx.save({ content: JSON.stringify(json), name: ctx.fileItem.name }, true);

          setBeforeunload(false);

          const res: { code: number, message: string } = await fAxios.post('/api/pcpage/publish', {
            userId: ctx.user?.email,
            fileId: ctx.fileId,
            json: json.toJSON,
            envType
          })
          if (res.code === 1) {
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
            message.error({
              content: res.message || '发布失败',
              duration: 2,
            })
          }

          setPublishLoading(false)

        })()
          .catch((e) => {
            console.error(e)
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
    []
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

  return (
    <div className={`${css.view} fangzhou-theme`}>
      <Toolbar title={ctx.fileItem?.name} updateInfo={<Toolbar.LastUpdate content={saveTip} onClick={handleSwitch2SaveVersion} />}>
        {RenderLocker}
        <Toolbar.Save
          disabled={!operable}
          loading={saveLoading}
          onClick={() => {
            save()
          }}
          dotTip={beforeunload}
        />
        <Toolbar.Button onClick={preview}>预览</Toolbar.Button>
        <Toolbar.Publish
          disabled={!operable}
          loading={publishLoading}
          onClick={publish}
          envList={envList}
        />
      </Toolbar>
      <div className={css.designer}>
        {SPADesigner && (
          <>
            <SPADesigner
              ref={designerRef}
              config={config(ctx, save, remotePlugins)}
              onEdit={onEdit}
              onMessage={onMessage}
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
