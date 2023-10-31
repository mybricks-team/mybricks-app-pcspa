import React from 'react';
import { message } from 'antd';
import servicePlugin, {
  call as callConnectorHttp,
  mock as connectorHttpMock,
} from '@mybricks/plugin-connector-http'
import domainServicePlugin, { call as callDomainHttp } from '@mybricks/plugin-connector-domain'
// import { openFilePanel } from "@mybricks/sdk-for-app/ui";
import versionPlugin from 'mybricks-plugin-version'
import { use as useTheme } from '@mybricks/plugin-theme';

import { render as renderUI } from '@mybricks/render-web';
import comlibLoaderFunc from './configs/comlibLoader'
import { comLibAdderFunc } from './configs/comLibAdder'
import { runJs } from '../../utils/runJs'

import axios from 'axios';
import { shapeUrlByEnv } from '../../utils';
import { EnumMode } from './components/PublishModal';
import { USE_CUSTOM_HOST } from './constants';
import { fAxios } from '@/services/http';

const defaultPermissionComments = `/**
*
* interface Props {
*   key: string // 权限key
* }
*
* @param {object} props: Props
* @return {boolean}
*/
`

const defaultPermissionFn = `export default function ({ key }) {
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

const injectUpload = (editConfig: Record<string, any>, uploadService: string, manateeUserInfo: { token: string, session: string }, fileId: string) => {

  if (!!editConfig && !editConfig.upload) {
    editConfig.upload = async (files: Array<File>): Promise<Array<string>> => {
      const formData = new FormData();
      formData.append("file", files[0])
      formData.append('folderPath', `/files/${fileId}`)

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

const CUSTOM_HOST_TITLE = `自定义域名`

const isReact = APP_TYPE === 'react';

const getExecuteEnvByMode = (debugMode, ctx, envList) => {
  if (debugMode === EnumMode.DEFAULT) {
    ctx.executeEnv = ''
  } else if (debugMode === EnumMode.ENV && (!ctx.executeEnv || !envList.find(item => item.name === ctx.executeEnv))) {
    ctx.executeEnv = envList[0].name
  } else if (debugMode === EnumMode.CUSTOM) {
    ctx.executeEnv = USE_CUSTOM_HOST
  }
}

export default function (ctx, appData, save, designerRef, remotePlugins = []) {
  const envList = ctx.envList
  // 获得环境信息映射表
  const envMap = ([...envList, { name: USE_CUSTOM_HOST, title: CUSTOM_HOST_TITLE }]).reduce((res, item) => {
    res[item.name] = item.title
    return res
  }, {})


  ctx.debugMode = ctx.executeEnv === USE_CUSTOM_HOST
    ? EnumMode.CUSTOM
    : envList.length > 0
      ? EnumMode.ENV
      : EnumMode.DEFAULT


  getExecuteEnvByMode(ctx.debugMode, ctx, envList)

  const debugModeOptions = envList.length > 0
    ? [
      { label: '选择环境', value: EnumMode.ENV },
      { label: '自定义域名', value: EnumMode.CUSTOM }
    ]
    : [
      { label: '默认', value: EnumMode.DEFAULT },
      { label: '自定义域名', value: EnumMode.CUSTOM }
    ]

  return {
    shortcuts: {
      'ctrl+s': [save],
    },
    plugins: [
      servicePlugin(),
      ...remotePlugins,
      useTheme({ sdk: appData }),
      versionPlugin({
        user: ctx.user,
        file: appData.fileContent || {},
        disabled: ctx.disabled,
        needSavePreview: true,
        needPublishRevert: true,
        envMap,
        onInit: (versionApi) => {
          ctx.versionApi = versionApi
        },
        onRevert: async (params: { pubAssetFilePath: string, nowVersion: string, fileId:number, type:string }) => {
          const { fileId, nowVersion, pubAssetFilePath, type } = params;
          try {
            const finish = message.loading('正在回滚...', 0);
            const res: { code: number, message: string } = await fAxios.post('/api/pcpage/rollback', { filePath: pubAssetFilePath, nowVersion, type, fileId });
            finish();

            if(res.code === 1) {
              message.success(res.message);
            } else {
              message.error("回滚失败！");
            }
          } catch(e) {
            message.error("回滚失败！");
          }
        }
      }),
    ],
    ...(ctx.hasMaterialApp ? {
      comLibAdder: comLibAdderFunc(ctx),
    } : {}),
    comLibLoader: comlibLoaderFunc(ctx),
    pageContentLoader() {
      //加载页面内容
      return new Promise((resolve, reject) => {
        const content = appData.fileContent?.content || {}

        // 避免修改原始数据
        const _content = { ...content }
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
        injectUpload(editConfig, ctx.uploadService, ctx.manateeUserInfo, ctx.fileId);

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
                return ctx.fileName
              },
              set: (context, v: any) => {
                if(v !== ctx.fileName) {
                  ctx.fileName = v
                }
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
                    return decodeURIComponent(ctx?.hasPermissionFn || encodeURIComponent(defaultPermissionFn))
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
                title: '调试模式',
                type: 'Radio',
                description: '选择配置接口前缀域名的方式',
                options: debugModeOptions,
                value: {
                  get() {
                    return ctx.debugMode
                  },
                  set(_, value) {
                    ctx.debugMode = value
                    getExecuteEnvByMode(value, ctx, envList)
                  }
                }
              },
              {
                title: '调试环境',
                type: 'select',
                description: '所选环境对应的域名将拼接到接口地址前，发布时的环境不受此控制，你可以在应用配置处修改可选环境（需管理员权限）',
                ifVisible({ data }) {
                  return ctx.debugMode === EnumMode.ENV;
                },
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
                title: '自定义域名',
                description: '自定义各个接口的域名，在接口中以{MYBRICKS_HOST.变量}的形式进行引用，发布后的页面需要主动在window.MYBRICKS_HOST对象上设置域名信息',
                type: 'map',
                ifVisible(info) {
                  return ctx.debugMode === EnumMode.CUSTOM
                },
                options: {
                  allowEmptyString: false
                },
                value: {
                  get(info) {
                    if (!ctx.MYBRICKS_HOST) {
                      ctx.MYBRICKS_HOST = {}
                    } else if (!("default" in ctx.MYBRICKS_HOST)) {
                      ctx.MYBRICKS_HOST.default = 'https://your-domain-name.com'
                    }
                    return ctx.MYBRICKS_HOST
                  },
                  set(info, value) {
                    if (typeof value?.default === 'undefined') {
                      message.error('必须包含变量名为default的域名')
                    } else if (!value?.default) {
                      message.error('default域名不能为空')
                    } else if (Object.values(value).some(item => !item)) {
                      message.error('域名不能为空')
                    } else {
                      ctx.MYBRICKS_HOST = value
                    }
                  }
                },
              },
              {
                title: '环境信息设置',
                description: '可以在应用配置处修改使用的环境',
                ifVisible({ data }) {
                  return ctx.debugMode === EnumMode.ENV;
                },
                type: 'array',
                options: {
                  getTitle: (item) => {
                    return item.title
                  },
                  items: [{
                    title: '环境标识(禁止修改)',
                    type: 'text',
                    value: 'name',
                    options: {
                      readonly: true
                    }
                  }, {
                    title: '域名',
                    type: 'text',
                    value: 'value'
                  }],
                  addable: false,
                  deletable: false,
                  draggable: false
                },
                value: {
                  get({ data, focusArea }) {
                    return envList
                  },
                  set({ data, focusArea, output, input, ...res }, value) {
                    ctx.envList = value
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
      editorOptions: {
        expression: {
          CDN: {
            codemirror: '/mfs/editor_assets/codemirror/codemirror_1.0.13_index.min.js'
          }
        },
        richtext: {
          CDN: {
            tinymce: '/mfs/editor_assets/richText/tinymce/5.7.1/tinymce.min.js',
            language: '/mfs/editor_assets/richText/tinymce/5.7.1/zh_CN.js',
          }
        },
        align: {
          CDN: {
            left: '/mfs/editor_assets/align/left.defc4a63ebe8ea7d.svg',
            rowCenter: '/mfs/editor_assets/align/center.c284343a9ff9672a.svg',
            right: '/mfs/editor_assets/align/right.a7763b38b84b5894.svg',
            top: '/mfs/editor_assets/align/top.98906024d52b69de.svg',
            columnCenter: '/mfs/editor_assets/align/center.100376f4ade480cd.svg',
            bottom: '/mfs/editor_assets/align/bottom.6ee532067ed440ca.svg',
            column: '/mfs/editor_assets/align/column-space-between.31d560c0e611198f.svg',
            row: '/mfs/editor_assets/align/row-space-between.ead5cd660c0f1c33.svg',
          }
        },
        array: {
          CDN: {
            sortableHoc: '/mfs/editor_assets/react-sortable/react-sortable-hoc-2.0.0_index.umd.min.js'
          }
        },
        expcode: {
          CDN: {
            prettier: {
              standalone: '/mfs/editor_assets/prettier/2.6.2/standalone.js',
              babel: '/mfs/editor_assets/prettier/2.6.2/parser-babel.js'
            },
            eslint: '/mfs/editor_assets/eslint/8.15.0/eslint.js',
            paths: {
              vs: "/mfs/editor_assets/monaco-editor/0.33.0/min/vs",
            },
            monacoLoader: '/mfs/editor_assets/monaco-editor/0.33.0/min/vs/loader.min.js'
          }
        },
        csseditor: {
          CDN: {
            prettier: {
              standalone: '/mfs/editor_assets/prettier/2.6.2/standalone.js',
              babel: '/mfs/editor_assets/prettier/2.6.2/parser-babel.js'
            },
            eslint: '/mfs/editor_assets/eslint/8.15.0/eslint.js',
            paths: {
              vs: "/mfs/editor_assets/monaco-editor/0.33.0/min/vs",
            },
            monacoLoader: '/mfs/editor_assets/monaco-editor/0.33.0/min/vs/loader.min.js'
          }
        },
        stylenew: {
          CDN: {
            prettier: {
              standalone: '/mfs/editor_assets/prettier/2.6.2/standalone.js',
              babel: '/mfs/editor_assets/prettier/2.6.2/parser-babel.js'
            },
            eslint: '/mfs/editor_assets/eslint/8.15.0/eslint.js',
            paths: {
              vs: "/mfs/editor_assets/monaco-editor/0.33.0/min/vs",
            },
            monacoLoader: '/mfs/editor_assets/monaco-editor/0.33.0/min/vs/loader.min.js'
          }
        },
        code: {
          CDN: {
            prettier: {
              standalone: '/mfs/editor_assets/prettier/2.6.2/standalone.js',
              babel: '/mfs/editor_assets/prettier/2.6.2/parser-babel.js'
            },
            eslint: '/mfs/editor_assets/eslint/8.15.0/eslint.js',
            paths: {
              vs: "/mfs/editor_assets/monaco-editor/0.33.0/min/vs",
            },
            monacoLoader: '/mfs/editor_assets/monaco-editor/0.33.0/min/vs/loader.min.js'
          }
        }
      }
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
        callConnector(connector, params, connectorConfig = {}) {
          const plugin = designerRef.current?.getPlugin(connector.connectorName);
          if (ctx.executeEnv === USE_CUSTOM_HOST && !ctx.MYBRICKS_HOST.default) {
            throw new Error(`自定义域名必须设置default域名`)
          }
          let newParams = params;
          if (ctx.executeEnv === USE_CUSTOM_HOST) {
            if (params instanceof FormData) {
              newParams.append('MYBRICKS_HOST', JSON.stringify(ctx.MYBRICKS_HOST));
            } else {
              newParams = { ...params, MYBRICKS_HOST: { ...ctx.MYBRICKS_HOST } };
            }
          }
          if (!plugin) {
            /** 启动 Mock */
            if (connectorConfig?.openMock) {
              return connectorHttpMock({ ...connector, outputSchema: connectorConfig.mockSchema });
            }

            //服务接口类型
            return callConnectorHttp(
              { ...connector, script: connector.script, useProxy: true },
              newParams,
              {
                before: options => {
                  return {
                    ...options,
                    url: shapeUrlByEnv(envList, ctx.executeEnv, options.url, ctx.MYBRICKS_HOST)
                  }
                }
              }
            );
          } else {
            return plugin.callConnector({ ...connector }, newParams, {
              ...connectorConfig,
              before: options => {
                return {
                  ...options,
                  url: shapeUrlByEnv(envList, ctx.executeEnv, options.url, ctx.MYBRICKS_HOST)
                }
              }
            });
          }
        },
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
          return ({ permission, key }) => {
            const hasPermissionFn = ctx?.hasPermissionFn;

            if (!ctx.debugHasPermissionFn) {
              return true
            }

            if (!hasPermissionFn) {
              return true;
            }

            // 编辑权限配置为”无“时，不需要进行权限校验
            if (permission?.type === 'none') {
              return true;
            }

            const code = permission?.register?.code || key;

            // 如果没有权限编码，不需要校验
            if (code === undefined) {
              return true;
            }

            let result: boolean;

            try {
              result = runJs(decodeURIComponent(hasPermissionFn), [
                { key: code },
              ]);

              if (typeof result !== 'boolean') {
                result = true;
                designerRef.current?.console?.log.error(
                  '权限方法',
                  `权限方法返回值类型应为 Boolean 请检查，[Key] ${code}; [返回值] Type: ${typeof result}; Value: ${JSON.stringify(
                    result,
                  )}`,
                );

                console.error(
                  `权限方法返回值类型应为 Boolean 请检查，[Key] ${code}; [返回值] Type: ${typeof result}; Value: ${JSON.stringify(
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
              console.error(`权限方法出错 [Key] ${code}；`, error);
            }

            return result;
          };
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
      scenes: isReact ? {
        adder: [
          {
            type: 'normal',
            title: '页面',
          },
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
      } : {},
      theme: {
        css: [
          'public/antd/antd@4.21.6.min.css',
          ...(
            !isReact ? ['./public/elementUI/element@2.15.14.css'] : []
          )
        ],
      },
    }
  }
}
