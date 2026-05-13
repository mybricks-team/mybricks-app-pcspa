// import { uploadAssets } from '@/utils/shareUtils'
import { LCCompiler } from './LCCompiler'
import dayjs from 'dayjs'
import type {
  VibePublishSourceItem,
  VibePublishThemeVar,
} from './getPublishSource'
import { mockMybricksTesting } from './mockMybricksTesting'
import API from '@mybricks/sdk-for-app/api'

const uploadAssets = () => {
  // 上传cdn
  // content: string,
  // fileName: string,
  // shareId: string,
}

const PRE_SCRIPTS = [
  `https://f2.eckwai.com/kos/nlav12333/web-assets/lib/react/18.2.0/react.production.min.js`,
  `https://f2.eckwai.com/kos/nlav12333/web-assets/lib/react-dom/18.2.0/react-dom.production.min.js`,
]

/**
 * fetch 请求代理脚本（IIFE）
 * 注入到 iframe HTML 的 <head> 最前面，早于所有业务 bundle 执行。
 * 拦截 window.fetch，通过 postMessage 把请求转发给父页面（当前项目域）代理发起，
 * 再把响应结果通过 postMessage 回传，从而避免 iframe（CDN 外域）直接发请求触发 CORS。
 */
const VIBE_PROXY_SCRIPT = `(function () {
  var _pendingMap = Object.create(null);
  var _reqIdCounter = 0;

  function _genId() {
    return 'vp_' + (++_reqIdCounter) + '_' + Date.now();
  }

  // 判断该 URL 是否需要代理（非 CDN 静态资源的请求才代理）
  function _needsProxy(url) {
    if (!url) return false;
    // 相对路径一律代理
    if (url.charAt(0) === '/' || url.indexOf('./') === 0 || url.indexOf('../') === 0) return true;
    try {
      var u = new URL(url);
      var hostname = u.hostname;
      // CDN 静态资源域名不代理（JS/CSS 由浏览器直接加载，不经过 fetch）
      if (
        hostname.endsWith('.eckwai.com') ||
        hostname.endsWith('.beckwai.com') ||
        hostname.endsWith('.kuaishouzt.com')
      ) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // 监听父页面返回的代理响应
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'VIBE_PROXY_RESPONSE') return;
    var pending = _pendingMap[data.id];
    if (!pending) return;
    delete _pendingMap[data.id];

    if (data.error) {
      pending.reject(new TypeError('[VIBE_PROXY] ' + data.error));
      return;
    }

    if (pending.type === 'xhr') {
      pending.resolve(data);
      return;
    }

    try {
      // 根据 bodyEncoding 还原正确的 body 内容
      var bodyInit;
      if (data.bodyEncoding === 'base64') {
        // 二进制文件：base64 → Uint8Array
        try {
          var binaryStr = atob(data.body || '');
          var bytes = new Uint8Array(binaryStr.length);
          for (var i = 0; i < binaryStr.length; i++) { bytes[i] = binaryStr.charCodeAt(i); }
          bodyInit = bytes.buffer;
        } catch (e) {
          bodyInit = data.body || '';
        }
      } else {
        // json / text：直接序列化
        bodyInit = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
      }
      var responseInit = { status: data.status, statusText: data.statusText || '' };
      if (data.headers && typeof data.headers === 'object') {
        try { responseInit.headers = new Headers(data.headers); } catch (e) {}
      }
      pending.resolve(new Response(bodyInit, responseInit));
    } catch (e) {
      pending.reject(e);
    }
  });

  // 拦截 window.fetch
  var _originalFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (!_needsProxy(url) || !_originalFetch) {
      return _originalFetch ? _originalFetch(input, init) : Promise.reject(new Error('fetch not available'));
    }

    var id = _genId();
    var method = ((init && init.method) || 'GET').toUpperCase();
    var reqHeaders = {};

    if (init && init.headers) {
      try {
        var h = new Headers(init.headers);
        h.forEach(function (v, k) { reqHeaders[k] = v; });
      } catch (e) {
        // fallback
        if (typeof init.headers === 'object') {
          var hObj = init.headers;
          Object.keys(hObj).forEach(function (k) { reqHeaders[k] = hObj[k]; });
        }
      }
    }

    var body = null;
    if (init && init.body !== undefined && init.body !== null) {
      if (typeof init.body === 'string') {
        body = init.body;
      } else {
        try { body = JSON.stringify(init.body); } catch (e) { body = String(init.body); }
      }
    }

    return new Promise(function (resolve, reject) {
      _pendingMap[id] = { type: 'fetch', resolve: resolve, reject: reject };
      try {
        window.parent.postMessage({
          type: 'VIBE_PROXY_REQUEST',
          id: id,
          url: url,
          method: method,
          headers: reqHeaders,
          body: body,
          credentials: (init && init.credentials) || 'same-origin',
        }, '*');
      } catch (e) {
        delete _pendingMap[id];
        reject(e);
      }
    });
  };

  // 拦截 XMLHttpRequest（axios 默认使用 XHR）
  var _OriginalXHR = window.XMLHttpRequest;

  function ProxiedXHR() {
    this._method = 'GET';
    this._url = '';
    this._reqHeaders = {};
    this._id = null;
    this._listeners = {};
    // 对外暴露的属性
    this.readyState = 0;
    this.status = 0;
    this.statusText = '';
    this.responseText = '';
    this.response = '';
    this.responseType = '';
    this.withCredentials = false;
    this.timeout = 0;
    this._useProxy = false;
    this._nativeXHR = null;
  }

  ProxiedXHR.prototype.open = function (method, url, async, user, password) {
    this._method = (method || 'GET').toUpperCase();
    this._url = url || '';
    this._useProxy = _needsProxy(this._url);
    if (!this._useProxy) {
      this._nativeXHR = new _OriginalXHR();
      this._nativeXHR.open(method, url, async !== false, user, password);
    }
  };

  ProxiedXHR.prototype.setRequestHeader = function (name, value) {
    if (this._useProxy) {
      this._reqHeaders[name] = value;
    } else if (this._nativeXHR) {
      this._nativeXHR.setRequestHeader(name, value);
    }
  };

  ProxiedXHR.prototype.addEventListener = function (type, listener) {
    if (this._useProxy) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    } else if (this._nativeXHR) {
      this._nativeXHR.addEventListener(type, listener);
    }
  };

  ProxiedXHR.prototype.removeEventListener = function (type, listener) {
    if (this._useProxy) {
      var arr = this._listeners[type];
      if (arr) {
        var idx = arr.indexOf(listener);
        if (idx !== -1) arr.splice(idx, 1);
      }
    } else if (this._nativeXHR) {
      this._nativeXHR.removeEventListener(type, listener);
    }
  };

  ProxiedXHR.prototype._emit = function (type, extra) {
    var self = this;
    var event = Object.assign({ type: type, target: self, currentTarget: self }, extra || {});
    // 触发 on* 属性
    if (typeof self['on' + type] === 'function') {
      try { self['on' + type](event); } catch (e) {}
    }
    // 触发 addEventListener 注册的监听器
    var arr = self._listeners[type];
    if (arr) {
      arr.forEach(function (fn) { try { fn(event); } catch (e) {} });
    }
  };

  ProxiedXHR.prototype.send = function (body) {
    var self = this;

    if (!this._useProxy) {
      // 直通原生 XHR
      if (this._nativeXHR) {
        this._nativeXHR.send(body);
      }
      return;
    }

    // 通过 postMessage 代理
    var id = _genId();
    this._id = id;

    var sendBody = null;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        sendBody = body;
      } else {
        try { sendBody = JSON.stringify(body); } catch (e) { sendBody = String(body); }
      }
    }

    self.readyState = 1;
    self._emit('readystatechange');

    _pendingMap[id] = {
      type: 'xhr',
      resolve: function (data) {
        self.readyState = 4;
        self.status = data.status;
        self.statusText = data.statusText || '';
        self.responseText = data.body || '';
        self.response = self.responseText;
        self._emit('readystatechange');
        self._emit('load');
        self._emit('loadend');
      },
      reject: function (err) {
        self.readyState = 4;
        self.status = 0;
        self.statusText = '';
        self.responseText = '';
        self.response = '';
        self._emit('readystatechange');
        self._emit('error', { error: err });
        self._emit('loadend');
      },
    };

    try {
      window.parent.postMessage({
        type: 'VIBE_PROXY_REQUEST',
        id: id,
        url: self._url,
        method: self._method,
        headers: self._reqHeaders,
        body: sendBody,
        credentials: 'same-origin',
      }, '*');
    } catch (e) {
      delete _pendingMap[id];
      self._emit('error', { error: e });
    }
  };

  ProxiedXHR.prototype.abort = function () {
    if (this._id && _pendingMap[this._id]) {
      delete _pendingMap[this._id];
    }
    if (this._nativeXHR) {
      this._nativeXHR.abort();
    }
    this.readyState = 0;
    this._emit('abort');
  };

  ProxiedXHR.prototype.getResponseHeader = function (name) {
    if (this._nativeXHR) return this._nativeXHR.getResponseHeader(name);
    return null;
  };

  ProxiedXHR.prototype.getAllResponseHeaders = function () {
    if (this._nativeXHR) return this._nativeXHR.getAllResponseHeaders();
    return '';
  };

  // 将代理类挂上静态属性（axios 会检查 XMLHttpRequest.DONE 等常量）
  ProxiedXHR.UNSENT = 0;
  ProxiedXHR.OPENED = 1;
  ProxiedXHR.HEADERS_RECEIVED = 2;
  ProxiedXHR.LOADING = 3;
  ProxiedXHR.DONE = 4;

  window.XMLHttpRequest = ProxiedXHR;

  // 同步更新 postMessage 监听，把 XHR pending 也处理进去（已复用同一个 _pendingMap）
})();`

