import URL from 'url';
import axios from "axios";
import { Logger } from "@mybricks/rocker-commons";
import { getAppConfig } from './tools/get-app-config';
const path = require('path');
const FormData = require('form-data');

/** 处理对象中所有字符类型的值 */
function processingStringsFromJSON(obj: Record<string, any>, handle: (str: string) => string) {
  function explore(obj: Record<string, any>) {
    for (let key in obj) {

      switch (typeof obj[key]) {
        case 'string':
          obj[key] = handle(obj[key])
          break;
        case 'object':
          explore(obj[key]);
          break;
        default:
      }

    }
  }
  explore(obj);
}


/** 从 toJSON 中处理出所有的资源地址 */
export function analysisAllResourceUrls(json: any, origin: string): string[] {
  const urls: string[] = [];

  processingStringsFromJSON(json, str => {
    if (str.includes('/mfs/files/')) {
      if (str.startsWith('url(')) {
        const regex = /^url\(([\w\W]*)\)/;
        const url = str.match(regex)?.[1];
        url && urls.push(`${url}`);
      } else { urls.push(`${str}`); }
    }

    return str;
  })

  return Array.from(new Set(urls));
}

/** 下载资源 */
async function downloadResource(url: string) {
  try {
    const res = await axios({ method: "get", url, timeout: 30 * 1000, responseType: 'arraybuffer' });
    return res.data;
  } catch (e) {
    Logger.error(`[publishToCom] 资源下载失败,url: ${url} ${JSON.stringify(e, null, 2)}`);
    throw new Error('资源下载失败');
  }
}

// 将 ArrayBuffer 转换为 Base64 字符串的函数
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = Buffer.from(buffer);
  return binary.toString('base64');
}

/** 发布资源到 CDN 返回 CDN 资源地址 */
async function resourcesToCDN(urls: string[]) {
  if (!urls.length) return [];
  Logger.info(`[publishToCom] 开始上传资源,urls:[${urls.join(' , ')}]`);
  const appConfig = await getAppConfig();
  const uploadUrl = appConfig.baseConfig.uploadToCDN;
  if (!uploadUrl) throw new Error('未配置图片上传地址，请联系管理员配置');

  Logger.info(`[publishToCom] 开始下载要上传的资源...`);
  const contents = await Promise.all(urls.map(url => downloadResource(url)));
  Logger.info(`[publishToCom] 下载要上传的资源成功`);

  const formData = new FormData();
  contents.forEach((content, index) => {
    const fileName = path.basename(urls[index]); // 获取图片文件名
    formData.append('files', Buffer.from(content, 'binary'), fileName);
  })

  Logger.info(`[publishToCom] 开始上传资源,上传地址为:${uploadUrl}`)
  return await axios.post(uploadUrl, formData, {
    headers: formData.getHeaders(),
    timeout: 60 * 1000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  }).then((res) => {
    Logger.info(`[publishToCom] 上传资源成功,资源urls:[${res.data.urls.join(' , ')}]`);
    return (res.data.urls as string[]).map((cdnUrl, index) => {
      const url = urls[index];
      const filename = url.split('/').slice(-1)[0];
      return { url, filename, cdnUrl };
    })
  }).catch((e) => {
    Logger.error(`[publishToCom] 上传失败,${e}`);
    throw new Error('资源上传失败');
  });
}

async function resourceToLocal(url: string) {
  return {
    url,
    filename: url.split('/').slice(-1)[0],
    content: arrayBufferToBase64(await downloadResource(url)),
  };
}

/** 将 toJSON 中的所有资源下载下来并处理 */
export default async function resourceProcessing(json: any, options: { toCDN: boolean, origin: string }) {
  // 所有的资源地址
  const urls = analysisAllResourceUrls(json, options.origin);

  if (options.toCDN) return await resourcesToCDN(urls);
  return await Promise.all(urls.map(resourceToLocal));
}
