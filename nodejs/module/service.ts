import { Injectable } from '@nestjs/common'

import * as fs from "fs";
import axios from "axios";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { parse } from "url";
import { Blob } from 'buffer'
import { generateComLib } from "./generateComLib";
import { load } from 'cheerio';
const FormData = require("form-data");

@Injectable()
export default class PcPageService {

  async _generateComLibRT(comlibs, json, { domainName, fileId, noThrowError }) {
    /**
       * TODO:
       * 1.目前应用里配置的edit.js 一定有 rt.js
       * 2.物料体系完善后，应该都是按需加载的
       * 3.目前只有匹配到“我的组件”内组件才去物料中心拉组件代码
       */
    let mySelfComMap = {}

    comlibs.forEach((comlib) => {
      if (comlib?.defined && Array.isArray(comlib.comAray)) {
        comlib.comAray.forEach((com) => {
          mySelfComMap[`${com.namespace}@${com.version}`] = true
        })
      }
    })

    const ignoreNamespaces = [
      'mybricks.core-comlib.fn',
      'mybricks.core-comlib.var',
      'mybricks.core-comlib.type-change',
      'mybricks.core-comlib.connector',
      'mybricks.core-comlib.frame-input',
      'mybricks.core-comlib.scenes'
    ];
    const deps = json.scenes
      .reduce((pre, scene) => [...pre, ...scene.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace));
    const selfComponents = deps.filter((item) => mySelfComMap[`${item.namespace}@${item.version}`]);
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
                .catch(error => reject(error));
            });
          })
        );

        comLibContents.unshift({
          comAray: [],
          id: '_myself_',
          title: '我的组件',
          defined: true,
          componentRuntimeMap: {}
        });
        finalComponents.forEach((finalComponent) => {
          const { version, namespace, runtime } = finalComponent;

          if (version && namespace && runtime) {
            comLibContents[0].componentRuntimeMap[namespace + '@' + version] = { version, runtime: encodeURIComponent(runtime) };
          }
        });
      } catch (error) {
        throw Error(error.message || error.msg || '获取我的组件物料信息异常')
      }
    }

    return generateComLib(comLibContents.filter(lib => !!lib.componentRuntimeMap), deps, { comLibId: fileId, noThrowError });
  }

  async publish(req, { json, userId, fileId, envType, commitInfo }) {
    try {

      const publishFilePath = path.resolve(__dirname, './template')

      let template = fs.readFileSync(publishFilePath + '/publish.html', 'utf8')

      const {
        title,
        comlibs,
        projectId,
        fileName,
        folderPath,
        publisherEmail,
        publisherName,
        groupId,
        groupName,
        envList = [],
        appConfig = {}
      } = json.configuration

      Reflect.deleteProperty(json, 'configuration')

      /** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
      const domainName = process.env.NODE_ENV === 'development' ? 'http://localhost:3100' : getRealDomain(req)

      console.info("[publish] domainName is:", domainName);

      const themesStyleStr = this._genThemesStyleStr(json)

      console.info("[publish] getLatestPub begin");

      const latestPub = (await API.File.getLatestPub({
        fileId,
        type: envType
      }))?.[0];

      console.info("[publish] getLatestPub ok-", latestPub);

      const version = getNextVersion(latestPub?.version);

      let comLibRtScript = '';
      let pluginScript = '';
      let needCombo = false;
      let hasOldComLib = false;

      comlibs.forEach(lib => {
        /** 旧组件库，未带组件 runtime 描述文件 */
        if (!lib.coms && !lib.defined) {
          comLibRtScript += `<script src="${lib.rtJs}"></script>`;
          hasOldComLib = true;
        }
      });

      const comlibRtName = `${fileId}-${envType}-${version}.js`
      /** 需要聚合的组件资源 */
      if (comlibs.find(lib => lib?.defined)?.comAray?.length || comlibs.find(lib => lib.componentRuntimeMap)) {
        comLibRtScript += `<script src="./${comlibRtName}"></script>`;
        needCombo = true;
      }

      const customConnectorRuntimeUrl = getCustomConnectorRuntime(appConfig)
      if (customConnectorRuntimeUrl) {
        pluginScript += `<script src="${customConnectorRuntimeUrl}"></script>`;
      }

      template = template.replace(`--title--`, title)
        .replace(`-- plugin-runtime --`, pluginScript)
        .replace(`-- themes-style --`, themesStyleStr)
        .replace(`-- comlib-rt --`, comLibRtScript)
        .replace(`"--projectJson--"`, JSON.stringify(json))
        .replace(`"--executeEnv--"`, JSON.stringify(envType))
        .replace(`"--envList--"`, JSON.stringify(envList))
        .replace(`"--slot-project-id--"`, projectId ? projectId : JSON.stringify(null));

      const needLocalization = await getCustomNeedLocalization();
      // 若平台配置了需要本地化发布
      if(needLocalization) {
        // 将模板中所有公网资源本地化
        template = await resourceLocalization(template, folderPath, envType);
      }

      let comboScriptText = '';
      /** 生成 combo 组件库代码 */
      if (needCombo) {
        comboScriptText = await this._generateComLibRT(comlibs, json, {
          domainName,
          fileId,
          noThrowError: hasOldComLib
        });
      }

      let publishMaterialInfo

      const customPublishApi = await getCustomPublishApi()

      console.info("[publish] getCustomPublishApi=", customPublishApi);

      if (customPublishApi) {

        publishMaterialInfo = await this._customPublish({
          envType,
          fileId,
          title,
          publisherEmail,
          publisherName,
          version,
          commitInfo,
          groupId,
          groupName,
          json,
          template,
          needCombo,
          comboScriptText,
          customPublishApi
        })

      } else {
        console.info("[publish] upload to static server");

        needCombo && await API.Upload.staticServer({
          content: comboScriptText,
          folderPath: `${folderPath}/${envType || 'prod'}`,
          fileName: comlibRtName,
          noHash: true
        })

        publishMaterialInfo = await API.Upload.staticServer({
          content: template,
          folderPath: `${folderPath}/${envType || 'prod'}`,
          fileName,
          noHash: true
        })

        console.info("[publish] upload to static server ok", publishMaterialInfo);

        if (publishMaterialInfo?.url?.startsWith('https')) {
          publishMaterialInfo.url = publishMaterialInfo.url.replace('https', 'http')
        }
      }

      console.info("[publish] API.File.publish: begin ");

      const result = await API.File.publish({
        userId,
        fileId,
        extName: "pc-page",
        commitInfo,
        content: JSON.stringify({ ...publishMaterialInfo, json }),
        type: envType,
      });

      console.info("[publish] API.File.publish: ok ");

      return result
    } catch (e) {
      console.error("pcpage publish error", e);
      throw e
    }
  }

  async _customPublish(params) {
    const {
      envType,
      fileId,
      title,
      publisherEmail,
      publisherName,
      version,
      commitInfo,
      groupId,
      groupName,
      json,
      template,
      needCombo,
      comboScriptText,
      customPublishApi
    } = params

    let permissions = []

    if (json?.permissions) {
      json?.permissions.forEach(item => {
        permissions.push({
          code: item.register.code,
          title: item.register.title,
          remark: item.register.remark,
        })
      })
    }

    const dataForCustom = {
      env: envType,
      productId: fileId,
      productName: title,
      publisherEmail,
      publisherName: publisherName || '',
      version,
      commitInfo,
      type: 'pc-page',
      groupId,
      groupName,
      content: {
        json: JSON.stringify(json),
        html: template,
        js: needCombo ? [{ name: `${fileId}-${envType}-${version}.js`, content: comboScriptText }] : [],
        permissions
      }
    }

    const { code, message, data } = await axios.post(customPublishApi, dataForCustom, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => res.data);

    if (code !== 1) {
      throw new Error(`发布集成接口出错: ${message}`)
    }

    return data
  }

  _genThemesStyleStr(json) {
    let themesStyleStr = ''

    const themes = json?.plugins?.['@mybricks/plugins/theme/use']?.themes

    if (Array.isArray(themes)) {
      themes.forEach(({ namespace, content }) => {
        const variables = content?.variables

        if (Array.isArray(variables)) {
          let styleHtml = ''

          variables.forEach(({ configs }) => {
            if (Array.isArray(configs)) {
              configs.forEach(({ key, value }) => {
                styleHtml = styleHtml + `${key}: ${value};\n`
              })
            }
          })

          styleHtml = `<style id="${namespace}">\n:root {\n${styleHtml}}\n</style>\n`
          themesStyleStr = themesStyleStr + styleHtml
        }
      })
    }

    return themesStyleStr
  }

  async upload(req, { file }, { groupId = '' } = {}) {
    const uploadService = await getUploadService();
    const formData = new FormData();
    formData.append("file", file);
    return await axios<any, { url: string }>({
      url: uploadService,
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        token: req.headers.token,
        session: req.headers.session,
      }
    });
  }
  // 专供模块安装时使用
  // async generateHTML(req, {json, fileId}) {
  // 	const domainServicePath = '/runtime/api/domain/service/run';
  // 	let error = ''

  // 	try {
  // 		let template = fs.readFileSync(path.resolve(__dirname, './template.html'), 'utf8')
  // 		const { title, comlibs, projectId, fileName, folderPath } = json.configuration
  // 		Reflect.deleteProperty(json, 'configuration')

  // 		/** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
  // 		const domainName = process.env.NODE_ENV === 'development' ? 'http://localhost:3100' : getRealDomain(req)

  // 		return {
  // 			code: 1,
  // 			data: template
  // 				.replace(`--RENDER_WEB--`, 'https://f2.eckwai.com/kos/nlav12333/mybricks/render-web/index.min.1.1.46.js')
  // 				.replace(`<!-- comlib-rt -->`, await this._generateComLibRT(comlibs, json, {domainName}))
  // 				.replace(`--title--`, title)
  // 				.replace(`'--projectJson--'`, JSON.stringify(json))
  // 				.replace('--domain-service-path--', domainServicePath)
  // 		};
  // 	} catch (e) {
  // 		console.log('pcpage publish error', e)
  // 		error = e
  // 	}

  // 	if (error) {
  // 		return { code: 0, error };
  // 	}
  // }

}

