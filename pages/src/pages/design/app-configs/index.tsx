import React, { useEffect, useState } from "react";
import { message, Tooltip, Modal, Descriptions } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import axios from "axios";

import servicePlugin, {
  call as callConnectorHttp,
  mock as connectorHttpMock,
} from "@mybricks/plugin-connector-http";
import domainServicePlugin, {
  call as callDomainHttp,
} from "@mybricks/plugin-connector-domain";
// import { openFilePanel } from "@mybricks/sdk-for-app/ui";
import versionPlugin from "mybricks-plugin-version";
import localePlugin from "@mybricks/plugin-locale";
import notePlugin from "@mybricks/plugin-note";
import { use as useTheme } from "@mybricks/plugin-theme";
import { openFilePanel } from "@mybricks/sdk-for-app/ui";

import comlibLoaderFunc from "../configs/comlibLoader";
import { comLibAdderFunc } from "../configs/comLibAdder";
import CollaborationHttp from "../plugin/collaboration-http";
import { runJs } from "../../../utils/runJs";

import { shapeUrlByEnv } from "../../../utils";
import { EnumMode } from "../components/PublishModal";
import {
  GET_DEFAULT_PAGE_HEADER,
  GET_PAGE_CONFIG_EDITOR,
  USE_CUSTOM_HOST,
} from "../constants";
import { fAxios } from "@/services/http";
import { createFromIconfontCN } from "@ant-design/icons";
import download from "@/utils/download";
import searchUser from "@/utils/searchUser";
import { blobToBase64 } from "@/utils/blobToBase64";
import { getAiEncryptData } from "../utils/get-ai-encrypt-data";

// import { render as renderUI } from '@mybricks/render-web'

import { EnumLocale, getLocaleLang } from "../../setting/App/I18nConfig/utils";

import { compareVersionLatest } from "../utils/saveContent";

const { confirm } = Modal;
import editViewConfig from "./editView";
import { getExecuteEnvByMode } from "@/pages/design/app-configs/utils";

// const getComs = () => {
//   const comDefs = {}
//   const regAry = (comAray) => {
//     comAray.forEach((comDef) => {
//       if (comDef.comAray) {
//         regAry(comDef.comAray)
//       } else {
//         comDefs[`${comDef.namespace}-${comDef.version}`] = comDef
//       }
//     })
//   }

//   const comlibs = [
//     ...(window['__comlibs_edit_'] || []),
//     ...(window['__comlibs_rt_'] || []),
//   ]
//   comlibs.forEach((lib) => {
//     const comAray = lib.comAray
//     if (comAray && Array.isArray(comAray)) {
//       regAry(comAray)
//     }
//   })
//   return comDefs
// }

const CUSTOM_HOST_TITLE = `自定义域名`;
const DOMAIN_APP_NAMESPACE = "mybricks-domain";

const isReact = APP_TYPE === "react";

