import ReactDOM from 'react-dom';
import React from 'react'
import { message } from 'antd'
import { runJs } from './../../utils/runJs'


const USE_CUSTOM_HOST = '__USE_CUSTOM_HOST__'

const combineHostAndPath = (host, path) => {
  const _host = host.replace(/\/$/, '')
  const _path = path.replace(/^\//, '')
  return _host + '/' + _path
}

const shapeUrlByEnv = (envList, env, url, mybricksHost) => {
  if (!envList || !env || /^(https?|ws)/.test(url)) return url
  if (env === USE_CUSTOM_HOST) {
    return combineHostAndPath(mybricksHost.default, url)
  }
  const data = (envList || []).find(item => item.name === env)
  if (!data || !data.value) return url
  return data.value + url
}

const { render: renderUI } = window._mybricks_render_web

const projectJson = '--projectJson--' //replace it
const projectId = '--slot-project-id--' //replace it
const executeEnv = '--executeEnv--' //replace it
const envList = "--envList--" //replace it

function decode(str) {
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
  query = query
    .trim()
    .replace(
      new RegExp(decodeURIComponent('%5E(%5C%3F%7C%23%7C%26)')),
      ''
    )
  if (!query) {
    return res
  }
  query.split('&').forEach((param) => {
    const parts = param
      .replace(new RegExp(decodeURIComponent('%5C%2B'), 'g'), ' ')
      .split('=')
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
  //   const [namespace, version] = key.split('@');

  //   comDefs[`${namespace}-${version}`] =
  //     window['CloudComponentDependentComponents'][key];
  // });
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

function Page({ props }) {
  if (props?.canvasElement) {
    message?.config({
      getContainer() {
        return props?.canvasElement
      },
    })
  }
  return renderUI(projectJson, {
    env: {
      silent: true,
      showErrorNotification: false,
      canvasElement: props?.canvasElement || undefined,
      get vars() {
        // 环境变量
        return {
          get getExecuteEnv() {
            return () => executeEnv
          },
          get getQuery() {
            return () => {
              return parseQuery(location.search)
            }
          },
          get getProps() {
            // 获取主应用参数方法，如：token等参数，取决于主应用传入
            return () => {
              if (!props) return undefined
              return props
            }
          },
          get getCookies() {
            return () => {
              const cookies = document.cookie
                .split('; ')
                .reduce((s, e) => {
                  const p = e.indexOf('=')
                  s[e.slice(0, p)] = e.slice(p + 1)
                  return s
                }, {})

              return cookies
            }
          },
          get getRouter() {
            const isUri = (url) => {
              return /^http[s]?:\/\/([\w\-\.]+)+[\w-]*([\w\-\.\/\?%&=]+)?$/gi.test(
                url
              )
            }
            return () => ({
              reload: () => location.reload(),
              redirect: ({ url }) => location.replace(url),
              back: () => history.back(),
              forward: () => history.forward(),
              pushState: ({ state, title, url }) => {
                if (isUri(url)) {
                  //兼容uri
                  location.href = url
                } else {
                  history.pushState(state, title, url)
                }
              },
              openTab: ({ url, title }) => open(url, title || '_blank'),
            })
          },
        }
      },
      projectId,
      /** 调用领域模型 */
      callDomainModel(domainModel, type, params) {
        return window.pluginConnectorDomain.call(domainModel, params, {
          action: type,
          before(options) {
            if (
              ['domain', 'aggregation-model'].includes(domainModel.type)
            ) {
              let newOptions = { ...options }
              if (projectId) {
                Object.assign(newOptions.data, {
                  projectId: projectId,
                })
              }
              return {
                ...newOptions,
                // url: domainServicePath,
              }
            } else {
              return options
            }
          },
        })
      },
      callConnector(connector, params) {
        const plugin = window[connector.connectorName] || window['@mybricks/plugins/service'];
        //@ts-ignore
        const MYBRICKS_HOST = window?.MYBRICKS_HOST
        //@ts-ignore
        if (executeEnv === USE_CUSTOM_HOST) {
          if (typeof MYBRICKS_HOST === 'undefined') {
            message.error(`没有设置window.MYBRICKS_HOST变量`)
            return
          } else if (!MYBRICKS_HOST.default) {
            message.error(`没有设置window.MYBRICKS_HOST.default`)
            return
          }
        }
        let newParams = params;
        //@ts-ignore
        if (executeEnv === USE_CUSTOM_HOST) {
          if (params instanceof FormData) {
            newParams.append('MYBRICKS_HOST', JSON.stringify(MYBRICKS_HOST));
          } else {
            newParams = { ...params, MYBRICKS_HOST: { ...MYBRICKS_HOST } };
          }
        }
        if (plugin) {
          /** 兼容云组件，云组件会自带 script */
          const curConnector = connector.script
            ? connector
            : (projectJson.plugins[connector.connectorName] || []).find(con => con.id === connector.id);

          return curConnector ? plugin.call({ ...connector, ...curConnector }, newParams, {
            // 只在官方插件上做环境域名处理
            before: connector.connectorName === '@mybricks/plugins/service'
              ? options => {
                return {
                  ...options,
                  url: shapeUrlByEnv(envList, executeEnv, options.url, MYBRICKS_HOST)
                }
              } : undefined
          }) : Promise.reject('找不到对应连接器 Script 执行脚本.');
        } else {
          return Promise.reject('错误的连接器类型.');
        }
      },
      renderCom(json, opts, coms) {
        return renderUI(json, {
          comDefs: { ...getComs(), ...coms },
          // observable: window['rxui'].observable,
          ...(opts || {}),
        })
      },
      get hasPermission() {
        return ({ permission, key }) => {
          if (!projectJson?.hasPermissionFn) {
            return true
          }

          const code = permission?.register?.code || key;

          let result

          try {
            result = runJs(decodeURIComponent(projectJson?.hasPermissionFn), [
              { key: code },
            ])

            if (typeof result !== 'boolean') {
              result = true
              console.warn(
                `权限方法返回值类型应为 Boolean 请检查，[key] ${code}; [返回值] type: ${typeof result}; value: ${JSON.stringify(
                  result
                )}`
              )
            }
          } catch (error) {
            result = true
            console.error(`权限方法出错 [key] ${code}；`, error)
          }

          return result
        }
      },
      // uploadFile: uploadApi,
    },
  })
}

function render(props) {
  const { container } = props;
  const root = (container || document).querySelector('#mybricks-page-root')
  /** publish template style */
  root.style.width = '100%';
  root.style.height = '100%';
  ReactDOM.render(
    React.createElement(
      antd.ConfigProvider,
      {
        locale: antd.locale['zh_CN'].default,
      },
      React.createElement(Page, { props })
    ),
    root
  )
  return Promise.resolve()
}

console.log('app load', !!global.__POWERED_BY_QIANKUN__)

// if (global.__POWERED_BY_QIANKUN__) {
//   global['purehtml'] = {
//     bootstrap: () => {
//       console.log('purehtml bootstrap')
//       return Promise.resolve()
//     },
//     mount: (props) => {
//       console.log('purehtml mount', props)
//       return render(props)
//     },
//     unmount: (props) => {
//       const { container } = props
//       ReactDOM &&
//         ReactDOM.unmountComponentAtNode(
//           (container || document).querySelector('#qiankun-container')
//         )
//       return Promise.resolve()
//     },
//   }
// } else {
//   render({})
// }

if (!window.__POWERED_BY_QIANKUN__) {
  render({});
}

export async function bootstrap() {
  console.log('react app bootstraped');
}

export async function mount(props) {
  console.log('props from main framework', props);
  render(props);
}

export async function unmount(props) {
  const { container } = props
  ReactDOM &&
    ReactDOM.unmountComponentAtNode(
      (container || document).querySelector('#mybricks-page-root')
    )
}