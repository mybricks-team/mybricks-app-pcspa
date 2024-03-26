import type { SetStateAction } from "react";
import { getComponentDefinition, ComponentDefinitionMap } from "./components";

interface ComponentProps {
  data: object;
  style?: object;
  slots?: object;
  inputs: {
    [key: string | symbol]: (value: unknown, outputs?: unknown) => void;
  };
  outputs: {
    [key: string | symbol]: (value?: unknown) => void;
  };
  [key: string]: unknown;
}

class GlobalContext {
  constructor() {
    this.initComponentDefinitionMap();
  }

  /** 组件 定义 */
  private componentDefinitionMap: ComponentDefinitionMap = {};
  /** 组件 初始化定义 */
  initComponentDefinitionMap() {
    this.componentDefinitionMap = getComponentDefinition();
  }
  /** 组件 获取组件定义 */
  getComponentDefinition(namespace: string) {
    return this.componentDefinitionMap[namespace];
  }

  /** 场景 刷新 */
  private scenesRefresh: () => void = () => {};
  /** 场景 设置场景刷新state */
  setScenesRefresh(scenesRefresh: (value: SetStateAction<number>) => void) {
    this.scenesRefresh = () => scenesRefresh((prev) => prev + 1);
  }
  /** 场景 映射关系 */
  scenesMap: {
    [key: string]: {
      show: boolean;
      todoList: Array<{ pinId: string; value: unknown }>;
      inputsData: { [key: string]: unknown };
      fromComponentProps: ComponentProps | null;
      componentPropsMap: { [key: string]: ComponentProps };
    };
  } = {
    /** replace scenesMap */
  };
  
  /** 获取当前场景上下文 */
  getScene(sceneId: string) {
    const scene = this.scenesMap[sceneId];
    return {
      get show() {
        return scene.show;
      },
      set show(show: boolean) {
        scene.show = show;
      },
      close: () => {
        if (scene.show) {
          scene.show = false;
          scene.fromComponentProps = null;
          this.scenesRefresh();
        }
      },
      setFromComponentProps(componentProps: ComponentProps) {
        scene.fromComponentProps = componentProps;
      },
      getFromComponentProps() {
        return scene.fromComponentProps;
      },
      setInputData(inputId: string, value: unknown) {
        scene.inputsData[inputId] = value;
      },
      getInputData(inputId: string) {
        return scene.inputsData[inputId];
      },
      getComponent(componentId: string) {
        return scene.componentPropsMap[componentId];
      },
      setComponent(componentId: string, componentProps: ComponentProps) {
        scene.componentPropsMap[componentId] = componentProps;
      },
    };
  }
  /** 打开场景 */
  openScene(sceneId: string) {
    const scene = this.scenesMap[sceneId];
    if (!scene.show) {
      scene.show = true;
      this.scenesRefresh();
    }
  }
  /** 关闭场景 */
  closeScene(sceneId: string) {
    const scene = this.scenesMap[sceneId];
    if (scene.show) {
      scene.show = false;
      this.scenesRefresh();
    }
  }

  /**
   * env 组件内部使用
   *
   * TODO: 这里应该外部配置的
   */
  env = {
    runtime: true,
    i18n(value: unknown) {
      return value;
    },
    canvas: {
      open: (sceneId: string) => {
        this.openScene(sceneId);
      },
    },
    get vars() {
      // 环境变量
      return {
        get getExecuteEnv() {
          return () => "prod";
        },
        get getQuery() {
          return () => {
            return parseQuery(location.search);
          };
        },
        //antd 语言包地址
        get locale() {
          return "";
        },
        get getProps() {
          // 获取主应用参数方法，如：token等参数，取决于主应用传入
          return () => {
            return undefined;
          };
        },
        get getCookies() {
          return () => {
            const cookies = document.cookie.split("; ").reduce((s, e) => {
              const p = e.indexOf("=");
              // @ts-ignore
              s[e.slice(0, p)] = e.slice(p + 1);
              return s;
            }, {});

            return cookies;
          };
        },
        get getRouter() {
          const isUri = (url: string) => {
            return /^http[s]?:\/\/([\w\-\.]+)+[\w-]*([\w\-\.\/\?%&=]+)?$/gi.test(
              url,
            );
          };
          return () => ({
            reload: () => location.reload(),
            redirect: ({ url }: any) => location.replace(url),
            back: () => history.back(),
            forward: () => history.forward(),
            pushState: ({ state, title, url }: any) => {
              if (isUri(url)) {
                //兼容uri
                location.href = url;
              } else {
                history.pushState(state, title, url);
              }
            },
            openTab: ({ url, title }: any) => open(url, title || "_blank"),
          });
        },
      };
    },
    get hasPermission() {
      return () => {
        return true;
      };
    },
  };
}

export default new GlobalContext();

function parseQuery(query: string) {
  const res: any = {};
  query = query.trim().replace(/^(\?|#|&)/, "");
  if (!query) {
    return res;
  }
  query.split("&").forEach((param) => {
    const parts = param.replace(/\+/g, " ").split("=");
    const key = decode(parts.shift());
    const val = parts.length > 0 ? decode(parts.join("=")) : null;
    if (res[key] === undefined) {
      res[key] = val;
    } else if (Array.isArray(res[key])) {
      res[key].push(val);
    } else {
      res[key] = [res[key], val];
    }
  });
  return res;
}

function decode(str: any) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(false, `Error decoding "${str}". Leaving it intact.`);
    }
  }
  return str;
}
