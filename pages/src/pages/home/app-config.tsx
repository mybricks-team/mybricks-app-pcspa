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
import SQLPanel from './plugin/sqlPanel';
import { uploadApi } from '@/utils';
import axios from 'axios';
// import { uploadApi } from '@/utils';

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

const injectUpload = (editConfig: Record<string, any>, uploadService: string) => {
  if (!!editConfig && !editConfig.upload) {
    editConfig.upload = async (files: Array<File>): Promise<Array<string>> => {
      const formData = new FormData();
      formData.append("files", files[0])
      if (!uploadService) {
        message.error('无上传服务，请先配置应用上传服务');
        return;
      }
      const res = await axios<any, { url: string }>({
        url: uploadService,
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      return [res.url]
    };
  }
}

export default function (ctx, save) {
  return {
    shortcuts: {
      'ctrl+s': [save],
    },
    plugins: [
      servicePlugin({}),
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
      toolsPlugin()
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
        injectUpload(editConfig, ctx.uploadService);
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
            title: '路由参数',
            type: 'map',
            description: '调试模式下，路由参数配置',
            value: {
              get() {
                return ctx.debugQuery
              },
              set(context, v) {
                ctx.debugQuery = v
              }
            }
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
                    { script: connector.script, useProxy: true },
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
        },
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
          }
        ]
      }
    }
  }
}
