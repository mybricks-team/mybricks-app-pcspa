import { Injectable } from '@nestjs/common'
import * as fs from "fs";
import axios from "axios";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { parse } from "url";
import { Blob } from 'buffer'
import { generateComLib } from "../generateComLib";
import { transform } from '../transform'
const FormData = require("form-data");
import { Logger } from '@mybricks/rocker-commons';
import LocalPublic from './local-public';
import { APPType } from '../types'
import { analysisAllUrl, getNextVersion, getRealDomain } from '../tools/analysis';
import { getCustomConnectorRuntime, getCustomNeedLocalization, getCustomPublishApi, getUploadService } from '../tools/get-app-config';
import { ILocalizationInfo } from '../interface';
import { getLocalizationInfoByLocal, getLocalizationInfoByNetwork } from '../tools/localization';
import { compressJsonObjectToZip } from '../tools/zip';
import { getAppTypeFromTemplate } from '../tools/common';
const pkg = require('../../package.json')

let app_type;

@Injectable()
export default class PcPageService {

  async _generateComLibRT(comlibs, json, { domainName, fileId, noThrowError, app_type }) {
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
      'mybricks.core-comlib.frame-output',
      'mybricks.core-comlib.scenes'
    ];
    const deps = [
      ...(json.scenes || [])
        .reduce((pre, scene) => [...pre, ...scene.deps], [])
        .filter((item) => !ignoreNamespaces.includes(item.namespace)),
      ...(json.global?.fxFrames || [])
        .reduce((pre, fx) => [...pre, ...fx.deps], [])
        .filter((item) => !ignoreNamespaces.includes(item.namespace))
    ];
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
        finalComponents.forEach((finalComponent: any) => {
          const { version, namespace, runtime } = finalComponent;

          if (version && namespace && runtime) {
            comLibContents[0].componentRuntimeMap[namespace + '@' + version] = { version, runtime: encodeURIComponent(runtime) };
          }
        });
      } catch (error) {
        throw Error(error.message || error.msg || '获取我的组件物料信息异常')
      }
    }

    return generateComLib(comLibContents.filter(lib => !!lib.componentRuntimeMap), deps, { comLibId: fileId, noThrowError, appType: app_type });
  }

  async publish(req, { json, userId, fileId, envType, commitInfo }) {
    try {

      const publishFilePath = path.resolve(__dirname, '../../../assets')

      let template = fs.readFileSync(publishFilePath + '/publish.html', 'utf8')

      app_type = getAppTypeFromTemplate(template);
      Logger.info(`[publish] app_type: ${app_type}`)
      Logger.info(template)
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

      Logger.info(`[publish] domainName is: ${domainName}`);

      const themesStyleStr = this._genThemesStyleStr(json)

      Logger.info("[publish] getLatestPub begin");

      const latestPub = (await API.File.getLatestPub({
        fileId,
        type: envType
      }))?.[0];

      Logger.info(`[publish] getLatestPub ok`);

      const version = getNextVersion(latestPub?.version);

      let comLibRtScript = '';
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

      Logger.info("[publish] 开始模板替换");

      template = template.replace(`--title--`, title)
        .replace(`-- themes-style --`, themesStyleStr)
        .replace(`-- comlib-rt --`, comLibRtScript)
        .replace(`"--projectJson--"`, JSON.stringify(transform(json)))
        .replace(`"--executeEnv--"`, JSON.stringify(envType))
        .replace(`"--envList--"`, JSON.stringify(envList))
        .replace(`"--slot-project-id--"`, projectId ? projectId : JSON.stringify(null));

      Logger.info("[publish] 模板替换完成");

      /** 是否本地化发布 */
      const needLocalization = await getCustomNeedLocalization();

      /** 所有要本地化的公共依赖 */
      let globalDeps: ILocalizationInfo[] = [];
      /** 所有要本地化的图片 */
      let images: ILocalizationInfo[];

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
            "public/comlibs/7182_1.0.29/2023-07-25_22-04-55/rt.js"
          ].map((url) =>
            getLocalizationInfoByLocal(url, url.split("/").slice(0, -1).join("/"))
          )
        );
        globalDeps = globalDeps.concat(localizationComLibInfoList);
      } catch (e) {
        Logger.error(`[publish] 组件库本地化失败！ ${JSON.stringify(e)}`);
        throw e;
      }

      try {
        Logger.info("[publish] 正在尝试 plugin-runtime 本地化...");
        const customConnectorRuntimeUrl = getCustomConnectorRuntime(appConfig, req);
        if (customConnectorRuntimeUrl) {
          const info = await getLocalizationInfoByNetwork(customConnectorRuntimeUrl, 'public/plugins');
          globalDeps = globalDeps.concat(info)
          template = template.replace("-- plugin-runtime --", `<script src="${info.path}/${info.name}" ></script>`);
        } else {
          template = template.replace("-- plugin-runtime --", '');
        }
      } catch (e) {
        Logger.error(`[publish] plugin-runtime 本地化失败: ${JSON.stringify(e)}`);
        throw e;
      }

      try {
        Logger.info("[publish] 正在尝试资源本地化...")
        // 将模板中所有资源本地化
        const { globalDeps: _globalDeps, images: _images, template: _template } = await resourceLocalization(template, needLocalization, app_type);
        globalDeps = globalDeps.concat(_globalDeps || []);
        images = _images;
        template = _template;
        Logger.info("[publish] 资源本地化成功！")
      }
      catch (e) {
        Logger.error(`[publish] 资源本地化失败: ${JSON.stringify(e)}`);
        throw new Error('资源本地化失败！');
      }

      let comboScriptText = '';
      /** 生成 combo 组件库代码 */
      if (needCombo) {
        comboScriptText = await this._generateComLibRT(comlibs, json, {
          domainName,
          fileId,
          noThrowError: hasOldComLib,
          app_type
        });
      }

      /** 推送数据 */
      const result = await publishPush({
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
        images,
        globalDeps,
        folderPath,
        domainName,
        comlibRtName,
        fileName,
        userId
      }, true);

      // TODO: 待优化，直接保存 JSON 太大了，想办法拆一下
      /** 保存回滚数据 */
      saveRollbackData(fileId, version, envType, {
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
        images,
        globalDeps,
        folderPath,
        domainName,
        comlibRtName,
        fileName,
        userId
      });

      return result
    } catch (e) {
      Logger.error("[publish] pcpage publish error", e);
      throw e
    }
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
}

