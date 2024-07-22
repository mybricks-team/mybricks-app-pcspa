import * as fs from "fs";
import * as path from "path";
import { Logger } from "@mybricks/rocker-commons";
import API from "@mybricks/sdk-for-app/api";

import { genTemplateForVue, genTemplateForVueIndex, genTemplateForVueReadme } from './genTemplateForVue'
import { genConfig } from './genConfig'
import { Scene, ToJSON } from "./type";

import * as prettier from 'prettier';
import * as prettierPluginVue from 'prettier-plugin-vue'
import { genTemplateForReact, genTemplateForReactReadme } from "./genTemplateForReact";
import { extractCodeFn } from "./tools/extractCodeFn";
import resourceProcessing from "./resource-processing";
import { genComponents } from "./genComponents";
import { getStyleInnerHtml } from "@mybricks/render-utils";

const comlibModuleMap: Record<string, string> = {
  'mybricks.normal-pc': '@mybricks/comlib-pc-normal',
  'mybricks.basic-comlib': '@mybricks/comlib-basic',
}

// 获取指定组件库内的组件信息
const getComlibContent = async (comlib: { namespace: string, version: string }): Promise<string[]> => {
  // 排除不支持的组件库
  if (!comlibModuleMap[comlib.namespace]) {
    Logger.error(`can not find node module for comlib ${comlib.namespace}@${comlib.version}`)
    return []
    // throw new Error(`can not find node module for comlib ${comlib.namespace}`)
  }
  const res = await API.Material.getMaterialContent({
    namespace: comlib.namespace,
    version: comlib.version,
  })
    .then((data) => {
      const { namespace, version } = data;
      const deps = data.react.deps
      // console.log(`获取 ${namespace}@${version} 成功`, data.react.deps);
      return deps.map((item: any) => item.namespace)
    })
    .catch((err) => {
      Logger.error(`getComlibContent fail 获取 ${comlib.namespace}@${comlib.version} 失败`, err)
      return undefined;
    });
  return res
}

