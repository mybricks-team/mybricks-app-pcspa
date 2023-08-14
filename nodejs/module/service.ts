import { Injectable } from '@nestjs/common'

import * as fs from "fs";
import axios from "axios";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { parse } from "url";
import { Blob } from 'buffer'
const FormData = require("form-data");

@Injectable()
export default class PcPageService {

  async _generateComLibRT(comlibs, json, { domainName }) {
    /**
       * TODO:
       * 1.目前应用里配置的edit.js 一定有 rt.js
       * 2.物料体系完善后，应该都是按需加载的
       * 3.目前只有匹配到“我的组件”内组件才去物料中心拉组件代码
       */
    let mySelfComMap = {}
    let comlibScripts = ''

    comlibs.forEach((comlib) => {
      if (comlib?.defined && Array.isArray(comlib.comAray)) {
        comlib.comAray.forEach((com) => {
          mySelfComMap[`${com.namespace}@${com.version}`] = true
        })
      } else {
        comlibScripts += `<script src="${comlib?.rtJs}"></script>`
      }
    })

    const deps = json.scenes.reduce((pre, scene) => [...pre, ...scene.deps], []);
    const components = deps.filter((item) => {
      return mySelfComMap[`${item.namespace}@${item.version}`]
    })

    console.info("[publish] get material begin");
    const finalComponents = await Promise.all(components.map((component) => {
      return new Promise((resolve) => {
        axios({
          method: 'get',
          url: `${domainName}/api/material/namespace/content?namespace=${component.namespace}&version=${component.version}`,
        }).then(({ data }) => {
          resolve(data.data)
        })
      })
    }))

    console.info("[publish] get material ok");
    let mySelfComlibRt = ''

    finalComponents.forEach((finalComponent) => {
      const { version, namespace, runtime } = finalComponent

      if (version && namespace && runtime) {
        mySelfComlibRt += `
					comAray.push({
						namespace: '${namespace}',
						version: '${version}',
						runtime: ${runtime}
					})
				`
      }
    })

    mySelfComlibRt = `
			<script type="text/javascript">
				(function() {
					let comlibList = window['__comlibs_rt_'];
					if(!comlibList){
						comlibList = window['__comlibs_rt_'] = [];
					}
					let comAray = [];
					const newComlib = {
						id: '_myself_',
						title: '我的组件',
						comAray: comAray,
						defined: true,
					};

					${mySelfComlibRt}

					comlibList.push(newComlib);
				})()
			</script>
		`
    return comlibScripts + mySelfComlibRt
  }

  async publish(req, { json, userId, fileId, envType, commitInfo }) {
    try {

      const publishFilePath = path.resolve(__dirname, './template')

      // // let templateJS = ''
      // let templateHTMl = ''

      // if(fs.existsSync(publishFilePath)) {
      //   const files = fs.readdirSync(publishFilePath)

      //   files.forEach(file => {
      //     if (/\.js$/.test(file)) {
      //       templateJS = fs.readFileSync(publishFilePath + '/' + file, 'utf-8')
      //     }
      //   })

      //   templateHTMl = fs.readFileSync(publishFilePath + '/publish.html', 'utf8')
      // }

      // let template = fs.readFileSync(path.resolve(__dirname, './template.html'), 'utf8')

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
      } = json.configuration

      Reflect.deleteProperty(json, 'configuration')

      /** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
      const domainName = process.env.NODE_ENV === 'development' ? 'http://localhost:3100' : getRealDomain(req)
      console.info("[publish] domainName is:", domainName);

      template = template.replace(`--title--`, title)
        .replace(`-- comlib-rt --`, await this._generateComLibRT(comlibs, json, { domainName }))
        .replace(`"--projectJson--"`, JSON.stringify(json))
        .replace(`"--executeEnv--"`, JSON.stringify(envType))
        .replace(`"--slot-project-id--"`, projectId ? projectId : JSON.stringify(null))


      let publishMaterialInfo

      const customPublishApi = await getCustomPublishApi({ groupId })
      console.info("[publish] getCustomPublishApi=", customPublishApi);

      if (customPublishApi) {
        console.info("[publish] getLatestPub begin");
        const latestPub = (await API.File.getLatestPub({
          fileId
        }))?.[0];
        console.info("[publish] getLatestPub ok");
        const version = getNextVersion(latestPub?.version)
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
          }
        }
        const { code, message, data } = await axios.post(customPublishApi, {
          data: dataForCustom,
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.data);

        if (code !== 1) {
          throw new Error(`发布集成接口出错: ${message}`)
        } else {
          publishMaterialInfo = data
        }
      } else {
        console.info("[publish] upload to static server");
        publishMaterialInfo = await API.Upload.staticServer({
          content: template,
          folderPath: `${folderPath}/${envType || 'prod'}`,
          fileName,
          noHash: true
        })
        console.info("[publish] upload to static server ok");
        //   const { url } = await uploadStatic(template, manateeUserInfo);
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

  async upload(req, { file }, { groupId = '' } = {}) {
    const uploadService = await getUploadService({ groupId });
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

const getAppConfig = async ({ groupId }) => {
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

const getUploadService = async ({ groupId }) => {
  const { uploadServer = {} } = await getAppConfig({ groupId })
  const { uploadService } = uploadServer
  if (!uploadService) {
    throw Error("无上传服务，请先配置应用上传服务");
  }
  return uploadService;
};

const getCustomPublishApi = async ({ groupId }) => {
  const { publishApiConfig = {} } = await getAppConfig({ groupId })
  const { publishApi } = publishApiConfig
  if (!publishApi) {
    console.warn(`未配置发布集成接口`)
  }
  return publishApi;
}

const uploadStatic = async (
  content: string,
  groupId: string,
  manateeUserInfo: { token: string; session: string }
): Promise<{ url: string }> => {
  // @ts-ignore
  const blob = new Blob([content], { type: "text/html" });
  const uploadService = await getUploadService({ groupId });
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