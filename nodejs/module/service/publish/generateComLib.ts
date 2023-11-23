import { APPType } from "../../types";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";

type Component = {
  namespace: string;
  version: string;
  runtime?: string;
  isCloud?: boolean;
};

const getComponentFromMaterial = (component: Component): Promise<Component> => {
  return API.Material.getMaterialContent({
    namespace: component.namespace,
    version: component.version,
  }).then((data) => {
    const { version, namespace, runtime } = data;
    return {
      version,
      namespace,
      runtime: encodeURIComponent(runtime),
    };
  });
};

export const generateComLib = async (
  allComLibs: any[],
  deps: Component[],
  options: { comLibId: number; noThrowError: boolean; appType: APPType }
) => {
  const { comLibId, noThrowError, appType = APPType.React } = options;
  let script = "";

  for (const component of deps) {
    let curComponent = await getComponentFromMaterial(component).catch((err) => { });
    if (!curComponent) {
      Logger.warn(`[getMaterialContent] 物料中心获取组件${component.namespace}失败，开始从rtComs获取……`)
      let lib = allComLibs.find(
        (lib) =>
          lib.componentRuntimeMap && lib.componentRuntimeMap[component.namespace + "@" + component.version]
      );
      if (lib) {
        curComponent =
          lib.componentRuntimeMap[
          component.namespace + "@" + component.version
          ];
      } else {
        lib = allComLibs.find((lib) =>
          Object.keys(lib.componentRuntimeMap ?? {}).find((key) =>
            key.startsWith(component.namespace)
          )
        );

        if (!lib) {
          if (noThrowError) {
            return;
          } else {
            throw new Error(
              `找不到 ${component.namespace}@${component.version} 对应的组件资源`
            );
          }
        }
        curComponent =
          lib.componentRuntimeMap[
          Object.keys(lib.componentRuntimeMap ?? {}).find((key) =>
            key.startsWith(component.namespace)
          )
          ];
      }

      if (!curComponent) {
        if (noThrowError) {
          return;
        } else {
          throw new Error(
            `找不到 ${component.namespace}@${component.version} 对应的组件资源`
          );
        }
      }
    }

    let componentRuntime = "";
    switch (true) {
      case appType === APPType.React: {
        componentRuntime = curComponent.runtime;
        break;
      }

      case appType === APPType.Vue2: {
        componentRuntime = curComponent["runtime.vue"] ?? curComponent.runtime;
        break;
      }

      case appType === APPType.Vue3: {
        componentRuntime = curComponent["runtime.vue"] ?? curComponent.runtime;
        break;
      }

      default: {
        componentRuntime = curComponent.runtime;
        break;
      }
    }

    script += component.isCloud
      ? `
			comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version
      }', runtime: ${decodeURIComponent(componentRuntime)} });
		`
      : `
			eval(${JSON.stringify(decodeURIComponent(componentRuntime))});
			comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version
      }', runtime: (window.fangzhouComDef || window.MybricksComDef).default });
			if(Reflect.has(window, 'fangzhouComDef')) Reflect.deleteProperty(window, 'fangzhouComDef');
			if(Reflect.has(window, 'MybricksComDef')) Reflect.deleteProperty(window, 'MybricksComDef');
		`;
  }

  return `
		(function() {
			let comlibList = window['__comlibs_rt_'];
			if(!comlibList){
				comlibList = window['__comlibs_rt_'] = [];
			}
			let comAray = [];
			comlibList.push({
				id: '${comLibId}',
				title: '页面${comLibId}的组件库',
				comAray,
				defined: true,
			});
			${script}
		})()
	`;
};

export async function generateComLibRT(
  comlibs,
  json,
  { fileId, noThrowError, app_type }
) {
  /**
   * "我的组件"集合，标记为云组件
   */
  const mySelfComMap = [];
  comlibs.forEach((comlib) => {
    if (comlib?.defined && Array.isArray(comlib.comAray)) {
      comlib.comAray.forEach(({ namespace, version }) => {
        mySelfComMap.push({
          namespace,
          version,
          isCloud: true,
        });
      });
    }
  });

  const ignoreNamespaces = [
    "mybricks.core-comlib.fn",
    "mybricks.core-comlib.var",
    "mybricks.core-comlib.type-change",
    "mybricks.core-comlib.connector",
    "mybricks.core-comlib.frame-input",
    "mybricks.core-comlib.frame-output",
    "mybricks.core-comlib.scenes",
    "mybricks.core-comlib.defined-com",
    "mybricks.core-comlib.module",
  ];

  let definedComsDeps = [];
  let modulesDeps = [];

  if (json.definedComs) {
    Object.keys(json.definedComs).forEach((key) => {
      definedComsDeps = [
        ...definedComsDeps,
        ...json.definedComs[key].json.deps,
      ];
    });
  }

  if (json.modules) {
    Object.keys(json.modules).forEach((key) => {
      modulesDeps = [...modulesDeps, ...json.modules[key].json.deps];
    });
  }

  let deps = [
    ...(json.scenes || [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(json.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...mySelfComMap,
  ];

  deps = deps.reduce((accumulator, current) => {
    const existingObject = accumulator.find(
      (obj) => obj.namespace === current.namespace
    );
    if (!existingObject) {
      accumulator.push(current);
    }
    return accumulator;
  }, []);

  const scriptText = await generateComLib([...comlibs], deps, {
    comLibId: fileId,
    noThrowError,
    appType: app_type,
  });
  return scriptText;
}

export async function getComboScriptText(
  comlibs,
  json,
  { fileId, noThrowError, app_type },
  needCombo
) {
  /** 生成 combo 组件库代码 */
  if (needCombo) {
    return await generateComLibRT(comlibs, json, {
      fileId,
      noThrowError,
      app_type,
    });
  }

  return "";
}