type BizCenterContext = {
  bizCenter?: {
    extra?: {
      resourceUrl?: string
      configUrl?: string
    }
  }
}

type AvailableLibrary = {
  packageName?: string
  libraryName?: string
  umd?: string[]
  css?: string[]
}

type BizCenterAssets = {
  scripts: string[]
  styles: string[]
  external: Record<string, string>
}

interface BuildVibePreviewHtmlParams {
  title: string
  source: VibePublishSourceItem
  target?: string
  chatId: number | string
  userId?: string
  assetOwnerId: string
  vbDesignContext?: BizCenterContext
  enableVibeProxy?: boolean
}

export const loadBizCenterAssets = async (
  vbDesignContext?: BizCenterContext,
): Promise<BizCenterAssets> => {
  const resourceUrl =
    vbDesignContext?.bizCenter?.extra?.resourceUrl ||
    vbDesignContext?.bizCenter?.extra?.configUrl

  if (!resourceUrl) {
    // [TODO] 写死，后续支持配置
    return {
      scripts: [
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/dayjs/1.11.13/dayjs.min.js',
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/dayjs/1.11.13/locale/zh-cn.min.js',
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/ant-design-icons/6.0.2/index.umd.min.js',
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/antd/5.21.4/antd-with-locales.min.js',
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/echarts/5.6.0/echarts.min.js',
      ],
      styles: [
        'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/antd/5.21.4/reset.min.css'
      ],
      external: {},
    }
  }

  const separator = resourceUrl.includes('?') ? '&' : '?'
  const response = await fetch(`${resourceUrl}${separator}t=${Date.now()}`)

  if (!response.ok) {
    throw new Error(`load biz center assets failed: ${response.status}`)
  }

  const configJson = await response.json()
  const libraries = (configJson?.stackConfig?.availableLibraries ??
    []) as Array<AvailableLibrary>

  return libraries.reduce<BizCenterAssets>(
    (acc, item) => {
      const packageName = item?.packageName?.trim()
      const libraryName = item?.libraryName?.trim()

      if (packageName && libraryName) {
        acc.external[packageName] = libraryName
      }

      acc.scripts.push(
        ...(item?.umd ?? []).filter(
          (url): url is string => typeof url === 'string' && !!url,
        ),
      )
      acc.styles.push(
        ...(item?.css ?? []).filter(
          (url): url is string => typeof url === 'string' && !!url,
        ),
      )

      return acc
    },
    {
      scripts: [],
      styles: [],
      external: {},
    },
  )
}

