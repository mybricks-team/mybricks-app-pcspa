import { render } from 'react-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN';
import { call as callConnectorHttp } from '@mybricks/plugin-connector-http'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain';
import { ComlibRtUrl, ChartsRtUrl } from './../../constants'
import { getQueryString } from './../../utils'
import { PreviewStorage } from './../../utils/previewStorage'
import axios from 'axios'
import { message } from 'antd'
const { render: renderUI } = (window as any)._mybricks_render_web

const fileId = getQueryString('fileId')

const previewStorage = new PreviewStorage({ fileId })

let { dumpJson, comlibs } = previewStorage.getPreviewPageData()

if (!dumpJson) {
  throw new Error('数据错误：项目数据缺失')
}

if (!comlibs) {
  console.warn('数据错误: 组件库缺失')
  comlibs = [ComlibRtUrl, ChartsRtUrl]
}

function uploadApi(fileList: File[]) {
  const form = new FormData();
  fileList.forEach((file: File) => {
    form.append('file', file);
  });

  form.append('folderPath', `/fiels/${Date.now()}`);

  return axios.post(
    `/mybricks-pc-page/paas/api/flow/saveFile`, form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  )
    .then((e) => {
      if (e && e.data?.code === 1) {
        message.success(`上传成功`);
        const resData = e.data?.data
        return Array.isArray(resData) ? resData : [resData];
      }
      console.warn(`上传失败`, e?.data || e);
      message.error(`上传失败`);
      throw new Error(`调用接口失败`)
    })
    .catch((e) => {
      console.warn(`上传失败`, e);
      message.error(`上传失败`);
      throw e
    });
}

const requireScript = (src) => {
  var script = document.createElement('script')
  script.setAttribute('src', src)

  return new Promise((resolve, reject) => {
    script.onload = resolve
    document.body.appendChild(script)
  })
}

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
  // Object.keys(window['CloudComponentDependentComponents']).forEach((key) => {
  //   const [namespace, version] = key.split('@')

  //   comDefs[`${namespace}-${version}`] =
  //     window['CloudComponentDependentComponents'][key]
  // })
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

//----------------------------------------------------------------------------

if (comlibs && Array.isArray(comlibs)) {
  Promise.all(comlibs.map((t) => requireScript(t))).then(() => {
    render(<Page />, document.querySelector('#root'))
  })
}

function decode(str: string) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(false, `Error decoding "${str}". Leaving it intact.`)
    }
  }
  return str
}

function parseQuery(query) {
  const res = {}
  query = query.trim().replace(/^(\?|#|&)/, '')
  if (!query) {
    return res
  }
  query.split('&').forEach((param) => {
    const parts = param.replace(/\+/g, ' ').split('=')
    const key = decode(parts.shift())
    const val = parts.length > 0 ? decode(parts.join('=')) : null
    if (res[key] === undefined) {
      res[key] = val
    } else if (Array.isArray(res[key])) {
      res[key].push(val)
    } else {
      res[key] = [res[key], val]
    }
  })
  return res
}

function Page() {
  return (
    <ConfigProvider locale={zhCN}>
      {renderUI(dumpJson, {
        //渲染Mybricks toJSON的结果
        env: {
          renderCom(json, opts, coms) {
            return renderUI(
              json,
              {
                comDefs: { ...getComs(), ...coms },
                // observable: window['rxui'].observable,
                ...(opts || {}),
                env: {
                  ...(opts?.env || {}),
                  edit: false,
                  runtime: true
                },
                /** 调用领域模型 */
                callDomainModel(domainModel, type, params) {
                  return callDomainHttp(domainModel, params, { action: type });
                },
                callConnector(connector, params) {
                  //调用连接器
                  if (connector.type === 'http') {
                    //服务接口类型
                    return callConnectorHttp(
                      { script: connector.script, useProxy: true },
                      params
                    )
                  } else if (connector.type === 'http-sql') {
                    return callConnectorHttp(
                      { script: connector.script },
                      params,
                      {
                        // 发送请求前的钩子函数
                        before(options) {
                          let newOptions = { ...options }
                          return {
                            ...newOptions
                          }
                        }
                      }
                    )
                  } else {
                    return Promise.reject('错误的连接器类型.')
                  }
                }
              }
            )
          },
          i18n(title) {
            //多语言
            return title
          },
          /** 调用领域模型 */
          callDomainModel(domainModel, type, params) {
            return callDomainHttp(domainModel, params, { action: type });
          },
          callConnector(connector, params) {
            //调用连接器
            if (connector.type === 'http') {
              //服务接口类型
              return callConnectorHttp(
                { script: connector.script, useProxy: true },
                params
              )
            } else if (connector.type === 'http-sql') {
              return callConnectorHttp(
                { script: connector.script },
                params,
                {
                  // 发送请求前的钩子函数
                  before(options) {
                    let newOptions = { ...options }
                    return {
                      ...newOptions
                    }
                  }
                }
              )
            } else {
              return Promise.reject('错误的连接器类型.')
            }
          },
          vars: {
            getQuery: () => parseQuery(location.search),
            get getRouter() {
              const isUri = (url: string) => {
                return /^http[s]?:\/\/([\w\-\.]+)+[\w-]*([\w\-\.\/\?%&=]+)?$/gi.test(
                  url,
                );
              };
              return () => ({
                reload: () => location.reload(),
                redirect: ({ url }: { url: string }) => location.replace(url),
                back: () => history.back(),
                forward: () => history.forward(),
                pushState: ({
                  state,
                  title,
                  url,
                }: {
                  state: any;
                  title: string;
                  url: string;
                }) => {
                  if (isUri(url)) {
                    //兼容uri
                    location.href = url;
                  } else {
                    history.pushState(state, title, url);
                  }
                },
                openTab: ({ url, title }: { url: string; title: string }) =>
                  open(url, title || '_blank'),
              });
            },
          },
          uploadFile: uploadApi
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
        ]
      })}
    </ConfigProvider>
  )
}
