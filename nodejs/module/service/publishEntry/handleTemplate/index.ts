import { Logger } from "@mybricks/rocker-commons";
import { transform } from "./transform";
import { TProcessor } from "../type";

const DEFAULT_META = [
  {
    type: 'name',
    key: 'viewport',
    content: 'width=device-width, initial-scale=1.0'
  },
  {
    type: 'name',
    key: 'referrer',
    content: 'no-referrer'
  },
  {
    type: 'http-equiv',
    key: 'X-UA-Compatible',
    content: 'IE=edge'
  },
  {
    type: 'http-equiv',
    key: 'Access-Control-Allow-Origin',
    content: '*'
  },
]


const handleTemplate: TProcessor = async (ctx) => {
  const themesStyleStr = genThemesStyleStr(ctx.json);

  let comLibRtScript = "";
  let needCombo = false;
  let hasOldComLib = false;
  //语言包
  let localeScript = "";
  const { fileId, envType, json, version, configuration } = ctx
  const { projectId, comlibs, title, envList, i18nLangContent, runtimeUploadService, pageHeader } = configuration || {}

  comlibs.forEach((lib) => {
    /** 旧组件库，未带组件 runtime 描述文件 */
    if (lib.legacy) {
      comLibRtScript += `<script src="${lib.rtJs}"></script>`;
      hasOldComLib = true;
    }
  });

  const comlibRtName = `${fileId}-${envType}-${version}.js`;
  /** 需要聚合的组件资源 */
  if (
    comlibs.find((lib) => lib?.defined)?.comAray?.length ||
    comlibs.find((lib) => lib.componentRuntimeMap || !lib.legacy)
  ) {
    comLibRtScript += `<script src="./${comlibRtName}"></script>`;
    needCombo = true;
  }

  let domainServicePath = '/api/system/domain/run';
  if (projectId) {
    // 项目下发布prod环境发布才调用线上接口，否则都是测试接口
    if (envType === 'prod') {
      domainServicePath = '/runtime/api/domain/service/run';
    }
  }

  let antdLocale = ''
  if (Array.isArray(configuration?.appConfig?.localeConfig?.antdLocaleLinks) && configuration?.appConfig?.localeConfig?.antdLocaleLinks.length > 0) {
    antdLocale = configuration?.appConfig?.localeConfig?.antdLocaleLinks.map(item => `<script src="${item}"></script>`).join('\n')
  }

  //语言包资源, 可以按需添加其他语言
  // localeScript += `<script src="https://f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/locale/zh_CN.js"></script>`;

  Logger.info("[publish] 开始模板替换");

  let metaInfo = '';

  const metaList = pageHeader.meta || [];

  DEFAULT_META.forEach(meta => {
    if (!metaList.find(m => m.type === meta.type && m.key === meta.key)) {
      metaList.push(meta);
    }
  });
  metaList.forEach(meta => {
    if (meta.key && meta.content) {
      metaInfo += `
            <meta ${meta.type}="${meta.key}" content="${meta.content}" />`
    }
  });

  ctx.template = ctx.template
    .replace(`--title--`, pageHeader.title?.zh_CN || pageHeader.title)
    .replace(`"--title-i18n--"`, JSON.stringify(pageHeader.title))
    .replace(`--favicon--`, `<link rel="icon" href="${pageHeader.favicon}" type="image/x-icon"/>`)
    .replace(`--meta--`, metaInfo)
    .replace(`-- themes-style --`, themesStyleStr)
    .replace(`-- comlib-rt --`, comLibRtScript)
    .replace(`"--projectJson--"`, JSON.stringify(transform(json)))
    .replace(`"--executeEnv--"`, JSON.stringify(envType))
    .replace(`-- antd-locale --`, antdLocale)
    .replace(`"--locale-config--"`, JSON.stringify(configuration?.appConfig?.localeConfig || {}))
    .replace(`"--envList--"`, JSON.stringify(envList))
    .replace(`"--i18nLangContent--"`, JSON.stringify(i18nLangContent))
    .replace(`"--runtimeUploadService--"`, JSON.stringify(runtimeUploadService))
    .replace(
      `"--slot-project-id--"`,
      projectId ? projectId : JSON.stringify(null)
    )
    .replace(`--localeScript--`, JSON.stringify(localeScript))
    .replace(`--domain-service-path--`, domainServicePath);

  Logger.info("[publish] 模板替换完成");

  ctx.needCombo = needCombo
  ctx.hasOldComLib = hasOldComLib
  ctx.comlibRtName = comlibRtName

}

export default handleTemplate

function genThemesStyleStr(json) {
  let themesStyleStr = "";

  const themes = json?.plugins?.["@mybricks/plugins/theme/use"]?.themes;

  if (Array.isArray(themes)) {
    themes.forEach(({ namespace, content }) => {
      const variables = content?.variables;

      if (Array.isArray(variables)) {
        let styleHtml = "";

        variables.forEach(({ configs }) => {
          if (Array.isArray(configs)) {
            configs.forEach(({ key, value }) => {
              styleHtml = styleHtml + `${key}: ${value};\n`;
            });
          }
        });

        styleHtml = `<style id="${namespace}">\n:root {\n${styleHtml}}\n</style>\n`;
        themesStyleStr = themesStyleStr + styleHtml;
      }
    });
  }

  return themesStyleStr;
}
