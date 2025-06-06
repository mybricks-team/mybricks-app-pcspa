import { APPType } from "../../types";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";
import { TContext } from "./type";
import { ignoreNamespaces } from '../../constants'
import { analysisAllImageUrl } from "../../tools/analysis";

type Component = {
  namespace: string;
  version: string;
  runtime?: string;
  isCloud?: boolean;
  deps?: Component[];
  currentVersion: string;
  schema: object;
};

const getComponentFromMaterial = (
  component: Component
): Promise<Component | undefined> => {
  Logger.info(`[publish] 开始从物料中心获取 ${component.namespace}@${component.version}`);
  /** 是否最新版 */
  const isLatest = component.version === "latest";

  return API.Material.getMaterialContent({
    namespace: component.namespace,
    // 不传，获取最新版本
    version: isLatest ? null : component.version,
  })
    .then((data) => {
      const { version, namespace, runtime, isCloudComponent, deps, schema } = data;

      Logger.info(`[publish] 获取 ${namespace}@${isLatest ? `latest(${version})` : version} 成功`);

      return {
        // 如果是最新版，version 为 latest
        version: isLatest ? "latest" : version,
        currentVersion: version,
        namespace,
        deps,
        isCloud: isCloudComponent,
        schema,
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
  options: { comLibId: number; noThrowError: boolean; appType: APPType, origin: string }
) => {
  const { comLibId, noThrowError, appType = APPType.React, origin } = options;
  let script = "";
  const componentModules = [...deps];
  const componentCache: Component[] = [];
  const images = new Set<string>();

  Logger.info(`[publish] 开始从物料中心获取组件内容`);

  for (const component of componentModules) {
    const hasCache = componentCache.find(
      (item) =>
        item.namespace === component.namespace &&
        item.version === component.version
    );
    if (hasCache) continue;
    let curComponent = await getComponentFromMaterial(component);
    if (curComponent) {
      component.currentVersion = curComponent.currentVersion
    } else {
      component.currentVersion = component.version
    }

    if (curComponent?.schema) {
      const imageURLs = analysisAllImageUrl("", curComponent.schema, origin);
      imageURLs.forEach((imageUrl) => {
        images.add(imageUrl)
      })
    }

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

    //   script += isCloudComponent
    //     ? `
    //   comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version
    //     }', runtime: ${decodeURIComponent(componentRuntime)} });
    // `
    //     : `
    //   eval(${JSON.stringify(decodeURIComponent(componentRuntime))});
    //   comAray.push({ namespace: '${component.namespace}', version: '${curComponent.version
    //     }', runtime: (window.fangzhouComDef || window.MybricksComDef).default });
    //   if(Reflect.has(window, 'fangzhouComDef')) Reflect.deleteProperty(window, 'fangzhouComDef');
    //   if(Reflect.has(window, 'MybricksComDef')) Reflect.deleteProperty(window, 'MybricksComDef');
    // `;


    script += `
    	comAray.push({
        namespace: '${component.namespace}',
        version: '${curComponent.version}',
        runtime: ${decodeURIComponent(componentRuntime)}
      });
    `
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
    images: Array.from(images),
  };
};

export async function generateComLibRT(
  comlibs,
  json,
  { fileId, noThrowError, app_type, origin }
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

  // scenesDeps.forEach((item) => {
  //   if (item.moduleId) {
  //     // 如果是模块，且存在 moduleId
  //     const module = json?.modules[item.moduleId]

  //     if (module) {
  //       modulesDeps = [
  //         ...modulesDeps,
  //         ...module?.json.deps,
  //       ]

  //     } else {
  //       Logger.info(`[publish] 模块 ID ${item.moduleId} 不存在，数据可能存在错误`);
  //     }

  //   }
  // })

  if (json.modules) {
    Object.keys(json.modules).forEach((key) => {
      modulesDeps = [...modulesDeps, ...json.modules[key].json.deps];
    });
  }

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
    origin
  });
}


export async function createComboScript(ctx: TContext) {
  const { req, json, fileId, hasOldComLib, app_type } = ctx
  const { comlibs } = ctx.configuration
  /** 生成 combo 组件库代码 */
  if (ctx.needCombo) {
    const { scriptText, componentModules, images } = await generateComLibRT(comlibs, json, {
      fileId,
      noThrowError: hasOldComLib,
      app_type,
      origin: req.headers.origin,
    });
    ctx.comboScriptText = scriptText
    ctx.componentModules = componentModules

    const comDepsMap: {[key: string]: Set<string>} = {};

    componentModules.forEach((component) => {
      if (component) {
        const { namespace, currentVersion } = component;
        if (!comDepsMap[namespace]) {
          comDepsMap[namespace] = new Set([currentVersion]);
        } else {
          comDepsMap[namespace].add(currentVersion)
        }
      }
    })

    ctx.template = ctx.template.replace('--comDeps--', convertToComDepsNotes(comDepsMap))

    images.forEach((image) => {
      ctx.imagesPath.add(image)
    })
  } else {
    ctx.comboScriptText = ''
    ctx.componentModules = []

    ctx.template = ctx.template.replace('--comDeps--', "[]")
  }
}

function convertToComDepsNotes (comDepsMap: Record<string, Set<string>>) {
  const comDeps: {namespace: string, version: string}[] = [];
  Object.entries(comDepsMap).forEach(([namespace, versions]) => {
    versions.forEach((version) => {
      comDeps.push({
        namespace,
        version
      })
    })
  })

  return JSON.stringify(comDeps)
}