// 不传groupId表示获取的是全局配置
const getAppConfig = async ({ groupId } = {} as any) => {
  const _NAMESPACE_ = "mybricks-app-pcspa";
  const options = !!groupId ? { type: 'group', id: groupId } : {}
  const res = await API.Setting.getSetting([_NAMESPACE_], options);

  let config = {} as any
  const originConfig = res[_NAMESPACE_]?.config || {}
  try {
    config = typeof originConfig === 'string' ? JSON.parse(originConfig) : originConfig
  } catch (e) {
    console.error("getAppConfig error", e);
  }
  return config
};

// 使用平台设置的上传接口，不使用协作组的
const getUploadService = async () => {
  const { uploadServer = {} } = await getAppConfig()
  const { uploadService } = uploadServer
  if (!uploadService) {
    throw Error("无上传服务，请先配置应用上传服务");
  }
  return uploadService;
};


// 使用平台设置的集成接口，不使用协作组的
const getCustomPublishApi = async () => {
  const { publishApiConfig = {} } = await getAppConfig()
  const { publishApi } = publishApiConfig
  if (!publishApi) {
    console.warn(`未配置发布集成接口`)
  }
  return publishApi;
}

/** 
 * 获取平台设置的「是否本地化发布」
 * TODO: 字段暂时未知，先用 “needLocalization” 顶着
 */
