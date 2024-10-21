import { ILocalizationInfo } from "../../interface";
import { analysisAllImageUrl } from "../../tools/analysis";
import {
  getCustomConnectorRuntime,
  getCustomNeedLocalization,
} from "../../tools/get-app-config";
import {
  getLocalizationInfoByLocal,
  getLocalizationInfoByNetwork,
} from "../../tools/localization";
import LocalPublic from "../local-public";
import { Logger } from "@mybricks/rocker-commons";
import { TContext } from "./type";
import MaterialExternal from '../material-external'

export async function localization(ctx: TContext) {
  let {
    req,
    appConfig,
    template,
    app_type,
    json,
    hasOldComLib,
    componentModules
  } = ctx
  const { comlibs } = ctx.configuration
  /** 是否本地化发布 */
  const needLocalization = await getCustomNeedLocalization();
  const origin = req.headers.origin;

  /** 所有要本地化的公共依赖 */
  let globalDeps: ILocalizationInfo[] = [];
  /** 所有要本地化的图片 */
  let images: ILocalizationInfo[];

  if (hasOldComLib) {
    try {
      Logger.info("[publish] 正在尝试组件库本地化...");
      // 由于老数据无法判断是否是需要本地化的组件库，所以无法按需加载
      const localizationComLibInfoList: ILocalizationInfo[] = await Promise.all(
        [
          "public/comlibs/7632_1.2.72/2023-08-28_16-50-20/edit.js",
          "public/comlibs/7632_1.2.72/2023-08-28_16-50-20/rt.js",
          "public/comlibs/5952_1.0.1/2023-07-25_22-02-32/edit.js",
          "public/comlibs/5952_1.0.1/2023-07-25_22-02-32/rt.js",
          "public/comlibs/7182_1.0.29/2023-07-25_22-04-55/edit.js",
          "public/comlibs/7182_1.0.29/2023-07-25_22-04-55/rt.js",
        ].map((url) =>
          getLocalizationInfoByLocal(url, url.split("/").slice(0, -1).join("/"))
        )
      );
      globalDeps = globalDeps.concat(localizationComLibInfoList);
    } catch (e) {
      Logger.error(`[publish] 组件库本地化失败！ ${JSON.stringify(e)}`);
      throw e;
    }
  }

  try {
    Logger.info("[publish] 正在尝试 plugin-runtime 本地化...");
    const customConnectorRuntimeUrl = getCustomConnectorRuntime(appConfig, req);
    if (customConnectorRuntimeUrl) {
      const info = await getLocalizationInfoByNetwork(
        customConnectorRuntimeUrl,
        "public/plugins"
      );
      globalDeps = globalDeps.concat(info);
      template = template.replace(
        "-- plugin-runtime --",
        `<script src="${info.path}/${info.name}" ></script>`
      );
    } else {
      template = template.replace("-- plugin-runtime --", "");
    }
  } catch (e) {
    Logger.error(`[publish] plugin-runtime 本地化失败: ${JSON.stringify(e)}`);
    throw e;
  }

  try {
    Logger.info("[publish] 正在尝试资源本地化...");
    // 将模板中所有资源本地化
    const {
      globalDeps: _globalDeps,
      images: _images,
      template: _template,
    } = await resourceLocalization(
      template,
      needLocalization,
      appConfig?.publishLocalizeConfig?.enableCompatible,
      json,
      origin,
      comlibs,
      componentModules,
      app_type
    );
    globalDeps = globalDeps.concat(_globalDeps || []);
    images = _images;
    template = _template;
    Logger.info("[publish] 资源本地化成功！");
  } catch (e) {
    Logger.error(`[publish] 资源本地化失败: ${JSON.stringify(e)}`);
    throw new Error("资源本地化失败！");
  }

  ctx.template = template
  ctx.globalDeps = globalDeps
  ctx.images = images
}
/**
 * 将 HTML 中的公网资源本地化
 * @param template HTML 模板
 * @param needLocalization CDN 资源是否需要本地化
 */
