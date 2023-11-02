import axios from "axios";
import { APPType } from "../../types";
export const generateComLib = (
  allComLibs: any[],
  allComponents: any[],
  options: { comLibId: number; noThrowError: boolean; appType: APPType }
) => {
  const { comLibId, noThrowError, appType = APPType.React } = options;
  let script = "";

  allComponents.forEach((component) => {
    let lib = allComLibs.find(
      (lib) =>
        lib.componentRuntimeMap[component.namespace + "@" + component.version]
    );
    let curComponent = null;
    if (lib) {
      curComponent =
        lib.componentRuntimeMap[component.namespace + "@" + component.version];
    } else {
      lib = allComLibs.find((lib) =>
        Object.keys(lib.componentRuntimeMap).find((key) =>
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
          Object.keys(lib.componentRuntimeMap).find((key) =>
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

    script += lib.defined
      ? `
			comAray.push({ namespace: '${component.namespace}', version: '${
          curComponent.version
        }', runtime: ${decodeURIComponent(componentRuntime)} });
		`
      : `
			eval(${JSON.stringify(decodeURIComponent(componentRuntime))});
			comAray.push({ namespace: '${component.namespace}', version: '${
          curComponent.version
        }', runtime: (window.fangzhouComDef || window.MybricksComDef).default });
			if(Reflect.has(window, 'fangzhouComDef')) Reflect.deleteProperty(window, 'fangzhouComDef');
			if(Reflect.has(window, 'MybricksComDef')) Reflect.deleteProperty(window, 'MybricksComDef');
		`;
  });

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
  { domainName, fileId, noThrowError, app_type }
) {
  /**
   * TODO:
   * 1.目前应用里配置的edit.js 一定有 rt.js
   * 2.物料体系完善后，应该都是按需加载的
   * 3.目前只有匹配到“我的组件”内组件才去物料中心拉组件代码
   */
  let mySelfComMap = {};

  comlibs.forEach((comlib) => {
    if (comlib?.defined && Array.isArray(comlib.comAray)) {
      comlib.comAray.forEach((com) => {
        mySelfComMap[`${com.namespace}@${com.version}`] = true;
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

  const selfComponents = deps.filter(
    (item) => mySelfComMap[`${item.namespace}@${item.version}`]
  );
  const comLibContents = [...comlibs];

  /** 处理我的组件 */
  if (selfComponents.length) {
    try {
      const finalComponents = await Promise.all(
        selfComponents.map((component) => {
          return new Promise((resolve, reject) => {
            axios({
              method: "get",
              url: `${domainName}/api/material/namespace/content?namespace=${component.namespace}&version=${component.version}`,
              timeout: 30 * 1000,
            })
              .then(({ data }) => {
                resolve(data.data);
              })
              .catch((error) => reject(error));
          });
        })
      );

      comLibContents.unshift({
        comAray: [],
        id: "_myself_",
        title: "我的组件",
        defined: true,
        componentRuntimeMap: {},
      });
      finalComponents.forEach((finalComponent: any) => {
        const { version, namespace, runtime } = finalComponent;

        if (version && namespace && runtime) {
          comLibContents[0].componentRuntimeMap[namespace + "@" + version] = {
            version,
            runtime: encodeURIComponent(runtime),
          };
        }
      });
    } catch (error) {
      throw Error(error.message || error.msg || "获取我的组件物料信息异常");
    }
  }

  return generateComLib(
    comLibContents.filter((lib) => !!lib.componentRuntimeMap),
    deps,
    { comLibId: fileId, noThrowError, appType: app_type }
  );
}

export async function getComboScriptText(
  comlibs,
  json,
  { domainName, fileId, noThrowError, app_type },
  needCombo
) {
  /** 生成 combo 组件库代码 */
  if (needCombo) {
    return await generateComLibRT(comlibs, json, {
      domainName,
      fileId,
      noThrowError,
      app_type,
    });
  }

  return "";
}