const getCustomNeedLocalization = async () => {
  const { needLocalization } = await getAppConfig()
  return !!needLocalization;
}

// -- plugin-runtime --
const getCustomConnectorRuntime = (appConfig) => {
  const { plugins = [] } = appConfig
  const connectorPlugin = plugins.find(item => item?.type === 'connector')
  if (!connectorPlugin) {
    return ''
  }
  if (!connectorPlugin.runtimeUrl) {
    console.error(`插件【${connectorPlugin}】没有设置runtime地址`)
    return ''
  }
  return connectorPlugin.runtimeUrl
}

const uploadStatic = async (
  content: string,
  groupId: string,
  manateeUserInfo: { token: string; session: string }
): Promise<{ url: string }> => {
  // @ts-ignore
  const blob = new Blob([content], { type: "text/html" });
  const uploadService = await getUploadService();
  // const uploadService = "http://dev.manateeai.com/biz/uploadExternalFileLocal";
  const formData = new FormData();
  formData.append("file", blob);
  const { url } = await axios<any, { url: string }>({
    url: uploadService,
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      ...manateeUserInfo,
      token: "b373dbe105f94c5308a38290afab97d8",
      session: "d79136092b16fea8b2aa0e9189139021",
    },
  });
  const { host, protocol } = parse(
    uploadService
  );
  const domain = `${protocol}//${host}`;
  return { url: `${domain}${url}` };
};

