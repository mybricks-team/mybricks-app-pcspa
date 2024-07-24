import { Logger } from '@mybricks/rocker-commons'
import EnhancedError from '../../module/tools/enhanced-error'
const Babel = require("@babel/standalone")


/**
 * @description JS组件列表
 */
const NeedTransformCom = [
  "fangzhou.normal-pc.code.segment",
  "mybricks.normal-pc.segment",
  "mybricks.basic-comlib._muilt-inputJs",
  "mybricks.normal-pc.muilt-inputJs",
];

/**
 * @description 插件列表
 */
const NeedTransformPlugin = [
  "@mybricks/plugins/service",
  "@manatee/service-interface"
]

const safeDecoder = (code: string) => {
  try {
    return decodeURIComponent(code)
  } catch (error) {
    return code
  }
}

const transformCodeByBabel = (
  code: string,
  tips?: string,
  keepCode?: boolean,
  options?: any,
) => {
  /**
   * 已经babel的code直接返回
   */
  if (code?.includes("var%20_RTFN_")) {
    return code;
  }

  let res = code

  const parserOptions = options ?? {
    presets: ["env", "typescript"],
    filename: "types.d.ts",
  }

  try {
    let temp = safeDecoder(code)

    if (!temp.trim()) {
      Logger.warn(`[publish] ${tips}代码为空，已忽略，跳过编译流程`)

      return code
    }

    if (keepCode) {
      // 不做处理
    } else if (/export\s+default.*async.*function.*\(/g.test(temp)) {
      temp = temp.replace(
        /export\s+default.*function.*\(/g,
        "_RTFN_ = async function _RT_("
      );
    } else if (/export\s+default.*function.*\(/g.test(temp)) {
      temp = temp.replace(
        /export\s+default.*function.*\(/g,
        "_RTFN_ = function _RT_("
      );
    } else {
      temp = `_RTFN_ = ${temp} `;
    }
    res = Babel.transform(temp, parserOptions).code;
    res = encodeURIComponent(`(function() { var _RTFN_; \n${res}\n; return _RTFN_; })()`)
  } catch (e) {
    Logger.error(`[publish] ${tips}代码存在错误，请检查！！！`)
    Logger.error(`[publish] ${e.message}`)

    if (tips) {
      throw new EnhancedError(`${tips}代码存在错误，请检查！！！`, { errorDetailMessage: e.message, comId: options?.id });
    }

    return code;
  }
  return res;
};

const transformComItem = (comItem) => {
  const namespace = comItem?.def?.namespace;
  compileJsCode({ data: comItem.model.data, namespace, title: comItem.title, id: comItem.id }, '模块')
  compileJSXCode({ data: comItem.model.data, namespace, title: comItem.title, id: comItem.id }, '模块')

  // if (
  //   namespace &&
  //   NeedTransformCom.includes(namespace) &&
  //   typeof comItem?.model?.data?.fns === "string"
  // ) {
  //   comItem.model.data.fns = transformCodeByBabel(
  //     comItem.model.data.fns,
  //     `【${comItem.title ?? comItem.id}】—— JS计算编译失败，`
  //   );
  // } else if (["mybricks.normal-pc.custom-render", "mybricks.normal-pc-chart.line"].includes(namespace)) {
  //   const parserOptions = {
  //     presets: ['env', 'react'],
  //     plugins: [
  //       ['proposal-decorators', { legacy: true }],
  //       'proposal-class-properties',
  //       [
  //         'transform-typescript',
  //         {
  //           isTSX: true
  //         }
  //       ]
  //     ]
  //   };
  //   comItem.model.data.componentCode = transformCodeByBabel(
  //     comItem.model.data.componentCode,
  //     `【${comItem.title ?? comItem.id}】—— 自定义渲染编译失败，`,
  //     false,
  //     parserOptions
  //   );
  // }
}

const transformScene = (scene: Record<string, any>) => {
  /**
   * refs 字段已经遗弃
   */
  // if (scene.refs) {
  //   const tempObj = scene.refs;
  //   (Object.keys(scene.refs) || []).forEach((key) => {
  //     const namespace = tempObj?.[key]?.def?.namespace;
  //     if (
  //       namespace &&
  //       NeedTransformCom.includes(namespace) &&
  //       typeof tempObj?.[key]?.model?.data?.fns === "string"
  //     ) {
  //       tempObj[key].model.data.fns = transformCodeByBabel(
  //         tempObj[key].model.data.fns,
  //         `${tempObj[key].title}(${tempObj[key].id})`
  //       );
  //     }
  //   });
  // }
  if (scene.coms) {
    const tempObj = scene.coms;
    (Object.keys(tempObj) || []).forEach((key) => {
      const comItem = tempObj[key];

      const namespace = comItem?.def?.namespace;

      compileJsCode({ data: comItem.model.data, namespace, title: comItem.title, id: comItem.id }, scene.title)
      compileJSXCode({ data: comItem.model.data, namespace, title: comItem.title, id: comItem.id }, scene.title)

      // if (
      //   namespace &&
      //   NeedTransformCom.includes(namespace) &&
      //   typeof tempObj?.[key]?.model?.data?.fns === "string"
      // ) {
      //   tempObj[key].model.data.fns = transformCodeByBabel(
      //     tempObj[key].model.data.fns,
      //     `【${tempObj[key].title ?? tempObj[key].id}】—— JS计算编译失败，`
      //   );
      // } else if (["mybricks.normal-pc.custom-render", "mybricks.normal-pc-chart.line"].includes(namespace)) {
      //   const parserOptions = {
      //     presets: ['env', 'react'],
      //     plugins: [
      //       ['proposal-decorators', { legacy: true }],
      //       'proposal-class-properties',
      //       [
      //         'transform-typescript',
      //         {
      //           isTSX: true
      //         }
      //       ]
      //     ]
      //   };
      //   tempObj[key].model.data.componentCode = transformCodeByBabel(
      //     tempObj[key].model.data.componentCode,
      //     `【${tempObj[key].title ?? tempObj[key].id}】—— 自定义渲染编译失败，`,
      //     false,
      //     parserOptions
      //   );
      // }
    });
  }
  return scene;
};

const transformGlobalFx = (json) => {
  if (json.global!.fxFrames) {
    json.global.fxFrames = (json.global.fxFrames ?? []).map((fx) => {
      (Object.keys(fx.coms) ?? []).forEach((id) => {
        const namespace = fx.coms[id]!.def.namespace
        compileJsCode({ data: fx.coms[id].model.data, namespace, title: fx.coms[id].title, id }, `全局 Fx ${fx.title ?? ''}`)
        // if (
        //   namespace &&
        //   NeedTransformCom.includes(namespace) &&
        //   typeof fx.coms[id]?.model?.data?.fns === "string"
        // ) {
        //   fx.coms[id].model.data.fns = transformCodeByBabel(
        //     fx.coms[id].model.data.fns,
        //     `【${fx.coms[id].title ?? id}】—— 全局Fx中JS计算编译失败，`
        //   );
        // }
      });
      return fx;
    });
  }
};

/**
 * @description 编译 JS 代码
 */
const compileJsCode = ({ data, namespace, title, id }, scope) => {
  if (
    namespace &&
    NeedTransformCom.includes(namespace) &&
    typeof data.fns === "string"
  ) {
    const tips = `【${scope}/${title}】ID: ${id} —— 编译失败，`
    data.fns = transformCodeByBabel(data.fns, tips, false, { id });
  }
}

/**
 * @description 编译 JSX 代码
 */
const compileJSXCode = ({ data, namespace, title, id }, scope) => {
  if (["mybricks.normal-pc.custom-render", "mybricks.normal-pc-chart.line"].includes(namespace)) {
    const parserOptions = {
      presets: ['env', 'react'],
      plugins: [
        ['proposal-decorators', { legacy: true }],
        'proposal-class-properties',
        [
          'transform-typescript',
          {
            isTSX: true
          }
        ]
      ]
    }

    const tips = `【${scope}/${title}】ID: ${id} —— 编译失败，`

    data.componentCode = transformCodeByBabel(data.componentCode, tips, false, parserOptions);
  }
}

/**
 * 编译代码函数主入口
 * @param json 
 * @returns json
 */
const transform = (json: Record<string, any>) => {
  const startTime = new Date().getTime();

  Logger.info("[publish] transform start");

  transformGlobalFx(json)

  json.hasPermissionFn = transformCodeByBabel(decodeURIComponent(json.hasPermissionFn), '全局方法-权限校验');

  Object.keys(json.plugins).forEach((pluginName) => {
    if (NeedTransformPlugin.includes(pluginName)) {
      json.plugins[pluginName] = json.plugins[pluginName].map((service) => ({
        ...service,
        script: transformCodeByBabel(decodeURIComponent(service.script), `${pluginName} 连接器`),
      }));
    }
  });

  json.scenes = (json.scenes || []).map((scene) => {
    return transformScene(scene)
  });

  Object.keys(json.modules || []).forEach(modulesId => {
    Object.keys(json.modules[modulesId].json.coms || []).forEach(comId => {
      const com = json.modules[modulesId].json.coms[comId]
      transformComItem(com)
    })
  })

  Logger.info(`[publish] transform finish, 耗时：${(new Date().getTime() - startTime) / 1000}s`);

  return json;
};

export { transform };