/**
 * 推送发布内容到目标机器
 */
export async function publishPush(params, needPublishFile: boolean) {
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
    images,
    globalDeps,
    folderPath,
    domainName,
    comlibRtName,
    fileName,
    userId
  } = params;

  let publishMaterialInfo

  const customPublishApi = await getCustomPublishApi()

  Logger.info(`[publish] getCustomPublishApi = ${customPublishApi}`);

  if (customPublishApi) {
    Logger.info("[publish] 有配置发布集成接口，尝试向发布集成接口推送数据...");

    try {
      publishMaterialInfo = await customPublish({
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
        customPublishApi,
        images: images.map(({ content, name, path }) => ({ content, path: `/${path}/${name}` })),
        globalDeps: globalDeps?.map(({ content, name, path }) => ({ content, path: `${path}/${name}` })),
      })
    }
    catch (e) {
      Logger.error(`[publish] 推送数据失败: ${JSON.stringify(e, null, 2)}`);
      throw e;
    }

    Logger.info("[publish] 推送数据成功！");

    if (!publishMaterialInfo?.url) {
      const errStr = `[publish] 发布集成接口出错: 没有返回url`;
      Logger.error(errStr);
      throw new Error(errStr)
    } else if (typeof publishMaterialInfo?.url !== 'string' || !publishMaterialInfo?.url?.startsWith('http')) {
      const errStr = `[publish] 发布集成返回的url格式不正确 url: ${publishMaterialInfo?.url}`;
      Logger.error(errStr);
      throw new Error(errStr)
    }

  } else {
    Logger.info("[publish] 未配置发布集成接口，尝试向静态服务推送数据...");

    try {
      if (globalDeps) {
        Logger.info("[publish] 正在尝试上传公共依赖...");
        // 将所有的公共依赖上传到对应位置
        await Promise.all(globalDeps.map(({ content, path, name }) => {
          return API.Upload.staticServer({
            content,
            folderPath: `${folderPath}/${envType || 'prod'}/${path}`,
            fileName: name,
            noHash: true,
            domainName
          })
        }))
        Logger.info("[publish] 公共依赖上传成功！");
      }

      if (needCombo) {
        Logger.info("[publish] 正在尝试上传 needCombo...");
        await API.Upload.staticServer({
          content: comboScriptText,
          folderPath: `${folderPath}/${envType || 'prod'}`,
          fileName: comlibRtName,
          noHash: true,
          domainName
        })
        Logger.info("[publish] needCombo 上传成功！");
      }


      Logger.info("[publish] 正在尝试上传 template...");
      publishMaterialInfo = await API.Upload.staticServer({
        content: template,
        folderPath: `${folderPath}/${envType || 'prod'}`,
        fileName,
        noHash: true,
        domainName
      })
      Logger.info(`[publish] template 上传成功！地址：${publishMaterialInfo.url}`);

      if (publishMaterialInfo?.url?.startsWith('https')) {
        publishMaterialInfo.url = publishMaterialInfo.url.replace('https', 'http')
      }

      Logger.info(`[publish] 向静态服务推送数据成功！ ${JSON.stringify(publishMaterialInfo, null, 2)}`);
    }
    catch (e) {
      Logger.error("[publish] 向静态服务推送数据失败！");
      throw new Error("向静态服务推送数据失败！");
    }
  }

  if(needPublishFile) {
    Logger.info("[publish] API.File.publish: begin ");

    const result = await API.File.publish({
      userId,
      fileId,
      extName: "pc-page",
      commitInfo,
      content: JSON.stringify({ ...publishMaterialInfo, json }),
      type: envType,
    });
  
    Logger.info("[publish] API.File.publish: ok ");

    return result;
  }
}