function convertToUnderscore(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getComponentName({ namespace, rtType }: { namespace: string, rtType: string }) {
  const lastIndex = namespace.lastIndexOf('.');
  return convertToUnderscore((lastIndex !== -1 ? namespace.substring(lastIndex + 1) : namespace)).split('_').filter((str) => str).reduce((p, c, index) => {
    return p + (rtType?.match(/^js/gi) ? (index ? capitalizeFirstLetter(c) : c) : capitalizeFirstLetter(c));
  }, "");
}


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
    'mybricks.core-comlib.group',
    'mybricks.core-comlib.selection'
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

  let deps: { namespace: string, version: string, rtType?: string }[] = [
    ...(Array.isArray(json.scenes) ? json.scenes : [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [] as Scene['deps'])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(json.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [] as Scene['deps'])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ];

  let res: any[] = []
  for (let dep of deps) {
    if (!res.find(item => item.namespace === dep.namespace)) {
      res.push(dep)
    }
  }
  return res
}

const collectModuleCom = (coms: any, comlibDeps: any[]) => {
  const res = {} as Record<string, any>
  const newComDefs: any = []

  coms.forEach((com: any) => {
    const comlib = comlibDeps.find(comlib => comlib.deps.some((dep: any) => dep === com.namespace))
    if (!comlib) {
      throw new Error(`can not find comlib module for com ${com.namespace}`)
    }
    const module = comlibModuleMap[comlib.namespace]
    if (!res[module]) {
      res[module] = []
    }
    const componentName = getComponentName({ namespace: com.namespace, rtType: com.rtType })

    res[module].push(componentName)

    newComDefs.push({
      ...com,
      namespace: com.namespace,
      runtimeName: componentName,
      libraryName: module
    })
  })

  return {
    importInfo: res,
    newComDefs
  }
}

/** 解析主题插件 */
const getThemesInnerHtml = (toJSON) => {
  let innerHTML = '';
  const themes = toJSON.plugins?.['@mybricks/plugins/theme/use']?.themes
  if (Array.isArray(themes)) {
    themes.forEach(({ content }) => {
      const variables = content?.variables

      if (Array.isArray(variables)) {
        let rootHTML = ''

        variables.forEach(({ configs }) => {
          if (Array.isArray(configs)) {
            configs.forEach(({ key, value }) => {
              rootHTML = rootHTML + `${key}: ${value};\n`
            })
          }
        })

        innerHTML = innerHTML + `:root {\n${rootHTML}}`
      }
    })
    Reflect.deleteProperty(toJSON.plugins, "@mybricks/plugins/theme/use")
  }

  return innerHTML
}

export default async function publishToCom(params: {
  json: ToJSON & { configuration: any };
  userId: string;
  fileId: number;
  componentName: string;
  envType: string;
  hostname: string;
  toLocalType: string;
  origin: string;
  staticResourceToCDN: boolean;
}) {
  const { json, userId, fileId, componentName, envType, hostname, toLocalType, origin, staticResourceToCDN } = params
  const scene = json.scenes?.[0] || json;
  if (scene.inputs.length !== (new Set(scene.inputs.map(item => item.id))).size) {
    throw new Error('输入项id重复')
  }
  if (scene.outputs.length !== (new Set(scene.outputs.map(item => item.id))).size) {
    throw new Error('输出项id重复')
  }

  let curTemplate = ''
  let sourceLink = ''

  Logger.info(`[publishToCom] 当前 NODE_ENV：${process.env.NODE_ENV}`)
  Logger.info(`[publishToCom] 当前 hostname：${hostname}`)

  if (process.env.NODE_ENV === 'development') {
    sourceLink = `http://localhost:8080/?id=${fileId}`
  } else {
    sourceLink = `${hostname}/mybricks-app-pc-cdm/index.html?id=${fileId}`
  }

  const {
    envList = [],
    i18nLangContent,
    comLibs,
  } = json.configuration;

  Reflect.deleteProperty(json, "configuration");

  const comDeps = getComDeps(json)
  let comDefs = ''
  let comImportsVueStr = ''
  let comImportsReactStr = ''
  /** 通过namespace查询组件信息 */
  let namespaceToComDefs: any = {}

  Logger.info('getComDeps')

  const comlibDeps = await Promise.all(comLibs.map(async (item: any) => {
    const { namespace } = item
    const res = await getComlibContent(item)
    return {
      namespace,
      deps: res
    }
  }))
  const { importInfo, newComDefs } = collectModuleCom(comDeps, comlibDeps)

  newComDefs.forEach((item: any, index: number) => {
    namespaceToComDefs[item.namespace] = item;
    // const comName = getComponentName({ namespace: item.namespace, rtType: item.rtType })

    // if (index === (newComDefs.length - 1)) {
    //   // coms += ` ${comName} `
    //   comDefs += `'${item.namespace}': { runtimeName: '${item.runtimeName}', libraryName: '${item.libraryName}' }`
    // } else {
    //   // coms += ` ${comName},`
    //   comDefs += `'${item.namespace}': { runtimeName: '${item.runtimeName}', libraryName: '${item.libraryName}' },` + '\n'
    // }
    comImportsVueStr += `import ${item.runtimeName} from "${item.libraryName}/es/${item.runtimeName}"` + '\n'
    if (!item.rtType) {
      // 仅需要导出ui组件
      comImportsReactStr += `${item.runtimeName},`
    }

    if (index === (comDeps.length - 1)) {
      comDefs += `'${item.namespace}': ${item.runtimeName}`
    } else {
      comDefs += `'${item.namespace}': ${item.runtimeName},` + '\n'
    }
  })

  Logger.info(`[publishToCom] 当前 sourceLink：${sourceLink}`)

  // const transformJson = transform(json)
  const { transformJson, extractFns } = extractCodeFn(json)

  Logger.info(`[publishToCom] 开始替换组件导入模板中的变量...`)
  let componentsTemplate = await genComponents(json, comLibs);
  Logger.info(`[publishToCom] 替换组件导入模板中的变量完成`)

  Logger.info(`[publishToCom] 开始替换组件模板中的变量...`)
  if (toLocalType === 'vue') {
    curTemplate = genTemplateForVue({
      json,
      transformJson,
      envType,
      envList,
      i18nLangContent,
      comImportsStr: comImportsVueStr,
      comDefs,
      sourceLink
    })
  } else {
    curTemplate = genTemplateForReact({
      comDefs, comImportsStr: comImportsReactStr, componentName, toJSON: transformJson, namespaceToComDefs
    })
  }
  Logger.info(`[publishToCom] 替换组件模板中的变量完成`)

  Logger.info(`[publishToCom] 开始处理所有的静态资源...`)
  // 获取所有静态资源
  const staticResources = await resourceProcessing(json, { toCDN: staticResourceToCDN, origin })
  Logger.info(`[publishToCom] 处理所有的静态资源完成`)

  Logger.info(`[publishToCom] 开始替换config模板中的变量...`)
  const genConfigProps = {
    sourceLink,
    toJSON: transformJson,
    extractFns: extractFns,
    envType,
    envList,
    i18nLangContent,
    staticResources,
    importStr: "",
    exportStr: "",
    styleStr: "",
  }
  if (toLocalType === 'vue') {

  } else {
    genConfigProps.importStr = `import { Component } from '@mybricks/renderer-pc';${componentsTemplate.importComponentsStr}`;
    genConfigProps.exportStr = `export const comDefs = {${componentsTemplate.componentsMapStr}};${componentsTemplate.componentsExportStr}`;
    genConfigProps.styleStr = `const styleTag = document.createElement('style')
    styleTag.id = "${fileId}";
    styleTag.innerHTML = \`${getThemesInnerHtml(transformJson)}
    ${
      // @ts-ignore
      await prettier.format(getStyleInnerHtml(transformJson), {
        parser: 'css',      // 使用babel-ts解析器，支持TSX格式
        semi: true,         // 在语句末尾添加分号
        singleQuote: true,  // 使用单引号
        tabWidth: 2         // 缩进宽度
      })}\`
    document.head.appendChild(styleTag)
    `;
  }
  let configTemplate = genConfig(genConfigProps)
  Logger.info(`[publishToCom] 替换config模板中的变量完成`)

  let vueIndexTemplate = '';
  if (toLocalType === 'vue') {
    Logger.info(`[publishToCom] 开始替换vue-index模板中的变量...`)
    vueIndexTemplate = genTemplateForVueIndex({ componentName })
    Logger.info(`[publishToCom] 替换vue-index模板中的变量完成`)
  }

  Logger.info(`[publishToCom] 开始替换README模板中的变量...`)
  let readmeTemplate = '';
  if (toLocalType === 'vue') { readmeTemplate = genTemplateForVueReadme({ componentName, sourceLink }) }
  else { readmeTemplate = genTemplateForReactReadme({ componentName, sourceLink }) }
  Logger.info(`[publishToCom] 替换README模板中的变量完成`)

  Logger.info(`[publishToCom] 开始格式化代码...`);

  if (toLocalType === 'vue') {
    // 使用 prettier 格式化 Vue 代码字符串
    curTemplate = await prettier.format(curTemplate, {
      parser: 'vue',         // 使用vue解析器
      plugins: [prettierPluginVue],  // 加载prettier-plugin-vue插件
      semi: true,            // 在语句末尾添加分号
      singleQuote: true,     // 使用单引号
      tabWidth: 2            // 缩进宽度
    });
  }
  else {
    // 使用 prettier 格式化TSX代码字符串
    curTemplate = await prettier.format(curTemplate, {
      parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
      semi: true,         // 在语句末尾添加分号
      singleQuote: true,  // 使用单引号
      tabWidth: 2         // 缩进宽度
    });
  }

  // 使用 prettier 格式化 config
  configTemplate = await prettier.format(configTemplate, {
    parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
    semi: true,         // 在语句末尾添加分号
    singleQuote: true,  // 使用单引号
    tabWidth: 2         // 缩进宽度
  });

  Logger.info(`[publishToCom] 格式化代码完成`);

  Logger.info('[publishToCom] replace template success')

  return {
    index: curTemplate,
    vueIndex: vueIndexTemplate,
    config: configTemplate,
    readme: readmeTemplate,
    staticResources: staticResources,
  }
}