import React from 'react';
import { message } from 'antd';
import servicePlugin, {
  call as callConnectorHttp,
  mock as connectorHttpMock,
} from '@mybricks/plugin-connector-http'
import domainServicePlugin, { call as callDomainHttp } from '@mybricks/plugin-connector-domain'
// import { openFilePanel } from "@mybricks/sdk-for-app/ui";
import versionPlugin from 'mybricks-plugin-version'
import toolsPlugin from "@mybricks/plugin-tools";
import { use as useTheme } from '@mybricks/plugin-theme';

import { render as renderUI } from '@mybricks/render-web';
import comlibLoaderFunc from './configs/comlibLoader'
import { comLibAdderFunc } from './configs/comLibAdder'
import { runJs } from '../../utils/runJs'

import axios from 'axios';

const defaultPermissionComments = `/**
*
* interface Props {
*   key: string // 权限key
*   type: string; // 权限类型
*   register?: { // 权限注册信息
*       code: string; // 选项编码
*       title: string; // 权限标题
*   }; 
* }
*
* @param {object} props: Props
* @return {boolean}
*/
`

const defaultPermissionFn = `export default function ({ key, type, register }) {
  return true
}
`

const getComs = () => {
  const comDefs = {};
  const regAry = (comAray) => {
    comAray.forEach((comDef) => {
      if (comDef.comAray) {
        regAry(comDef.comAray);
      } else {
        comDefs[`${comDef.namespace}-${comDef.version}`] = comDef;
      }
    });
  };

  const comlibs = [
    ...(window['__comlibs_edit_'] || []),
    ...(window['__comlibs_rt_'] || []),
  ];
  comlibs.forEach((lib) => {
    const comAray = lib.comAray;
    if (comAray && Array.isArray(comAray)) {
      regAry(comAray);
    }
  });
  return comDefs;
};

const getDomainFromPath = (path: string) => {
  if (!path) return path;
  if (path.startsWith('http') || path.startsWith('https')) {
    const [protocol, url] = path.split('//');
    const domain = url.split('/')[0]
    return `${protocol}//${domain}`
  } else {
    return location.origin;
  }
}

const injectUpload = (editConfig: Record<string, any>, uploadService: string, manateeUserInfo: { token: string, session: string }) => {
  if (!!editConfig && !editConfig.upload) {
    editConfig.upload = async (files: Array<File>): Promise<Array<string>> => {
      const formData = new FormData();
      formData.append("file", files[0])
      formData.append('folderPath', `/files/${Date.now()}`)
      const useConfigService = !!uploadService;
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
            ...manateeUserInfo
          }
        });
        const { status, data, message, code } = res.data;
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
          const staticUrl = /^http/.test(url) ? url : `${getDomainFromPath(uploadService)}${url}`
          return [staticUrl].map(url => url.replace('https', 'http'))
        }
        throw Error(`【图片上传出错】: ${message}`)
      } catch (error) {
        message.error(error.message)
        return []
      }
    };
  }
}

/**
 * FIXME: 似乎编辑态和 DEBUG 态用的是用一个 app-config，这导致 hasPermission 永远只能取到编辑态闭包中的数据
 * 提升变量作用域，绕过闭包问题，让 app-config 内的函数可以取到最新的数据
 */
const memory  = { permissionID2Info: {} }

