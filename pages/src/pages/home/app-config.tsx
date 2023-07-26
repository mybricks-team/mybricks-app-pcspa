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

import { render as renderUI } from '@mybricks/render-web';
import comlibLoaderFunc from './configs/comlibLoader'
import { comLibAdderFunc } from './configs/comLibAdder'
import axios from 'axios';

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
        const { status, data: { url }, msg, code } = res.data;
        if (status === 200 || code === 1) {
          const staticUrl = useConfigService ? `${getDomainFromPath(uploadService)}${url}` : url
          return [staticUrl].map(url => url.replace('https', 'http'))
        }
        throw Error(`【图片上传出错】: ${msg}`)
      } catch (error) {
        message.error(error.message)
        return []
      }
    };
  }
}

export default function (ctx, save, remotePlugins = []) {
  const envList = ctx?.appConfig?.publishEnvConfig?.envList || []
  return {
    shortcuts: {
      'ctrl+s': [save],
    },
    plugins: [
      servicePlugin({
        envList,
      }),
      domainServicePlugin({
        addActions: [
          { type: 'aggregation-model', title: '聚合模型' }
        ]
        // openFileSelector() {
        //   return openFilePanel({ allowedFileExtNames: ['domain'], parentId: ctx.sdk.projectId, fileId: ctx.fileId })
        // },
      }),
      versionPlugin({
        user: ctx.user,
        file: ctx.fileItem,
        disabled: ctx.disabled,
        onInit: (versionApi) => {
          ctx.versionApi = versionApi
        },
      }),
      toolsPlugin(),
      ...remotePlugins
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
        cate0.title = `实例项目`
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
            title: '调试',
            items: [
              {
                title: '测试环境',
                type: 'select',
                description: '选择调试时采用的环境配置，发布时的环境不受此控制，你可以在应用配置处修改可选环境（需管理员权限）',
                options: envList.map(item => ({
                  value: item.name,
                  label: item.title
                })),
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
                title: '路由参数',
                type: 'map',
                description: '调试模式下，路由参数模拟配置',
                value: {
                  get() {
                    return ctx.debugQuery
                  },
                  set(context, v) {
                    ctx.debugQuery = v
                  }
                }
              },
              {
                title: '主应用参数',
                type: 'map',
                description: '调试模式下，主应用参数模拟配置',
                value: {
                  get() {
                    return ctx.debugMainProps
                  },
                  set(context, v) {
                    ctx.debugMainProps = v
                  }
                }
              }
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
                if (connector.type === 'http') {
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
          if (connector.type === 'http') {
            //服务接口类型
            return callConnectorHttp(
              { script: connector.script, useProxy: true },
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
          return () => {
            return true
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
          }
        ]
      }
    }
  }
}