// 添加测试所需要的mock环境，并加载 setup文件
function buildCodeMap(source: VibePublishSourceItem): Record<string, string> {
  const codeMap = source.files.reduce(
    (acc, file) => {
      acc[file.path] = file.content
        .replace(`@mybricks/ai-render/testing`, `./mybricks-testing`)
        .replace(`mybricks/testing`, `./mybricks-testing`)
      if (file.path === 'index.jsx' || file.path === 'index.tsx') {
        acc[file.path] = `
        import {activate} from './mybricks-testing'
        import { setAppContextDefaults } from '@mybricks/ai-render'

        setAppContextDefaults({
          _renderType: "application",
          _router: "hash"
        })

        ${source.files.some(f => f.path === 'setup.ts' || f.path === 'setup.js') ? `import "./setup"` : ''}

        // 初始化时读取 URL 参数
        const __vibeDesignEnv = new URLSearchParams(window.location.search).get('env')
        if (!__vibeDesignEnv || __vibeDesignEnv === 'mock') {
          activate('mock')
        }

        ${acc[file.path]}
        `
      }
      return acc
    },
    {} as Record<string, string>,
  )

  codeMap['mybricks-testing.ts'] = mockMybricksTesting
  return codeMap
}

export const buildVibePreviewHtml = async ({
  title,
  source,
  target,
  chatId,
  userId,
  assetOwnerId,
  vbDesignContext,
  enableVibeProxy = true,
}: BuildVibePreviewHtmlParams): Promise<string> => {
  const codeMap = buildCodeMap(source)
  const compiler = new LCCompiler()
  const ctx = vbDesignContext
  const dynamicAssets = await loadBizCenterAssets(ctx).catch(() => ({
    scripts: [],
    styles: [],
    external: {},
  }))

  const bundleCode = await compiler.generateBundle(
    codeMap,
    { name: source.name || 'component', props: {} },
    {
      target,
      extraExternal: dynamicAssets.external,
    },
  )

  const bundleJsUrl: any = await API.Upload.toOss({
    content: bundleCode,
    folderPath: `/vibe/pc/${chatId}`,
    fileName: `index.${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.js`,
    noHash: true
  });

  const headStyles = dynamicAssets.styles
    .map(url => `<link rel="stylesheet" href="${url}" />`)
    .join('\n')

  // const themeStyleText = buildThemeStyleText(source.activeTheme?.vars)
  // const themeStyleTag = themeStyleText
  //   ? `<style id="vibe-design-theme-vars">\n${themeStyleText}\n</style>`
  //   : ''

  const headScripts = [...PRE_SCRIPTS, ...dynamicAssets.scripts]
    .map(url => `<script src="${url}"></script>`)
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <script>
  /* VIBE_DESIGN_PROXY_SCRIPT - fetch 请求代理（必须在所有业务脚本之前执行） */
  ${enableVibeProxy ? VIBE_PROXY_SCRIPT : ''}
  </script>
  ${headStyles}
  ${headScripts}
  <script>
  window.react_jsx_runtime = {
    Fragment: window.React.Fragment,
    jsx: window.React.createElement,
    jsxs: window.React.createElement,
    jsxDEV: window.React.createElement,
  };
</script>
</head>
<body>
  <div id="root" class="aicode-preview-container"></div>
  <script defer src="${bundleJsUrl.url}"></script>
</body>
</html>`
}

export const buildThemeStyleText = (
  vars: VibePublishThemeVar[] | undefined,
): string => {
  if (!vars || !vars.length) {
    return ''
  }
  const cssText = vars
    .map(item => `  ${item.propertyName}: ${item.value};`)
    .join('\n')
  return `:root {\n${cssText}\n}`
}