export default function (ctx, save, designerRef, remotePlugins = []) {

  const curToJSON = designerRef?.current?.toJSON();

  memory.permissionID2Info = (curToJSON?.permissions || []).reduce((pre, info) => {
    pre[info.id] = info
    return pre;
  }, {})

  const envList = ctx?.appConfig?.publishEnvConfig?.envList || []
  // 获得环境信息映射表
  const envMap = envList.reduce((res, item) => {
    res[item.name] = item.title
    return res
  }, {})

  return {
    shortcuts: {
      'ctrl+s': [save],
    },
    plugins: [
      servicePlugin({
        envList,
      }),
      ...remotePlugins,
      useTheme({ sdk: ctx.sdk }),
      // domainServicePlugin({
      //   addActions: [
      //     { type: 'aggregation-model', title: '聚合模型' }
      //   ]
      //   // openFileSelector() {
      //   //   return openFilePanel({ allowedFileExtNames: ['domain'], parentId: ctx.sdk.projectId, fileId: ctx.fileId })
      //   // },
      // }),
      versionPlugin({
        user: ctx.user,
        file: ctx.fileItem,
        disabled: ctx.disabled,
        envMap,
        onInit: (versionApi) => {
          ctx.versionApi = versionApi
        },
      }),
      toolsPlugin(),
    ],
    ...(ctx.hasMaterialApp ? {
      comLibAdder: comLibAdderFunc(ctx),
    } : {}),
    comLibLoader: comlibLoaderFunc(ctx),
    pageContentLoader() {
      //加载页面内容
      return new Promise((resolve, reject) => {
        const content = ctx.fileItem?.content || {}

        const _content = JSON.parse(JSON.stringify(content))
        delete _content.comlibs

        resolve(_content)
      })
    },
    toplView: {
      title: '交互',
      cards: {
        main: {
          title: '页面'
        }
      },
      globalIO: {
        startWithSingleton: true
      },
      vars: {},
      fx: {},
      useStrict: false
    },
    editView: {
      editorAppender(editConfig) {
        injectUpload(editConfig, ctx.uploadService, ctx.manateeUserInfo);
        return;
      },
      items({ }, cate0, cate1, cate2) {
        cate0.title = `项目`
        cate0.items = [
          {
            title: '名称',
            type: 'Text',
            //options: {readOnly: true},
            value: {
              get: (context) => {
                return ctx.fileItem.name
              },
              set: (context, v: any) => {
                ctx.setName(v)
              },
            },
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
                  displayType: 'button'
                },
                value: {
                  get() {
                    return decodeURIComponent(ctx?.hasPermissionFn || defaultPermissionFn)
                  },
                  set(context, v: string) {
                    ctx.hasPermissionFn = encodeURIComponent(v)
                  }
                }
              }
            ]
          },
          {
            title: '调试',
            items: [
              {
                title: '调试环境',
                type: 'select',
                ifVisible({ data }) {
                  return envList?.length > 0;
                },
                description: '选择调试时采用的环境配置，发布时的环境不受此控制，你可以在应用配置处修改可选环境（需管理员权限）',
                options: {
                  options: envList.map(item => ({
                    value: item.name,
                    label: item.title
                  })),
                  placeholder: '请选择调试环境'
                },
                value: {
                  get() {
                    return ctx.executeEnv || ''
                  },
                  set(context, v) {
                    ctx.executeEnv = v
                  }
                }
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
                  }
                }
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
                    enabled: false
                  },
                  displayType: 'button'
                },
                value: {
                  get() {
                    return ctx.debugQuery ? JSON.stringify(ctx.debugQuery, null, 2) : '{}'
                  },
                  set(context: any, v: string) {
                    const jsonString = decodeURIComponent(v);
                    try {
                      const jsonData = JSON.parse(jsonString);
                      ctx.debugQuery = jsonData
                    } catch {
                      console.error('路由参数数据格式错误');
                    }
                  }
                }
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
                    enabled: false
                  },
                  displayType: 'button'
                },
                value: {
                  get() {
                    return ctx.debugMainProps ? JSON.stringify(ctx.debugMainProps, null, 2) : '{}'
                  },
                  set(context: any, v: string) {
                    const jsonString = decodeURIComponent(v);
                    try {
                      const jsonData = JSON.parse(jsonString);
                      ctx.debugMainProps = jsonData
                    } catch {
                      console.error('主应用参数数据格式错误');
                    }
                  }
                }
              },
            ]
          }

        ]
      },
    },
    com: {
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
                    { script: connector.script, useProxy: true, executeEnv: ctx.executeEnv },
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
        callConnector(connector, params, connectorConfig) {
          /** 启动 Mock */
          if (connectorConfig?.openMock) {
            return connectorHttpMock({ ...connector, outputSchema: connectorConfig.mockSchema });
          }
          //调用连接器
          if (connector.type === 'http' || connector.type === 'http-manatee') {
            //服务接口类型
            return callConnectorHttp(
              { script: connector.script, useProxy: true, executeEnv: ctx.executeEnv },
              params
            )
          } else {
            return Promise.reject('错误的连接器类型.')
          }
        },
        // uploadFile(files) {
        //   return uploadApi(files)
        // },
        vars: {
          get getExecuteEnv() {
            return () => ctx.executeEnv
          },
          getQuery: () => ({ ...(ctx.debugQuery || {}) }),
          getProps: () => ({ ...(ctx.debugMainProps || {}) }),
          get getRouter() {
            const toast = (info: string) => {
              message.info(info);
            };
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
                state: any;
                title: string;
                url: string;
              }) =>
                toast(`pushState: ${JSON.stringify({ state, title, url })}`),
              openTab: ({ url, title }: { url: string; title: string }) =>
                toast(`open a new tab: ${JSON.stringify({ url, title })}`),
            });
          },
          get getCookies() {
            return () => {
              return {}
            }
          }
        },
        get hasPermission() {

          return ({ key }) => {
            const hasPermissionFn = ctx?.hasPermissionFn;

            if (!ctx.debugHasPermissionFn) {
              return true
            }

            if (!hasPermissionFn) {
              return true;
            }

            let result: boolean;

            try {
              const info = memory.permissionID2Info[key];
              result = runJs(decodeURIComponent(hasPermissionFn), [
                { key, type:info.type, register:{ code:info.register.code, title:info.register.title } },
              ]);

              if (typeof result !== 'boolean') {
                result = true;
                designerRef.current?.console?.log.error(
                  '权限方法',
                  `权限方法返回值类型应为 Boolean 请检查，[Key] ${key}; [返回值] Type: ${typeof result}; Value: ${JSON.stringify(
                    result,
                  )}`,
                );

                console.error(
                  `权限方法返回值类型应为 Boolean 请检查，[Key] ${key}; [返回值] Type: ${typeof result}; Value: ${JSON.stringify(
                    result,
                  )}`,
                );
              }
            } catch (error) {
              result = true;
              designerRef.current?.console?.log.error(
                '权限方法',
                `${error.message}`,
              );
              // ctx.console?.log.error('权限方法', `${error.message}`)
              console.error(`权限方法出错 [Key] ${key}；`, error);
            }

            return result;
          };
        },
        get getPermissionInfo() {
          return ({ id }: { id:string })=>{
            return memory.permissionID2Info[id];
          }
        }
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
        adder: [
          {
            type: 'popup',
            title: '对话框',
            template: {
              namespace: 'mybricks.basic-comlib.popup',
              deletable: false,
              asRoot: true
            },
          },
          {
            type: 'popup',
            title: '抽屉',
            template: {
              namespace: 'mybricks.basic-comlib.drawer',
              deletable: false,
              asRoot: true
            }
          },
          {
            type: 'popup',
            title: '打印对话框',
            template: {
              namespace: 'mybricks.normal-pc.print',
              deletable: false,
              asRoot: true
            }
          }
        ]
      },
      theme:{
        css:[
          'https://f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/antd.variable.min.css'
        ],
      },
    }
  }
}