/**
 * 保存回滚数据
 */
async function saveRollbackData(
  fileId: number,
  version: string,
  type: string,
  data: Record<string, unknown>
) {
  try {
    Logger.info("[publish] 正在保存回滚数据...");

    const content = await compressJsonObjectToZip(data);

    Logger.info(
      `[publish] 保存回滚数据部分参数: ${JSON.stringify({
        fileId,
        version,
        type,
      })}`
    );

    await API.Upload.saveProducts({
      fileId,
      version,
      type,
      content,
    });

    Logger.info("[publish] 保存回滚数据成功！");
  } catch (e) {
    Logger.error(`[publish] 保存回滚数据失败！ ${JSON.stringify(e, null, 2)}`);
  }
}

/**
 * 通过发布集成推送数据
 */
async function customPublish(params) {
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
    customPublishApi,
    images,
    globalDeps
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
      permissions,
      images,
      globalDeps
    }
  }

  const { code, message, data } = await axios.post(customPublishApi, dataForCustom, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.data)
    .catch(e => {
      Logger.error(`[publish] 发布集成接口出错: ${e.message}`, e);
      throw new Error(`发布集成接口出错: ${e.message}`)
    });
  if (code !== 1) {
      Logger.error(`[publish] 发布集成接口出错: ${message}`);
      throw new Error(`发布集成接口出错: ${message}`)
  }

  return data
}

/**
 * 将 HTML 中的公网资源本地化
 * @param template HTML 模板
 * @param needLocalization CDN 资源是否需要本地化
 */
async function resourceLocalization(template: string, needLocalization: boolean, type = 'react') {
  const localPublicInfos = LocalPublic[type].map(info => {
    if (!needLocalization) {
      info.path = info.CDN;
    }
    return info;
  });

  const publicHtmlStr = localPublicInfos.reduce((pre, cur) => {
    switch (cur.tag) {
      case "link":
        pre += `<link rel="stylesheet" href="${cur.path}" />`
        break;
      case "script":
        pre += `<script src="${cur.path}"></script>`
        break;
    }
    return pre;
  }, "")

  template = template.replace("-- public --", publicHtmlStr);

  let globalDeps: ILocalizationInfo[] = null;
  if (needLocalization) {
    // 获取所有本地化需要除了图片以外的信息，这些信息目前存储在相对位置
    globalDeps = await Promise.all(localPublicInfos.map(info => getLocalizationInfoByLocal(info.path, info.path.split('/').slice(0, -1).join('/'))));
  }

  // 模板中所有的图片资源
  const imageURLs = [...new Set(analysisAllUrl(template).filter(url => url.includes('/mfs/files/')))];

  // 图片放在固定位置，方便配置 nginx
  let images = await Promise.all(
    imageURLs.map(
      (url) =>
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
  );

  // 把模板中的图片资源地址替换成本地化后的地址
  imageURLs.forEach((url, index) => {
    const localUrl = images[index] ? `/${images[index].path}/${images[index].name}` : '';
    template = template.replace(new RegExp(`${url}`, 'g'), localUrl);
  })

  return { template, globalDeps, images: images.filter(img => !!img) };
}
