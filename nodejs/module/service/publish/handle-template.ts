import { Logger } from "@mybricks/rocker-commons";
import { transform } from "../../transform";

export async function handleTemplate({
  json,
  template,
  fileId,
  envType,
  comlibs,
  title,
  envList,
  projectId,
  version,
  i18nLangContent
}) {
  const themesStyleStr = genThemesStyleStr(json);

  let comLibRtScript = "";
  let needCombo = false;
  let hasOldComLib = false;
  //语言包
  let localeScript = "";

  comlibs.forEach((lib) => {
    /** 旧组件库，未带组件 runtime 描述文件 */
    if (!lib.coms && !lib.defined) {
      //comLibRtScript += `<script src="${lib.rtJs}"></script>`;
      //发布时，目前替换成本地组件库
      comLibRtScript += `<script src="https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.3.99/2023-11-07_21-26-42/rt.js"></script>`;
      hasOldComLib = true;
    }
  });

  const comlibRtName = `${fileId}-${envType}-${version}.js`;
  /** 需要聚合的组件资源 */
  if (
    comlibs.find((lib) => lib?.defined)?.comAray?.length ||
    comlibs.find((lib) => lib.componentRuntimeMap)
  ) {
    //comLibRtScript += `<script src="./${comlibRtName}"></script>`;
    //发布时，目前替换成了本地组件库
    comLibRtScript += `<script src="https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.3.99/2023-11-07_21-26-42/rt.js"></script>`;
    needCombo = true;
  }

  //if(navigator.language === 'zh-CN'){
    //语言包资源
    localeScript += `<script src="https://f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/locale/zh_CN.js"></script>`; 
  // }else{
    
  // }

  Logger.info("[publish] 开始模板替换");

  template = template
    .replace(`--title--`, title)
    .replace(`-- themes-style --`, themesStyleStr)
    .replace(`-- comlib-rt --`, comLibRtScript)
    .replace(`"--projectJson--"`, JSON.stringify(transform(json)))
    .replace(`"--executeEnv--"`, JSON.stringify(envType))
    .replace(`"--envList--"`, JSON.stringify(envList))
    .replace(`"--i18nLangContent--"`, JSON.stringify(i18nLangContent))
    .replace(
      `"--slot-project-id--"`,
      projectId ? projectId : JSON.stringify(null)
    )
    .replace(`"--localeScript--"`, JSON.stringify(localeScript));

  Logger.info("[publish] 模板替换完成");

  return { template, needCombo, hasOldComLib, comlibRtName };
}

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
