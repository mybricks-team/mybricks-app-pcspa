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
			}else{
				comlibScripts += `<script src="${comlib?.rtJs}"></script>`
			}
		})

		const deps = json.scenes.reduce((pre, scene) => [...pre, ...scene.deps], []);
		const components = deps.filter((item) => {
			return mySelfComMap[`${item.namespace}@${item.version}`]
		})


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

	async publish(req, { json, userId, fileId, envType }) {
		try {
			let template = fs.readFileSync(path.resolve(__dirname, './template.html'), 'utf8')
			const { title, comlibs, projectId, fileName, folderPath } = json.configuration
			Reflect.deleteProperty(json, 'configuration')

			/** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
			const domainName = process.env.NODE_ENV === 'development' ? 'http://localhost:3100' : getRealDomain(req)

			template = template
				// .replace(`--RENDER_WEB--`, 'https://f2.eckwai.com/kos/nlav12333/mybricks/render-web/index.min.1.1.46.js')
				.replace(`<!-- comlib-rt -->`, await this._generateComLibRT(comlibs, json, { domainName }))
				.replace(`--title--`, title)
				.replace(`'--projectJson--'`, JSON.stringify(json))
				.replace(`'--slot-project-id--'`, projectId ? projectId : JSON.stringify(null))

			const res = await API.Upload.staticServer({
				content: template,
				folderPath,
				fileName,
				noHash: true
			})
			//   const { url } = await uploadStatic(template, manateeUserInfo);
			if (res?.url?.startsWith('https')) {
				res.url = res.url.replace('https', 'http')
			}

			const result = await API.File.publish({
				userId,
				fileId,
				extName: "pc-page",
				content: JSON.stringify(res),
				type: envType,
			});
			return result
		} catch (e) {
			console.log("pcpage publish error", e);
			throw e
		}
	}

	async upload(req, { file }) {
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

const getUploadService = async () => {
	const _NAMESPACE_ = "mybricks-app-pcspa-for-manatee";
	const res = await API.Setting.getSetting([_NAMESPACE_]);
	const { uploadService } = res[_NAMESPACE_]?.config
		? JSON.parse(res[_NAMESPACE_].config).uploadServer ?? {}
		: {};
	if (!uploadService) {
		throw Error("无上传服务，请先配置应用上传服务");
	}
	return uploadService;
};

const uploadStatic = async (
	content: string,
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
	let hostName = requestHeaders.ho
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
