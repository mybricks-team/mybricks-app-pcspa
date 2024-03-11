import {
  getComs,
  getQueryString,
  shapeUrlByEnv,
  parseQuery,
  getRenderWeb,
} from "@/utils";
import { runJs } from "@/utils/runJs";
import { connectorLoader } from "@/utils/connectorLoader";
import { PreviewStorage } from "@/utils/previewStorage";
// import { mock as connectorHttpMock } from '@mybricks/plugin-connector-http'
import connectorHttpMock from '@mybricks/plugin-connector-http/runtime/mock'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain/runtime';
import { proxLocalStorage, proxSessionStorage } from "@/utils/debugMockUtils";
import processKeyboardEvent from '@/utils/keyboardEvent'

const fileId = getQueryString("fileId");
const USE_CUSTOM_HOST = "__USE_CUSTOM_HOST__";
const previewStorage = new PreviewStorage({ fileId });
const {
  dumpJson,
  hasPermissionFn,
  executeEnv,
  appConfig,
  envList,
  MYBRICKS_HOST,
  directConnection,
  i18nLangContent,
  debugMockConfig
} = previewStorage.getPreviewPageData();


proxLocalStorage(debugMockConfig?.localStorageMock)
proxSessionStorage(debugMockConfig?.sessionStorageMock)

const root = ({ renderType, env, ...props }) => {
  const renderUI = getRenderWeb(renderType);
  if (!renderUI) {
    throw Error(`找不到${renderType}渲染器`);
  }
  return renderUI(dumpJson, {
    ref(refs) {
      processKeyboardEvent(dumpJson, refs.inputs);
    },
    env: {
      ...env,
      renderCom(json, opts, coms) {
        return renderUI(json, {
          comDefs: { ...getComs(), ...coms },
          // observable: window['rxui'].observable,
          ...(opts || {}),
          env: {
            ...(opts?.env || {}),
            edit: false,
            runtime: true,
          },
        });
      },
      i18n(title) {
        //多语言
        if (typeof title?.id === 'undefined') return title
        return i18nLangContent[title.id]?.content?.[env.locale] || JSON.stringify(title)
      },
      /** 调用领域模型 */
      callDomainModel(domainModel, type, params) {
        return callDomainHttp(domainModel, params, { action: type } as any);
      },
      async callConnector(connector, params, connectorConfig = {}) {
        await connectorLoader(appConfig);
        const plugin =
          window[connector.connectorName] ||
          window["@mybricks/plugins/service"];
        let newParams = params;
        if (executeEnv === USE_CUSTOM_HOST) {
          if (params instanceof FormData) {
            newParams.append("MYBRICKS_HOST", JSON.stringify(MYBRICKS_HOST));
          } else {
            newParams = { ...params, MYBRICKS_HOST: { ...MYBRICKS_HOST } };
          }
        }
        if (plugin) {
          const curConnector = connector.script
            ? connector
            : (dumpJson.plugins[connector.connectorName] || []).find(
              (con) => con.id === connector.id
            );

          if (curConnector?.globalMock || connectorConfig?.openMock) {
            return connectorHttpMock({ ...connector, ...connectorConfig }, {});
          }

          return curConnector
            ? plugin.call(
              { ...connector, ...curConnector, useProxy: !directConnection },
              newParams,
              {
                ...connectorConfig,
                /** http-sql表示为领域接口 */
                before: connector.type === 'http-sql' ?
                  options => {
                    const newOptions = { ...options }
                    if (!newOptions.headers) {
                      newOptions.headers = {};
                    }
                    newOptions.headers['x-mybricks-debug'] = 'true';

                    return newOptions;
                  }
                  : (options) => {
                    return {
                      ...options,
                      url: shapeUrlByEnv(
                        envList,
                        executeEnv,
                        options.url,
                        MYBRICKS_HOST
                      ),
                    };
                  },
              }
            )
            : Promise.reject("接口不存在，请检查连接器插件中接口配置");
        } else {
          return Promise.reject("错误的连接器类型");
        }
      },
      vars: {
        get locale() {
          return env.locale;
        },
        get getExecuteEnv() {
          return () => executeEnv;
        },
        getQuery: () => parseQuery(location.search),
        get getProps() {
          return () => {
            // 获取主应用参数方法，如：token等参数，取决于主应用传入
            if (!props) return undefined;
            return props;
          };
        },
        get getRouter() {
          const isUri = (url: string) => {
            return /^http[s]?:\/\/([\w\-\.]+)+[\w-]*([\w\-\.\/\?%&=]+)?$/gi.test(
              url
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
              open(url, title || "_blank"),
          });
        },
      },
      get hasPermission() {
        return ({ permission, key }) => {
          if (!hasPermissionFn) {
            return true;
          }

          const code = permission?.register?.code || key;

          let result;

          try {
            result = runJs(decodeURIComponent(hasPermissionFn), [
              { key: code },
            ]);

            if (typeof result !== "boolean") {
              result = true;
              console.warn(
                `权限方法返回值类型应为 Boolean 请检查，[key] ${code}; [返回值] type: ${typeof result}; value: ${JSON.stringify(
                  result
                )}`
              );
            }
          } catch (error) {
            result = true;
            console.error(`权限方法出错 [key] ${code}；`, error);
          }

          return result;
        };
      },
      // uploadFile: uploadApi
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
  });
};

export default root;
