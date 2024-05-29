import { APPType } from "../../types";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";
import { TContext } from "./type";

type Component = {
  namespace: string;
  version: string;
  runtime?: string;
  isCloud?: boolean;
  deps?: Component[];
};

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
  'mybricks.core-comlib.group',
  'mybricks.core-comlib.selection'
];

const getComponentFromMaterial = (
  component: Component
): Promise<Component | undefined> => {
  Logger.info(`[publish] 开始从物料中心获取 ${component.namespace}@${component.version}`);

  return API.Material.getMaterialContent({
    namespace: component.namespace,
    version: component.version,
  })
    .then((data) => {
      const { version, namespace, runtime, isCloudComponent, deps } = data;

      Logger.info(`[publish] 获取 ${namespace}@${version} 成功`);

      return {
        version,
        namespace,
        deps,
        isCloud: isCloudComponent,
        runtime: encodeURIComponent(runtime),
      };
    })
    .catch((err) => {
      return undefined;
    });
};

export const generateComLib = async (
  allComLibs: any[],
  deps: Component[],
  options: { comLibId: number; noThrowError: boolean; appType: APPType }
) => {
  const { comLibId, noThrowError, appType = APPType.React } = options;
  let script = "";
  const componentModules = [...deps];
  const componentCache: Component[] = [];

  Logger.info(`[publish] 开始从物料中心获取组件内容`);

  for (const component of componentModules) {
    const hasCache = componentCache.find(
      (item) =>
        item.namespace === component.namespace &&
        item.version === component.version
    );
    if (hasCache) continue;
    let curComponent = await getComponentFromMaterial(component);
    if (curComponent?.deps) {
      componentModules.push(
        ...curComponent.deps.filter(
          (dep) => !ignoreNamespaces.includes(dep.namespace) && componentModules.findIndex((item) => item.namespace === dep.namespace && item.version === dep.version) === -1
        )
      );
    }
    if (!curComponent) {
      Logger.warn(
        `[getMaterialContent] 物料中心获取组件${component.namespace}失败，开始从rtComs获取……`
      );
      let lib = allComLibs.find(
        (lib) =>
          lib.componentRuntimeMap &&
          lib.componentRuntimeMap[component.namespace + "@" + component.version]
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
              `1-找不到 ${component.namespace}@${component.version} 对应的组件资源`
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
            `2-找不到 ${component.namespace}@${component.version} 对应的组件资源`
          );
        }
      }
    }

    // 去重从comlib rt中获取的组件
    if (componentCache.find(
      (item) =>
        item.namespace === component.namespace &&
        item.version === curComponent.version
    )) {
      continue
    }
    componentCache.push(curComponent);
    const isCloudComponent = component.isCloud || curComponent.isCloud;

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

    script += isCloudComponent
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

  Logger.info(`[publish] 组件内容获取完毕`);

  return {
    scriptText: `
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
	`,
    componentModules,
  };
};

export async function generateComLibRT(
  comlibs,
  json,
  { fileId, noThrowError, app_type }
) {
  const mySelfComMap: Record<string, boolean> = {};
  comlibs.forEach((comlib) => {
    if (comlib?.defined && Array.isArray(comlib.comAray)) {
      comlib.comAray.forEach(({ namespace, version }) => {
        mySelfComMap[`${namespace}@${version}`] = true;
      });
    }
  });

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
  const scenesDeps = (json.scenes || []).reduce(
    (pre, scene) => [...pre, ...scene.deps],
    []
  )
  scenesDeps.forEach((item) => {
    if (item.moduleId) {
      // 如果是模块，且存在 moduleId
      modulesDeps = [
        ...modulesDeps,
        ...json?.modules[item.moduleId].json.deps,
      ]
    }
  })

  // if (json.modules) {
  //   Object.keys(json.modules).forEach((key) => {
  //     modulesDeps = [...modulesDeps, ...json.modules[key].json.deps];
  //   });
  // }

  let deps = [
    ...scenesDeps
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(json.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      // .filter((item) => !mySelfComMap[`${item.namespace}@${item.version}`])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ];


  const cloudNamespaceList = Object.keys(mySelfComMap);

  deps = deps.reduce((accumulator, current) => {
    const existingObject = accumulator.find(
      (obj) =>
        obj.namespace === current.namespace && obj.version === current.version
    );
    /**
     * "我的组件"集合，标记为云组件
     */
    if (
      cloudNamespaceList.includes(`${current.namespace}@${current.version}`)
    ) {
      current.isCloud = true;
    }
    if (!existingObject) {
      accumulator.push(current);
    }
    return accumulator;
  }, []);

  return await generateComLib([...comlibs], deps, {
    comLibId: fileId,
    noThrowError,
    appType: app_type,
  });
}


export async function createComboScript(ctx: TContext) {
  const { json, fileId, hasOldComLib, app_type } = ctx
  const { comlibs } = ctx.configuration
  /** 生成 combo 组件库代码 */
  if (ctx.needCombo) {
    const { scriptText, componentModules } = await generateComLibRT(comlibs, json, {
      fileId,
      noThrowError: hasOldComLib,
      app_type,
    });
    ctx.comboScriptText = scriptText
    ctx.componentModules = componentModules
  } else {
    ctx.comboScriptText = ''
    ctx.componentModules = []
  }
}