function getRealHostName(requestHeaders) {
  let hostName = requestHeaders.host
  if (requestHeaders['x-forwarded-host']) {
    hostName = requestHeaders['x-forwarded-host']
  } else if (requestHeaders['x-host']) {
    hostName = requestHeaders['x-host'].replace(':443', '')
  }
  return hostName
}

/** 有问题找zouyongsheng */
function getRealDomain(request) {
  let hostName = getRealHostName(request.headers);
  const { origin } = request.headers
  if (origin) return origin
  // let protocol = request.headers['x-scheme'] ? 'https' : 'http'
  /** TODO: 暂时写死 https */
  // let protocol = 'https';
  let protocol = request.headers?.['connection'].toLowerCase() === 'upgrade' ? 'https' : 'http'
  let domain = `${protocol}:\/\/${hostName}`
  return domain
}

function getNextVersion(version, max = 100) {
  if (!version) return "1.0.0";
  const vAry = version.split(".");
  let carry = false;
  const isMaster = vAry.length === 3;
  if (!isMaster) {
    max = -1;
  }

  for (let i = vAry.length - 1; i >= 0; i--) {
    const res = Number(vAry[i]) + 1;
    if (i === 0) {
      vAry[i] = res;
    } else {
      if (res === max) {
        vAry[i] = 0;
        carry = true;
      } else {
        vAry[i] = res;
        carry = false;
      }
    }
    if (!carry) break;
  }

  return vAry.join(".");
}

/**
 * 将 HTML 中的所有公网资源本地化
 * @param template HTML 模板
 */
async function resourceLocalization(template: string, folderPath: string, envType: string){
  const $ = load(template);
  
  // 所有的远程资源都在模板中写有，间接依赖的公网资源由依赖自身处理
  const resourceSrcList = [...$("script").map((_, el) => $(el).attr('src'))]
                  .concat([...$("link").map((_, el) => $(el).attr('href'))])
                  // 筛选出所有公网资源地址
                  .filter((url: string) => !!url && !url.startsWith('./'));

  const promiseList = []
  resourceSrcList.forEach(src=>{
    promiseList.push(localization(src, folderPath, envType));
  })

  // 将远程资源本地化
  const localSrcList = await Promise.all(promiseList);

  // 把模板中的远程资源地址替换成本地化后的地址
  resourceSrcList.forEach((src, index) => {
    const localSrc = localSrcList[index];
    template = template.replace(new RegExp(`${src}`,'g'),localSrc);
  })

  return template;
}

/**
 * 远程资源本地化
 * TODO: 获取资源的方式根据后续方案调整（内网环境可能需要将 url 映射为对应的 nginx 地址）
 * @param url 资源地址
 * @returns 本地化后的资源地址
 */
async function localization(url: string, folderPath: string, envType: string) {
  const { data: content } = await axios({ method: "get", url, timeout: 30 * 1000 });

  // FIXME: 上传服务返回值未知，先用 any 顶着
  const publishMaterialInfo = (await API.Upload.staticServer({
    content,
    folderPath: `${folderPath}/${envType || "prod"}`,
    fileName: url.split("/").slice(-1)[0],
    noHash: true,
  })) as any;

  return publishMaterialInfo.url;
}
