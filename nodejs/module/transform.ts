import { Logger } from '@mybricks/rocker-commons';
const Babel = require("@babel/standalone");

const NeedTransformCom = [
  "fangzhou.normal-pc.code.segment",
  "mybricks.normal-pc.segment",
  "mybricks.basic-comlib._muilt-inputJs",
  "mybricks.normal-pc.muilt-inputJs",
];

const NeedTransformPlugin = [
  "@mybricks/plugins/service",
  "@manatee/service-interface"
]

const transformCodeByBabel = (
  code: string,
  tips?: string,
  keepCode?: boolean
) => {
  /**
   * 已经babel的code直接返回
   */
  if (code?.includes("var%20_RTFN_")) {
    return code;
  }
  let res = code;
  try {
    let temp = decodeURIComponent(code);
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
    res = encodeURIComponent(
      Babel.transform(temp, {
        presets: ["env"],
      }).code
    );
    res = `${encodeURIComponent(
      `(function() { var _RTFN_; \n`
    )}${res}${encodeURIComponent(`\n; return _RTFN_; })()`)}`;
  } catch (e) {
    console.info(e);
    if (tips) {
      throw new Error(`\n${tips}代码存在错误，请检查！！！`);
    }
    return code;
  }
  return res;
};

const transformScene = (scene: Record<string, any>) => {
  if (scene.refs) {
    const tempObj = scene.refs;
    (Object.keys(scene.refs) || []).forEach((key) => {
      const namespace = tempObj?.[key]?.def?.namespace;
      if (
        namespace &&
        NeedTransformCom.includes(namespace) &&
        typeof tempObj?.[key]?.model?.data?.fns === "string"
      ) {
        tempObj[key].model.data.fns = transformCodeByBabel(
          tempObj[key].model.data.fns,
          `${tempObj[key].title}(${tempObj[key].id})`
        );
      }
    });
  }
  if (scene.coms) {
    const tempObj = scene.coms;
    (Object.keys(tempObj) || []).forEach((key) => {
      const namespace = tempObj?.[key]?.def?.namespace;
      if (
        namespace &&
        NeedTransformCom.includes(namespace) &&
        typeof tempObj?.[key]?.model?.data?.fns === "string"
      ) {
        tempObj[key].model.data.fns = transformCodeByBabel(
          tempObj[key].model.data.fns,
          `【${tempObj[key].title ?? tempObj[key].id}】—— JS计算编译失败，`
        );
      }
    });
  }
  return scene;
};

const transform = (json: Record<string, any>) => {
  Logger.info("[publish] transform start");

  json.hasPermissionFn = transformCodeByBabel(
    decodeURIComponent(json.hasPermissionFn),
    "全局方法-权限校验"
  );
  Object.keys(json.plugins).forEach((pluginName) => {
    if (NeedTransformPlugin.includes(pluginName)) {
      json.plugins[pluginName] = json.plugins[pluginName].map((service) => ({
        ...service,
        script: transformCodeByBabel(
          decodeURIComponent(service.script),
          "连接器"
        ),
      }));
    }
  });
  json.scenes = (json.scenes || []).map(transformScene);
  
  Logger.info("[publish] transform finish");

  return json;
};

export { transform };