async function resourceLocalization(
  template: string,
  needLocalization: boolean,
  enableCompatible: boolean,
  json: any,
  origin,
  comlibs,
  componentModules,
  type = "react"
) {
  const localPublicInfos = LocalPublic[type].map((info) => {
    const res = { ...info };
    // 按需替换成兼容资源
    if (enableCompatible && res.path_compatible && res.CDN_COMPATIBLE) {
      {
        res.path = res.path_compatible
        res.CDN = res.CDN_COMPATIBLE
      }
    }
    if (!needLocalization) {
      res.path = res.CDN;
    }
    return res;
  });

  const materialExternalInfos = MaterialExternal[type].map((info) => {
    const res = { ...info };
    // 按需替换成兼容资源
    if (enableCompatible && res.path_compatible && res.CDN_COMPATIBLE) {
      {
        res.path = res.path_compatible
        res.CDN = res.CDN_COMPATIBLE
      }
    }
    if (!needLocalization) {
      res.path = res.CDN;
    }
    return res;
  });

  const { chunkAssets, onlineChunkAssets, pathArr } = collectExternal(localPublicInfos, comlibs, componentModules, materialExternalInfos);

  const publicHtmlStr = localPublicInfos.reduce((pre, cur) => {
    switch (cur.tag) {
      case "link":
        pre += `<link rel="stylesheet" href="${cur.path}" />`;
        break;
      case "script":
        pre += `<script src="${cur.path}"></script>`;
        break;
    }
    return pre;
  }, "");

  template = template.replace("-- public --", chunkAssets);
  template = template.replace("-- online-public --", onlineChunkAssets);

  Logger.info(`[publish] 发布资源 ${localPublicInfos}`);
  Logger.info(`[publish] 发布资源 ${materialExternalInfos}`);

  let globalDeps: ILocalizationInfo[] = null;
  if (needLocalization) {
    // 获取所有本地化需要除了图片以外的信息，这些信息目前存储在相对位置
    globalDeps = await Promise.all(
      pathArr.map((path) =>
        getLocalizationInfoByLocal(path, path.split("/").slice(0, -1).join("/"))
      )
    );
  }

  // 模板中所有的图片资源
  const imageURLs = analysisAllImageUrl(template, json, origin);

  // 图片地址改成相对路径，放在固定位置，方便配置 nginx
  let images = (
    await Promise.all(
      imageURLs.map((url) =>
        getLocalizationInfoByNetwork(
          url,
          `mfs/files/${url
            .split("/mfs/files/")[1]
            .split("/")
            .slice(0, -1)
            .join("/")}`,
          { responseType: "arraybuffer", withoutError: true }
        )
      )
    )
  ).filter((item) => !!item);

  // 把模板中的图片资源地址替换成本地化后的地址
  imageURLs.forEach((url, index) => {
    const localUrl = images[index]
      ? `/${images[index].path}/${images[index].name}`
      : "";
    template = template.replace(new RegExp(`${url}`, "g"), localUrl);
  });

  return { template, globalDeps, images: images.filter((img) => !!img) };
}

const collectExternal = (
  common,
  comlibs,
  componentModules,
  materialExternalInfos
) => {
  let onlineHtmlStrSet = new Set();
  let htmlStrSet = new Set();
  let pathSet = new Set<string>();
  common.forEach((it) => {
    if (it.path.endsWith(".js")) {
      htmlStrSet.add(`<script src="${it.path}"></script>`);
      pathSet.add(it.path);
    }
    if (it.path.endsWith(".css")) {
      htmlStrSet.add(`<link rel="stylesheet" href="${it.path}"/>`);
      pathSet.add(it.path);
    }
  });

  comlibs.forEach((lib) => {
    if (lib.namespace === "mybricks.normal-pc" && !lib.externals.length) {
      // 兼容，添加默认的externals
      lib.externals = [
        {
          "name": "@ant-design/icons",
          "library": "icons",
          "urls": [
            "public/ant-design-icons@4.7.0.min.js"
          ]
        },
        {
          "name": "moment",
          "library": "moment",
          "urls": [
            "public/moment/moment@2.29.4.min.js",
            "public/moment/locale/zh-cn.min.js"
          ]
        },
        {
          "name": "antd",
          "library": "antd",
          "urls": [
            "public/antd/antd@4.21.6.variable.min.css",
            "public/antd/antd@4.21.6.min.js",
            "public/antd/locale/zh_CN.js"
          ]
        }
      ]
    }
  })

  filterComLibFromComponent(
    (comlibs ?? []).filter(({ id }) => id !== "_myself_"),
    componentModules
  ).forEach((it) => {
    (it.externals ?? []).forEach((it) => {
      let { urls, library, version } = it;
      const mybricksExternal = library ? materialExternalInfos.find(
        (it) => {
          // 有version的话校验version
          return (it.library.toLowerCase() === library!.toLowerCase()) && (version ? it.version === version : true)
        }
      ) : null;
      if (mybricksExternal) {
        urls = mybricksExternal.path;
      }
      if (Array.isArray(urls) && urls.length) {
        urls.forEach((url) => {
          const isHttps = /^http[s]?:/.test(url)
          if (url.endsWith(".js")) {
            if (!isHttps) {
              htmlStrSet.add(`<script src="${url}"></script>`);
              pathSet.add(url);
            } else {
              onlineHtmlStrSet.add(`<script src="${url}"></script>`)
            }
          }
          if (url.endsWith(".css")) {
            if (!isHttps) {
              htmlStrSet.add(`<link rel="stylesheet" href="${url}"/>`);
              pathSet.add(url);
            } else {
              onlineHtmlStrSet.add(`<link rel="stylesheet" href="${url}"/>`)
            }
          }
        });
      }
    });
  });
  return {
    onlineChunkAssets: [...onlineHtmlStrSet].join("\n"),
    chunkAssets: [...htmlStrSet].join("\n"),
    pathArr: [...pathSet],
  }
};

const filterComLibFromComponent = (comLib, componentModules) => {
  return comLib.reduce((pre, cur) => {
    const set = new Set([
      ...(cur.deps ?? []).map((it) => `${it.namespace}@${it.version}`),
    ]);
    for (let i = 0; i < componentModules.length; i++) {
      if (
        !set.size ||
        set.has(
          `${componentModules[i].namespace}@${componentModules[i].version}`
        )
      ) {
        pre.push(cur);
        break;
      }
    }
    return pre;
  }, []);
};