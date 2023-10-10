import { ComlibRtUrl, ComlibEditUrl } from './../constants'
import axios from 'axios'
import React from "react"
import ReactDOM from "react-dom"
import { message } from 'antd'
import { PluginType } from '@/pages/setting/ConfigPlugin/type'
import { USE_CUSTOM_HOST } from '@/pages/home/constants'

export function getApiUrl(uri) {
  return uri
}

export function setCookie(name, value, exdays) {
  const d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))

  const expires = "expires=" + d.toGMTString()
  document.cookie = name + "=" + value + "; " + expires
}

export function getCookie(name) {
  name = name + "="
  const ca = document.cookie.split(';')

  for (let i = 0; i < ca.length; i++) {
    const c = ca[i].trim();
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
}

export function removeCookie(name) {
  document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;`
}

export function getQueryString(name) {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");

  const r = window.location.search.substring(1).match(reg);
  if (r != null) {
    return r[2]
  }
  return null;
}

export function copyText(txt: string): boolean {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.value = txt
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  return true
}

/**
 * 事件操作
 * ```js
 * eventOperation(() => {}).stop
 * ```
 * @param callback 函数
 */
export function eventOperation(callback: Function) {
  function fn(event: Event) {
    callback && callback(event)
  }

  fn.stop = function (event: Event) {
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    } else {
      // TODO?
      // @ts-ignore
      const fn = event.evt?.stopPropagation

      if (typeof fn === 'function') {
        fn()
        event.cancelBubble = true
      }
    }

    fn(event)
  } as unknown as React.MouseEventHandler;

  return fn;
}

export function replaceUrlVal(paramName: string, replaceWith?: string, config = { url: location.search }): void {
  const oldUrl = config.url;
  let newUrl: undefined | string = oldUrl;

  if (!replaceWith) {
    newUrl = deleteUrlVal(paramName);
  } else if (oldUrl) {
    const re = eval('/(' + paramName + '=)([^&]*)/gi');
    if (re.test(oldUrl)) {
      newUrl = oldUrl.replace(re, paramName + '=' + replaceWith);
    } else {
      newUrl = oldUrl + `&${paramName}=${replaceWith}`;
    }
  } else {
    newUrl = `?${paramName}=${replaceWith}`;
  }

  if (newUrl) {
    history.replaceState(null, '', newUrl);
  }


  // const oUrl = location.search.toString();
  // const re = eval('/('+ paramName+'=)([^&]*)/gi');
  // const nUrl = oUrl.replace(re, paramName+'='+replaceWith);
}

export function deleteUrlVal(name, baseUrl = location.search) {
  const query = baseUrl.slice(1);
  if (query.indexOf(name) > -1) {
    const obj: any = {}
    const arr: any = query.split("&");
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].split("=");
      obj[arr[i][0]] = arr[i][1];
    };
    Reflect.deleteProperty(obj, name);
    return '?' + JSON.stringify(obj).replace(/[\"\{\}]/g, "").replace(/\:/g, "=").replace(/\,/g, "&");
  };
}

export const isPublicVersion = () => {
  return new URL(window.location.href).hostname === 'mybricks.world'
}

export async function uploadApi(fileList: File[]) {
  const form = new FormData();
  fileList.forEach((file: File) => {
    form.append('file', file);
  });

  form.append('folderPath', `/fiels/${Date.now()}`);

  return axios.post(
    `/paas/api/flow/saveFile`, form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  )
    .then((e) => {
      if (e && e.data?.code === 1) {
        message.success(`上传成功`);
        const resData = e.data?.data;
        return Array.isArray(resData) ? resData : [resData]
      }
      console.warn(`上传失败`, e?.data || e);
      message.error(`上传失败`);
      throw new Error(`接口调用失败`)
    })
    .catch((e) => {
      console.warn(`上传失败`, e);
      message.error(`上传失败`);
      throw e
    });
}


export function getManateeUserInfo() {
  let userInfo: { session?: string, token?: string } = {}
  try {
    const token = localStorage.getItem('token');
    const session = localStorage.getItem('session')
    userInfo.token = token ? atob(atob(token)) : token
    userInfo.session = session ? atob(atob(session)) : session
  } catch (e) {
    console.error(e)
  }

  return userInfo
}

/**
 * 加载远程插件，获取挂载到window的全局变量
 */
const importScript = (() => {
  // 自执行函数，创建一个闭包，保存 cache 结果
  const cache = {};
  // 新增 window 属性 合集
  const lastWindowKeys = [];
  // 先把React挂载到window上
  if (!window["react"]) {
    window["react"] = window.React || React;
  }
  if (!window["react-dom"]) {
    window["react-dom"] = window.ReactDOM || ReactDOM;
  }
  return (plugin: PluginType) => {
    const { url } = plugin;
    // 如果有缓存，则直接返回缓存内容
    if (cache[url]) return Promise.resolve(cache[url])

    return new Promise((resolve, reject) => {
      // 保存最后一个 window 属性 key
      const lastWindowKey = Object.keys(window).pop()
      lastWindowKeys.push(lastWindowKey);
      // 创建 script
      const script = document.createElement('script')
      script.setAttribute('src', url)
      document.head.appendChild(script)

      // 监听加载完成事件
      script.addEventListener('load', () => {
        document.head.removeChild(script)
        // 最后一个新增的 key，是 umd 挂载的
        const newLastWindowKey = Object.keys(window).pop()

        // 获取到导出的组件
        const res = !lastWindowKeys.includes(newLastWindowKey) && (window[newLastWindowKey]);
        if (!res) {
          reject('插件未挂载到window');
        }
        lastWindowKeys.push(newLastWindowKey);
        const Com = res.default ? res.default : res

        cache[url] = Com

        resolve(Com)
      })

      // 监听加载失败情况
      script.addEventListener('error', (error) => {
        reject(error)
      })
    })
  }
})()

/**
 * 批量加载远程插件
 * @param plugins 插件数组
 * @param cb 回调函数
 * @returns 
 */
export const fetchPlugins = async (plugins: PluginType[]) => {
  const promises = plugins.map((plugin) => importScript(plugin)
    .then(com => {
      return com()
    }).catch(e => {
      message.error(`${plugin.title} 插件加载失败，失败信息：${e}`);
      console.error(`${plugin.title} 插件加载失败，失败信息：${e}`);
      return null
    })
  );

  const loadedPlugins = await Promise.all(promises);
  return loadedPlugins.filter(item => item !== null);
}

export const removeBadChar = (content: string) => {
  if (!content) return content
  return content.replace(/\\t/g, '')
}

export const combineHostAndPath = (host, path) => {
  const _host = host.replace(/\/$/, '')
  const _path = path.replace(/^\//, '')
  return _host + '/' + _path
}

export const shapeUrlByEnv = (envList, env, url, mybricksHost) => {
  if (!envList || !env || /^(https?|ws)/.test(url)) return url
  if (env === USE_CUSTOM_HOST) {
    return combineHostAndPath(mybricksHost.default, url)
  }
  const data = (envList || []).find(item => item.name === env)
  if (!data || !data.value) return url
  return data.value + url
}