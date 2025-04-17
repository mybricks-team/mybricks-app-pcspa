import { Logger } from "@mybricks/rocker-commons";
import { Scene, ToJSON } from "./type";
import API from "@mybricks/sdk-for-app/api";
import * as fs from "fs";
import * as path from "path";

const comlibModuleMap: Record<string, string> = {
  "mybricks.normal-pc": "@mybricks/comlib-pc-normal",
  "mybricks.basic-comlib": "@mybricks/comlib-basic",
};

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function convertToUnderscore(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function getComponentName({
  namespace,
  rtType,
}: {
  namespace: string;
  rtType: string;
}) {
  const lastIndex = namespace.lastIndexOf(".");
  return convertToUnderscore(
    lastIndex !== -1 ? namespace.substring(lastIndex + 1) : namespace
  )
    .split("_")
    .filter((str) => str)
    .reduce((p, c, index) => {
      return (
        p +
        (rtType?.match(/^js/gi)
          ? index
            ? capitalizeFirstLetter(c)
            : c
          : capitalizeFirstLetter(c))
      );
    }, "");
}

const collectModuleCom = (coms: any, comlibDeps: any[]) => {
  const res = {} as Record<string, any>;
  const newComDefs: any = [];

  coms.forEach((com: any) => {
    const comlib = comlibDeps.find((comlib) =>
      comlib.deps.some((dep: any) => dep === com.namespace)
    );
    if (!comlib) {
      throw new Error(`can not find comlib module for com ${com.namespace}`);
    }
    const module = comlibModuleMap[comlib.namespace];
    if (!res[module]) {
      res[module] = [];
    }
    const componentName = getComponentName({
      namespace: com.namespace,
      rtType: com.rtType,
    });

    res[module].push(componentName);

    newComDefs.push({
      ...com,
      namespace: com.namespace,
      runtimeName: componentName,
      libraryName: module,
    });
  });

  return {
    importInfo: res,
    newComDefs,
  };
};
// 获取指定组件库内的组件信息
const getComlibContent = async (comlib: {
  namespace: string;
  version: string;
}): Promise<string[]> => {
  // 排除不支持的组件库
  if (!comlibModuleMap[comlib.namespace]) {
    Logger.error(
      `can not find node module for comlib ${comlib.namespace}@${comlib.version}`
    );
    return [];
    // throw new Error(`can not find node module for comlib ${comlib.namespace}`)
  }
  const res = await API.Material.getMaterialContent({
    namespace: comlib.namespace,
    version: comlib.version,
  })
    .then((data) => {
      const deps = data.react.deps;
      return deps.map((item: any) => item.namespace);
    })
    .catch((err) => {
      Logger.error(
        `getComlibContent fail 获取 ${comlib.namespace}@${comlib.version} 失败`,
        err
      );
      return undefined;
    });
  return res;
};

function getComDeps(json: ToJSON) {
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
    "mybricks.core-comlib.group",
    "mybricks.core-comlib.selection",
    "mybricks.core-comlib.js-ai",
    "mybricks.core-comlib.domain"
  ];
  let definedComsDeps: any[] = [];
  let modulesDeps: any[] = [];

  if (json.definedComs) {
    Object.keys(json.definedComs).forEach((key) => {
      definedComsDeps = [
        ...definedComsDeps,
        ...json.definedComs[key].json.deps,
      ];
    });
  }

  const modules = json.modules;
  if (modules) {
    Object.keys(modules).forEach((key) => {
      modulesDeps = [...modulesDeps, ...modules[key].json.deps];
    });
  }

  let deps: { namespace: string; version: string; rtType?: string }[] = [
    ...(Array.isArray(json.scenes) ? json.scenes : [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [] as Scene["deps"])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(json.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [] as Scene["deps"])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps.filter(
      (item) => !ignoreNamespaces.includes(item.namespace)
    ),
    ...modulesDeps.filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ];

  let res: any[] = [];
  for (let dep of deps) {
    if (!res.find((item) => item.namespace === dep.namespace)) {
      res.push(dep);
    }
  }
  return res;
}

async function genComponents(json: ToJSON, comLibs: any) {
  let importComponentsStr = "";
  let componentsMapStr = "";
  let componentsExportStr = "";

  const comlibDeps = await Promise.all(
    comLibs.map(async (item: any) => {
      const { namespace } = item;
      const res = await getComlibContent(item);
      return { namespace, deps: res };
    })
  );
  const comDeps = getComDeps(json);
  const { newComDefs } = collectModuleCom(comDeps, comlibDeps);

  newComDefs.forEach((item: any, index: number) => {
    importComponentsStr +=
      `import ${item.runtimeName}Def from "${item.libraryName}/es/${item.runtimeName}"` +
      "\n";
    if (index === comDeps.length - 1) {
      componentsMapStr += `'${item.namespace}': ${item.runtimeName}Def`;
    } else {
      componentsMapStr += `'${item.namespace}': ${item.runtimeName}Def,` + "\n";
    }

    if (!item.rtType) {
      // 仅需要导出ui组件
      componentsExportStr += `export const ${item.runtimeName} = Component;`;
    }
  });

  return {
    importComponentsStr,
    componentsMapStr,
    componentsExportStr,
  };
}

/*
递归查找 modules 的所有 deps，返回所有 deps
modules 的数据结构如下，其中 deps 为依赖的组件，如果 moduleId 存在，并且namespace 为 mybricks.core-comlib.module，则为模块，需要再次查找模块的 deps

modules = {
  "key1": {
    "json": {
      "deps": [
        {
          "moduleId": "key2",
          "namespace": "mybricks.core-comlib.module",
        },
        {
          "namespace": "mybricks.core-comlib.xxxx",
          ...
        }
      ],
    }
  },
  "key2": {
    "json": {
      "deps": [
        {
          "namespace": "mybricks.core-comlib.xxxx",
          ...
        }
      ],
    }
  }
}
*/

// function getModulesDeps(modules) {
//   let modulesDeps = [];
//   Object.keys(modules).forEach((key) => {
//     let myModuleDeps = modules[key].json.deps;
//     myModuleDeps.forEach((dep) => {
//       if (dep.moduleId && dep.namespace === "mybricks.core-comlib.module") {
//         modulesDeps.push();
//       } else {
//         // 非模块
//         modulesDeps.push(dep);
//       }
//     });
//   });
//   return modulesDeps;
// }

export { genComponents };
