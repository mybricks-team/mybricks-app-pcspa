// import { render } from 'react-dom'
import ReactDOM from 'react-dom';
import { ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN';
import { call as callConnectorHttp } from '@mybricks/plugin-connector-http'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain';
import { ComlibRtUrl, ChartsRtUrl, BasicRtUrl, PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from './../../constants'
import { getQueryString } from './../../utils'
import { runJs } from './../../utils/runJs'
import { PreviewStorage } from './../../utils/previewStorage'
const { render: renderUI } = (window as any)._mybricks_render_web

const fileId = getQueryString('fileId')

const previewStorage = new PreviewStorage({ fileId })

let { dumpJson, comlibs, hasPermissionFn, executeEnv } = previewStorage.getPreviewPageData()

if (!dumpJson) {
  throw new Error('数据错误：项目数据缺失')
}

function cssVariable (dumpJson) {
  const themes = dumpJson?.plugins?.['@mybricks/plugins/theme/use']?.themes
  if (Array.isArray(themes)) {
    themes.forEach(({ namespace, content }) => {
      const variables = content?.variables

      if (Array.isArray(variables)) {
        const style = document.createElement('style')
        style.id = namespace
        let innerHTML = ''

        variables.forEach(({ config }) => {
          Object.entries(config).forEach(([key, value]) => {
            innerHTML = innerHTML + `${key}: ${value};\n`
          })
        })

        style.innerHTML = `:root {\n${innerHTML}}`
        document.body.appendChild(style)
      }
    })
  }
}

cssVariable(dumpJson)

if (!comlibs) {
  console.warn('数据错误: 组件库缺失')
  comlibs = [PC_NORMAL_COM_LIB.rtJs, CHARS_COM_LIB.rtJs, BASIC_COM_LIB.rtJs]
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


function render(props) {
  const { container } = props;
  if (comlibs && Array.isArray(comlibs)) {
    Promise.all(comlibs.map((t) => requireScript(t))).then(() => {
      // render(<Page />, document.querySelector('#root'))
      ReactDOM.render(<Page props={props} hasPermissionFn={hasPermissionFn} />, container ? container.querySelector('#root') : document.querySelector('#root'));
    })
  }

}

if (!window.__POWERED_BY_QIANKUN__) {
  render({});
}

export async function bootstrap() {
  console.log('react app bootstraped');
}

export async function mount(props) {
  // console.log('[react16] props from main framework', props);
  render(props);
}

export async function unmount(props) {
  const { container } = props;

  ReactDOM.unmountComponentAtNode(container ? container.querySelector('#root') : document.querySelector('#root'));
}

// if (comlibs && Array.isArray(comlibs)) {
//   Promise.all(comlibs.map((t) => requireScript(t))).then(() => {
//     render(<Page />, document.querySelector('#root'))
//   })
// }

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

function Page({ props, hasPermissionFn }) {

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
                  if (connector.type === 'http' || connector.type === 'http-manatee') {
                    //服务接口类型
                    return callConnectorHttp(
                      { script: connector.script, useProxy: true, executeEnv },
                      params
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
            if (connector.type === 'http' || connector.type === 'http-manatee') {
              //服务接口类型
              return callConnectorHttp(
                { script: connector.script, useProxy: true, executeEnv },
                params
              )
            } else {
              return Promise.reject('错误的连接器类型.')
            }
          },
          vars: {
            getQuery: () => parseQuery(location.search),
            get getProps() {
              return () => {
                // 获取主应用参数方法，如：token等参数，取决于主应用传入
                if (!props) return undefined
                return props
              }
            },
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
          get hasPermission() {
            return ({ key }) => {

              if (!hasPermissionFn) {
                return true;
              }

              let result;

              try {
                result = runJs(decodeURIComponent(hasPermissionFn), [
                  { key },
                ]);

                if (typeof result !== 'boolean') {
                  result = true;
                  console.warn(
                    `权限方法返回值类型应为 Boolean 请检查，[key] ${key}; [返回值] type: ${typeof result}; value: ${JSON.stringify(
                      result,
                    )}`,
                  );
                }
              } catch (error) {
                result = true;
                console.error(`权限方法出错 [key] ${key}；`, error);
              }

              return result;
            };
          },
          // uploadFile: uploadApi
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