export default function appConfig(
  ctx,
  appData,
  save,
  designerRef,
  remotePlugins = [],
  fileDBRef,
  setBeforeunload
) {
  const envList = ctx.envList;
  // 获得环境信息映射表
  const envMap = [
    ...envList,
    { name: USE_CUSTOM_HOST, title: CUSTOM_HOST_TITLE },
  ].reduce((res, item) => {
    res[item.name] = item.title;
    return res;
  }, {});

  const domainApp = appData.installedApps.find(
    (app) => app.namespace === DOMAIN_APP_NAMESPACE
  );

  ctx.debugMode =
    ctx.executeEnv === USE_CUSTOM_HOST
      ? EnumMode.CUSTOM
      : envList.length > 0
        ? EnumMode.ENV
        : EnumMode.DEFAULT;

  getExecuteEnvByMode(ctx.debugMode, ctx, envList);

  const adder: Array<{
    type: string;
    title: string;
    inputs?: { id: string; title: string; schema: Record<string, string> }[];
    outputs?: { id: string; title: string; schema: Record<string, string> }[];
    template?: Record<string, any>;
  }> = [
    // {
    //   type: 'normal',
    //   title: '页面',
    //   inputs: [
    //     {
    //       id: 'open',
    //       title: '打开',
    //       schema: {
    //         type: 'any',
    //       },
    //     },
    //   ],
    // },
  ];

  if (isReact) {
    adder.push(
      ...[
        {
          type: "normal",
          title: "页面",
          inputs: [
            {
              id: "open",
              title: "打开",
              schema: {
                type: "any",
              },
            },
          ],
        },
        {
          type: "popup",
          title: "对话框",
          template: {
            namespace: "mybricks.basic-comlib.popup",
            deletable: false,
            asRoot: true,
          },
        },
        {
          type: "popup",
          title: "抽屉",
          template: {
            namespace: "mybricks.basic-comlib.drawer",
            deletable: false,
            asRoot: true,
          },
        },
        {
          type: "popup",
          title: "打印对话框",
          template: {
            namespace: "mybricks.normal-pc.print",
            deletable: false,
            asRoot: true,
          },
        },
        {
          type: "normal",
          title: "静默打印",
          template: {
            namespace: "mybricks.normal-pc.silent-print",
            deletable: false,
            asRoot: true,
          },
          inputs: [
            {
              id: "print",
              title: "打印",
              schema: {
                type: "any",
              },
            },
          ],
          outputs: [
            {
              id: "printed",
              title: "打印完成",
              schema: {
                type: "any",
              },
            },
          ],
        },
      ]
    );
  }

  const getCurrentLocale = () => {
    return getLocaleLang(ctx?.appConfig?.localeConfig);
  };

  const connetorPlugins: any[] = [
    servicePlugin({
      isPrivatization: ctx.setting?.system.config?.isPureIntranet === true,
      // addActions: domainApp
      //   ? [
      //     {
      //       type: 'http-sql',
      //       title: '领域接口',
      //       noUseInnerEdit: true,
      //       getTitle: (item) => {
      //         return item.content?.domainServiceMap
      //           ? item.content.title
      //           : `${item.content.title || ''}(未选择)`
      //       },
      //       render: (props) => {
      //         return (
      //           <CollaborationHttp
      //             {...props}
      //             openFileSelector={() =>
      //               openFilePanel({
      //                 allowedFileExtNames: ['domain'],
      //                 parentId: ctx.sdk.projectId,
      //                 fileId: ctx.fileId,
      //               })
      //             }
      //           />
      //         )
      //       },
      //     },
      //   ]
      //   : void 0,
    }),
  ];
  // if (domainApp) {
  //   connetorPlugins.push(
  //     domainServicePlugin({
  //       openFileSelector() {
  //         return openFilePanel({
  //           allowedFileExtNames: ['domain'],
  //           parentId: ctx.sdk.projectId,
  //           fileId: ctx.fileId,
  //         })
  //       },
  //     })
  //   )
  // }
  return {
    // debugger(json, opts) {
    //   return renderUI(json, opts)
    // },
    shortcuts: {
      "ctrl+s": [save],
    },
    plugins: [
      ...connetorPlugins,
      notePlugin({
        user: ctx.user,
        onUpload: async (file: File) => {
          return new Promise(async (resolve, reject) => {
            const { manateeUserInfo, fileId } = ctx;
            let uploadService = ctx.uploadService;
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folderPath", `/files/${fileId}`);

            const useConfigService = !!uploadService;

            if (!useConfigService) {
              uploadService = "/paas/api/flow/saveFile";
            }

            try {
              const res = await axios<any, any>({
                url: uploadService,
                method: "post",
                data: formData,
                headers: {
                  "Content-Type": "multipart/form-data",
                  ...manateeUserInfo,
                },
              });
              const { data = {} } = res.data;
              const { url } = data;
              if (!url) {
                reject(`没有返回图片地址`);
              }
              const staticUrl = /^http/.test(url)
                ? url
                : `${getDomainFromPath(uploadService)}${url}`;
              resolve({ url: staticUrl });
              reject(`【图片上传出错】: ${message}`);
            } catch (error) {
              message.error(error.message);
              reject(error);
            }
          });
        },
        onAtsEmail: ({ subject, to, body, extra, from }) => {
          let data = { fileId: ctx.fileId, subject, to, body, extra, from };
          const config = appData.config[APP_NAME]?.config;
          const serviceApi = config?.emailApiConfig?.sendAtsEmailApi || "";
          if (serviceApi) {
            axios({
              method: "POST",
              url: serviceApi,
              withCredentials: false,
              data,
              headers: {
                "Content-Type": "application/json",
              },
            }).catch((err) => {
              console.log("err", err);
            });
          }
        },
        onSearchUser: (keyword: string) => {
          return new Promise(async (resolve, reject) => {
            try {
              const res = await searchUser(`api/pcpage/searchUser`, {
                keyword,
              });
              // @ts-ignore
              const formatRes = (res || []).map((item) => {
                const { email, id, name, avatar } = item;
                return {
                  name: name ? `${name}(${email})` : email,
                  id,
                  username: email,
                  orgDisplayName: "",
                  thumbnailAvatarUrl: avatar,
                };
              });
              resolve(formatRes);
            } catch (e) {
              message.error("搜索用户失败!");
              reject("搜索用户失败!");
            }
          });
        },
      }),
      localePlugin({
        defaultPackLink:
          ctx?.appConfig?.localeConfig?.defaultI18nLink ||
          "/mybricks-app-pcspa/public/i18n-example.json",
        onPackLoad: ({ i18nLangContent }) => {
          ctx.i18nLangContent = i18nLangContent;
        },
        onUsedIdChanged: ({ ids }) => {
          ctx.i18nUsedIdList = ids;
        },
      }),
      ...remotePlugins,
      useTheme({ sdk: appData }),
      ...(ctx.isPreview
        ? []
        : [
            versionPlugin({
              user: ctx.user,
              file: appData.fileContent || {},
              disabled: ctx.disabled,
              needSavePreview: true,
              needPublishRevert: true,
              envMap,
              onInit: (versionApi) => {
                ctx.versionApi = versionApi;
              },
              onRevert: async (params: {
                pubAssetFilePath: string;
                nowVersion: string;
                fileId: number;
                type: string;
              }) => {
                const { fileId, nowVersion, pubAssetFilePath, type } = params;
                try {
                  const finish = message.loading("正在回滚...", 0);
                  const res: { code: number; message: string } =
                    await fAxios.post("/api/pcpage/rollback", {
                      filePath: pubAssetFilePath,
                      nowVersion,
                      type,
                      fileId,
                    });
                  finish();

                  if (res.code === 1) {
                    message.success(res.message);
                  } else {
                    message.error("回滚失败！");
                  }
                } catch (e) {
                  message.error("回滚失败！");
                }
              },
              modalActiveExtends: [
                {
                  type: "publish",
                  title: (
                    <Tooltip
                      color="white"
                      title={
                        <a
                          target="_blank"
                          href="https://docs.mybricks.world/docs/publish-integration/kjkj/"
                        >
                          使用说明
                        </a>
                      }
                    >
                      下载
                    </Tooltip>
                  ),
                  onClick({ fileId, type: envType, version }) {
                    const loadend = message.loading(
                      `版本 ${version} 下载中...`,
                      0
                    );
                    download(
                      `api/pcpage/download-product/${fileId}/${envType}/${version}`
                    ).finally(() => {
                      loadend();
                    });
                  },
                },
              ],
            }),
          ]),
    ],
    ...(ctx.hasMaterialApp
      ? {
          comLibAdder: comLibAdderFunc(ctx),
        }
      : {}),
    comLibLoader: comlibLoaderFunc(ctx),
    pageContentLoader() {
      //加载页面内容
      return new Promise(async (resolve, reject) => {
        const content = appData.fileContent?.content || {};
        let curContent = { ...content };

        const list = await fileDBRef.current.get(appData.fileId);

        // todo 冗余代码
        if (list.length > 0) {
          const item = list[0];
          if (
            compareVersionLatest(item.version, appData.fileContent.version) ===
            1
          ) {
            confirm({
              title: "存在未保存的内容，是否恢复？",
              icon: <ExclamationCircleOutlined />,
              okText: "确认",
              cancelText: "取消",
              content: `内容暂存时间：${moment.unix(item.createTime / 1000).format("YYYY-MM-DD HH:mm:ss")}`,
              onOk() {
                curContent = { ...item.data };
                setBeforeunload(true);
                delete curContent.comlibs;

                resolve(curContent);
              },
              onCancel() {
                delete curContent.comlibs;

                resolve(curContent);
              },
            });
          } else {
            delete curContent.comlibs;

            resolve(curContent);
          }
        } else {
          delete curContent.comlibs;

          resolve(curContent);
        }

        // 避免修改原始数据
        // const curContent = { ...content }
      });
    },
    toplView: {
      title: "交互",
      cards: {
        main: {
          title: "页面",
          inputs: [
            {
              id: "open",
              title: "打开",
              schema: {
                type: "any",
              },
            },
          ],
        },
      },
      globalIO: {
        startWithSingleton: true,
      },
      vars: {},
      fx: {},
      useStrict: false,
    },
    aiView: getAiView(ctx?.appConfig?.publishLocalizeConfig?.enableAI),
    editView: editViewConfig({ ctx, envList }),
    com: {
      env: {
        // renderCom(json, opts, coms) {
        //   return renderUI(
        //     json,
        //     {
        //       comDefs: { ...getComs(), ...coms },
        //       observable: window["mybricks"].createObservable,
        //       ...(opts || {}),
        //       env: {
        //         ...(opts?.env || {}),
        //         edit: false,
        //         runtime: true
        //       }
        //     }
        //   )
        // },
        i18n(title) {
          if (typeof title === "string") return title;
          const i18nLangContent = ctx.i18nLangContent || {};
          // 搭建页面使用中文
          return (
            i18nLangContent[title?.id]?.content?.[getCurrentLocale()] ||
            i18nLangContent[title?.id]?.content?.["zh-CN"] ||
            JSON.stringify(title)
          );
        },
        /** 调用领域模型 */
        // callDomainModel(domainModel, type, params) {
        //   return callDomainHttp(domainModel, params, {action: type} as any)
        // },
        callConnector(connector, params, connectorConfig: any = {}) {
          const plugin = designerRef.current?.getPlugin(
            connector.connectorName
          );

          if (
            ctx.executeEnv === USE_CUSTOM_HOST &&
            !ctx.MYBRICKS_HOST.default
          ) {
            throw new Error(`自定义域名必须设置default域名`);
          }

          let newParams = params;

          if (ctx.executeEnv === USE_CUSTOM_HOST) {
            if (params instanceof FormData) {
              newParams.append(
                "MYBRICKS_HOST",
                JSON.stringify(ctx.MYBRICKS_HOST)
              );
            } else if (Array.isArray(newParams)) {
              newParams["MYBRICKS_HOST"] = { ...ctx.MYBRICKS_HOST };
            } else if (typeof newParams === "object") {
              newParams = {
                ...params,
                MYBRICKS_HOST: { ...ctx.MYBRICKS_HOST },
              };
            }
          }

          if (!plugin) {
            /** 启动 Mock */
            if (connectorConfig?.openMock) {
              return connectorHttpMock({ ...connector, ...connectorConfig });
            }

            //服务接口类型
            return callConnectorHttp(
              {
                ...connector,
                script: connector.script,
                useProxy: !ctx.directConnection,
              },
              newParams,
              {
                ...connectorConfig,
                before: (options) => {
                  return {
                    ...options,
                    url: shapeUrlByEnv(
                      envList,
                      ctx.executeEnv,
                      options.url,
                      ctx.MYBRICKS_HOST
                    ),
                  };
                },
              }
            );
          } else {
            return plugin.callConnector(
              { ...connector, useProxy: !ctx.directConnection },
              newParams,
              {
                ...connectorConfig,
                before: (options) => {
                  return {
                    ...options,
                    url: shapeUrlByEnv(
                      envList,
                      ctx.executeEnv,
                      options.url,
                      ctx.MYBRICKS_HOST
                    ),
                  };
                },
              }
            );
          }
        },
        vars: {
          get getExecuteEnv() {
            return () => ctx.executeEnv;
          },
          get getI18nContent() {
            return () => {
              return ctx.i18nLangContent || {};
            };
          },
          get locale() {
            return getCurrentLocale();
          },
          getQuery: () => ({ ...(ctx.debugQuery || {}) }),
          getProps: () => ({ ...(ctx.debugMainProps || {}) }),
          get getRouter() {
            const toast = (info: string) => {
              message.info(info);
            };
            return () => ({
              reload: () => toast("reload"),
              redirect: ({ url }: { url: string }) => toast(`redirect: ${url}`),
              back: () => toast("back"),
              forward: () => toast("forward"),
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
              return {};
            };
          },
          get customMethods() {
            return {
              options: ctx?.appConfig?.component?.customMethodOptions || [],
            };
          },
        },
        get uploadFile() {
          return async (files) => {
            if (!ctx.runtimeUploadService) {
              message.warn("请先配置运行时上传接口");
              return;
            }
            // 创建FormData对象
            const formData = new FormData();

            // 添加文件到FormData对象
            for (const file of files) {
              formData.append("file", file);
            }

            try {
              // 发送POST请求
              const response = await fetch(ctx.runtimeUploadService, {
                method: "POST",
                body: formData,
              }).then((res) => {
                if (res.status !== 200 && res.status !== 201) {
                  throw new Error(`上传失败！`);
                }
                return res.json();
              });
              console.log(`res,`, response);
              return {
                url: response?.data?.url,
                name: files[0].name,
              };
            } catch (error) {
              message.error(`上传失败，请检查上传接口设置！`);
              // 错误处理
              console.error("文件上传失败", error);
              return {};
            }
          };
        },
        get hasPermission() {
          return ({ permission, key }) => {
            const hasPermissionFn = ctx?.hasPermissionFn;

            if (!ctx.debugHasPermissionFn) {
              return true;
            }

            if (!hasPermissionFn) {
              return true;
            }

            // 编辑权限配置为”无“时，不需要进行权限校验
            if (permission?.type === "none") {
              return true;
            }

            const code = permission?.register?.code || key;

            // 如果没有权限编码，不需要校验
            if (code === undefined) {
              return true;
            }

            let result: boolean | { permission: boolean };

            try {
              result = runJs(decodeURIComponent(hasPermissionFn), [
                { key: code },
              ]);

              if (
                typeof result !== "boolean" &&
                typeof result?.permission !== "boolean"
              ) {
                result = true;
                designerRef.current?.console?.log.error(
                  "权限方法",
                  `权限方法返回值类型应为 Boolean 或者 { permission: Boolean } 请检查，[Key] ${code};[返回值] Type: ${typeof result}; Value: ${JSON.stringify(result)}`
                );
                console.error(
                  `权限方法返回值类型应为 Boolean 或者 { permission: Boolean } 请检查，[Key] ${code};[返回值] Type: ${typeof result}; Value: ${JSON.stringify(result)}`
                );
              }
            } catch (error) {
              result = true;
              designerRef.current?.console?.log.error(
                "权限方法",
                `${error.message}`
              );
              console.error(`权限方法出错[Key] ${code};`, error);
            }

            return result;
          };
        },
      },
      events: [
        //配置事件
        {
          type: "jump",
          title: "跳转到",
          exe({ options }) {
            const page = options.page;
            if (page) {
              window.location.href = page;
            }
          },
          options: [
            {
              id: "page",
              title: "页面",
              editor: "textarea",
            },
          ],
        },
      ],
    },
    geoView: {
      scenes: {
        adder,
      },
      theme: {
        css: [
          "public/antd/antd@4.21.6.variable.min.css",
          ///...(!isReact ? ['./public/elementUI/element@2.15.14.css'] : []),
        ],
      },
      layout: window._disableSmartLayout ? "flex-column" : "smart",
    },
  };
}

const getAiView = (enableAI) => {
  if (enableAI) {
    return {
      async request(messages) {
        let content = "处理失败";
        try {
          let res = await axios({
            method: "POST",
            url: "//ai.mybricks.world/chat",
            withCredentials: false,
            data: getAiEncryptData({
              messages,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          }).then((res) => res.data);

          content = res.choices[0].message.content;
          return content;
        } catch (e) {
          console.error(e);
        } finally {
          //     console.log(`prompts: ${prompts},
          // question: ${question},
          // 返回结果: ${content}`)
        }
      },
      async requestAsStream(messages, { write, complete, error }) {
        try {
          const response = await fetch("//ai.mybricks.world/stream", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              getAiEncryptData({
                messages,
              })
            ),
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            write(chunk);
          }

          complete();
        } catch (ex) {
          error(ex);
        }
      },
    };
  }

  return void 0;
};
