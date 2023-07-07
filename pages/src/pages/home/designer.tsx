import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback
} from 'react'
import axios from 'axios'
import moment from 'moment'
import { message } from 'antd'
import API from '@mybricks/sdk-for-app/api'
import { Locker, Toolbar } from '@mybricks/sdk-for-app/ui'
import config from './app-config'
import { getManateeUserInfo } from '../../utils'
import { getRtComlibsFromConfigEdit } from './../../utils/comlib'
import { PreviewStorage } from './../../utils/previewStorage'
import { ComlibEditUrl, ChartsEditUrl, BasicEditUrl } from '../../constants'

import css from './app.less'

const appName = 'mybricks-app-pcspa-for-manatee'

const DefaultUploadService = 'http://dev.manateeai.com/biz/uploadExternalFileLocal'

// 暂时写死，后续统一走 物料中心
const defaultComlibs = [BasicEditUrl, ComlibEditUrl, ChartsEditUrl]

export default function MyDesigner({ appData }) {
  const { comlibs = [] } = appData.config[appName]?.config ?? {}
  // const configComlibs = comlibs.map(lib => lib.editJs)
  const designer = 'https://f2.beckwai.com/kos/nlav12333/mybricks/designer-spa/1.2.82/index.min.js'

  const [manateeUserInfo] = useState(getManateeUserInfo())
  
  const [ctx] = useState({
    sdk: appData,
    user: appData.user,
    fileId: appData.fileId,
    fileItem: appData.fileContent || {},
    setting: appData.config || {},
    hasMaterialApp: appData.hasMaterialApp,
    comlibs: (appData.fileContent?.content?.comlibs?.filter?.((comlib) => comlib.defined) || []).concat(defaultComlibs),
    // comlibs: ['http://localhost:8001/libEdt.js', 'http://localhost:8002/libEdt.js'],
    debugQuery: appData.fileContent?.content?.debugQuery,
    versionApi: null,
    uploadService: appData.config[appName]?.config ? JSON.parse(appData.config[appName]?.config).uploadServer?.uploadService : DefaultUploadService,
    manateeUserInfo,
    saveContent(content) {
      ctx.save({ content})
    },
    save(
      param: { name?; shareType?; content?; icon? },
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


	
	useEffect(() => {
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
    setSaveLoading(true)
    //保存
    const json = designerRef.current?.dump()
    json.comlibs = ctx.comlibs
    json.debugQuery = ctx.debugQuery

    // const scripts = await ComlibService.getRtSourceCode(ctx.comlibs)
    json.toJSON = JSON.parse(JSON.stringify({...designerRef?.current?.toJSON(), configuration: {
      // scripts: encodeURIComponent(scripts),
      comlibs: ctx.comlibs,
      title: ctx.fileItem.name,
      projectId: ctx.sdk.projectId,
      folderPath: '/app/pcpage',
      fileName: `${ctx.fileItem.id}.html`
    }}));
		json.projectId = ctx.sdk.projectId;
    json.debugQuery = ctx.debugQuery;
    ctx.save({name: ctx.fileItem.name, content: JSON.stringify(json)})
    setBeforeunload(false)

    API.App.getPreviewImage({ // Todo... name 中文乱码
      element: designerRef.current?.geoView.canvasDom,
      // name: `${ctx.fileItem.name}.png`
    }).then(res => {
      ctx.save({ icon: res }, true)
    }).catch((err) => {
      console.error(err)
    })

  }, [])

  const preview = useCallback(() => {
    const json = designerRef.current?.toJSON()

    const previewStorage = new PreviewStorage({ fileId: ctx.fileId })
    previewStorage.savePreviewPageData({
      dumpJson: json,
      comlibs: getRtComlibsFromConfigEdit(ctx.comlibs, comlibs),
    })

    window.open(`./preview.html?fileId=${ctx.fileId}`)
  }, [])

  const publish= useCallback(
    () => {
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
      ;(async () => {
		    /** 先保存 */
		    const json = designerRef.current?.dump();
        json.comlibs = ctx.comlibs
        json.debugQuery = ctx.debugQuery

        // let folderPath;

        // if (type === 'staging') {
        //   folderPath = '/staging/app/pcpage'
        // } else {
        //   folderPath = '/app/pcpage'
        // }

		    json.toJSON = JSON.parse(JSON.stringify({...designerRef?.current?.toJSON(), configuration: {
          // scripts: encodeURIComponent(scripts),
          comlibs: ctx.comlibs,
          title: ctx.fileItem.name,
          projectId: ctx.sdk.projectId,
          // 非模块下的页面直接发布到项目空间下
          folderPath: '/app/pcpage',
          fileName: `${ctx.fileItem.id}.html`
        }}));

        json.projectId = ctx.sdk.projectId;
        
		    await ctx.save({ content: JSON.stringify(json), name: ctx.fileItem.name }, true);

		    setBeforeunload(false);

        await axios.post('/api/pcpage/publish', {
          userId: ctx.user?.email,
          fileId: ctx.fileId,
          json: json.toJSON,
          envType: 'prod',
          manateeUserInfo
        })

        message.success({
          key: 'publish',
          content: '发布成功',
          duration: 2,
        })
        setPublishLoading(false)

        designerRef.current?.switchActivity?.('@mybricks/plugins/version')
        setTimeout(() => {
          // ctx?.versionApi?.switchAciveTab?.('publish', option?.name)
          ctx?.versionApi?.switchAciveTab?.('publish', void 0)
        }, 0)
      })()
        .catch((e) => {
          message.error({
            key: 'publish',
            content: e?.message || '发布失败',
            duration: 2,
          })
        }).finally(() => {
          publishingRef.current = false
        })
    },
    []
  )

  const RenderLocker = useMemo(() => {
    return (
      <Locker
        statusChange={(status) => {
          setOperable(status === 1)
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
          onClick={save}
          dotTip={beforeunload}
        />
        <Toolbar.Button onClick={preview}>预览</Toolbar.Button>
        <Toolbar.Button
          disabled={!operable}
          loading={publishLoading}
          onClick={publish}
        >发布</Toolbar.Button>
      </Toolbar>
      <div className={css.designer}>
	      {SPADesigner && (
					<>
	          <SPADesigner
	            ref={designerRef}
	            config={config(ctx, save)}
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
    </div>
  )
}
