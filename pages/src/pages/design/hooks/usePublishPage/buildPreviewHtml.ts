// import { uploadAssets } from '@/utils/shareUtils'
import { LCCompiler } from './LCCompiler'
import dayjs from 'dayjs'
import JSZip from 'jszip'
import type {
  VibePublishSourceItem,
  VibePublishThemeVar,
} from './getPublishSource'
import { mockMybricksTesting } from './mockMybricksTesting'
import API from '@mybricks/sdk-for-app/api'
import type { AIConfigManifestDependency } from '@/types/aiConfigManifest'
import { buildAssetsFromDependencies } from '@/pages/design/utils/aiConfigManifest'

const createPreviewEnvReplacementPlugin = (babel: any) => {
  const t = babel.types

  return {
    visitor: {
      MemberExpression(path: any) {
        if (path.matchesPattern('process.env.POPUP_VISIBLE')) {
          path.replaceWith(t.booleanLiteral(false))
        } else if (path.matchesPattern('process.env.POPUP_NODE')) {
          path.replaceWith(
            t.memberExpression(t.identifier('document'), t.identifier('body')),
          )
        } else {
          return
        }

        const parentPath = path.parentPath
        if (parentPath?.isBinaryExpression()) {
          const result = parentPath.evaluate()
          if (result.confident) {
            parentPath.replaceWith(t.valueToNode(result.value))
          }
        }

        if (parentPath?.isLogicalExpression()) {
          const leftPath = parentPath.get('left')
          if (leftPath.isBooleanLiteral()) {
            const { operator, left, right } = parentPath.node
            if (operator === '||') {
              parentPath.replaceWith(left.value ? left : right)
            } else if (operator === '&&') {
              parentPath.replaceWith(left.value ? right : left)
            }
          }
        }
      },
      IfStatement: {
        exit(path: any) {
          const testPath = path.get('test')
          if (!testPath.isBooleanLiteral()) {
            return
          }

          if (testPath.node.value) {
            path.replaceWith(path.node.consequent)
          } else if (path.node.alternate) {
            path.replaceWith(path.node.alternate)
          } else {
            path.remove()
          }
        },
      },
    },
  }
}

/**
 * Preview code runs outside the editor popup runtime. Replace its injected
 * environment values before compiling so generated code can run standalone.
 */
export const replacePreviewEnvVarsInCode = (code: string): string => {
  const babel = typeof window === 'undefined' ? undefined : (window as any).Babel
  if (!babel?.transform) {
    return code
  }

  try {
    const result = babel.transform(code, {
      sourceType: 'module',
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
      plugins: [createPreviewEnvReplacementPlugin],
    })
    return result.code || code
  } catch {
    return code
  }
}

const uploadAssets = () => {
  // 上传cdn
  // content: string,
  // fileName: string,
  // shareId: string,
}

// 基础库（永远需要），与配置依赖无关
const BASE_EXTERNAL = {
  react: 'React',
  'react-dom': 'ReactDOM',
  dayjs: 'dayjs',
  'react/jsx-runtime': 'react_jsx_runtime',
}

const BASE_SCRIPTS = (prefixUrl: string) => [
  `${prefixUrl}/react/18.2.0/react.production.min.js`,
  `${prefixUrl}/react-dom/18.2.0/react-dom.production.min.js`,
  `${prefixUrl}/dayjs/1.11.13/dayjs.min.js`,
  `${prefixUrl}/dayjs/1.11.13/locale/zh-cn.min.js`,
]

// ZIP 包中永远需要的基础资源（从本地静态文件 fetch）
const BASE_ZIP_ASSETS: Array<{ zipPath: string; fetchUrl: string }> = [
  {
    zipPath: 'assets/react.production.min.js',
    fetchUrl: '/public/react@18.0.0.production.min.js',
  },
  {
    zipPath: 'assets/react-dom.production.min.js',
    fetchUrl: '/public/react-dom@18.0.0.production.min.js',
  },
  {
    zipPath: 'assets/dayjs/1.11.13/dayjs.min.js',
    fetchUrl: '/public/publish/dayjs/1.11.13/dayjs.min.js',
  },
  {
    zipPath: 'assets/dayjs/1.11.13/locale/zh-cn.min.js',
    fetchUrl: '/public/publish/dayjs/1.11.13/locale/zh-cn.min.js',
  },
]

const DEFAULT_SCRIPTS = (prefixUrl: string) => [
  `${prefixUrl}/ant-design-icons/6.0.2/index.umd.min.js`,
  `${prefixUrl}/antd/5.21.4/antd-with-locales.min.js`,
  `${prefixUrl}/echarts/5.6.0/echarts.min.js`,
  `${prefixUrl}/echarts/5.6.0/echarts-for-react.min.js`,
]

/**
 * 下载 zip 包时使用的本地资源映射表 （无配置依赖时）
 * key: 在 zip 包内的相对路径（相对于 index.html）
 * value: 可被 fetch 下载的绝对 URL（当前服务的 /public/publish/... 静态路径）
 * 无配置依赖时 ZIP 包的兜底资源（仅含基础库之外的部分）。
 * 基础库资源见 BASE_ZIP_ASSETS，最终列表由 [...BASE_ZIP_ASSETS, ...DEFAULT_ZIP_ASSETS] 拼出。
 */
const DEFAULT_ZIP_ASSETS: Array<{ zipPath: string; fetchUrl: string }> = [
  // ant-design-icons
  {
    zipPath: 'assets/ant-design-icons/6.0.2/index.umd.min.js',
    fetchUrl: '/public/publish/ant-design-icons/6.0.2/index.umd.min.js',
  },
  // antd
  {
    zipPath: 'assets/antd/5.21.4/antd-with-locales.min.js',
    fetchUrl: '/public/publish/antd/5.21.4/antd-with-locales.min.js',
  },
  {
    zipPath: 'assets/antd/5.21.4/reset.min.css',
    fetchUrl: '/public/publish/antd/5.21.4/reset.min.css',
  },
  // echarts
  {
    zipPath: 'assets/echarts/5.6.0/echarts.min.js',
    fetchUrl: '/public/publish/echarts/5.6.0/echarts.min.js',
  },
  {
    zipPath: 'assets/echarts/5.6.0/echarts-for-react.min.js',
    fetchUrl: '/public/publish/echarts/5.6.0/echarts-for-react.min.js',
  },
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
  prefixUrl: string
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
  dependencies?: AIConfigManifestDependency[]
}

export const loadBizCenterAssets = async (
  vbDesignContext?: BizCenterContext,
): Promise<BizCenterAssets> => {
  const resourceUrl =
    vbDesignContext?.bizCenter?.extra?.resourceUrl ||
    vbDesignContext?.bizCenter?.extra?.configUrl

  if (!resourceUrl) {
    // [TODO] 写死，后续支持配置
    const { prefixUrl } = vbDesignContext
    return {
      scripts: [
        ...BASE_SCRIPTS(prefixUrl),
        ...DEFAULT_SCRIPTS(prefixUrl),
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/dayjs/1.11.13/dayjs.min.js',
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/dayjs/1.11.13/locale/zh-cn.min.js',
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/ant-design-icons/6.0.2/index.umd.min.js',
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/antd/5.21.4/antd-with-locales.min.js',
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/echarts/5.6.0/echarts.min.js',
        // 'https://p4-ec.eckwai.com/kos/nlav12333/aicode/static/umd/echarts-for-react.min.js'
      ],
      styles: [
        `${prefixUrl}/antd/5.21.4/reset.min.css`
        // 'https://p4-ec.ecukwai.com/kos/nlav11092/vibe-coding/assets/antd/5.21.4/reset.min.css'
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
      acc[file.path] = replacePreviewEnvVarsInCode(
        file.content
          .replace(`@mybricks/ai-render/testing`, `./mybricks-testing`)
          .replace(`mybricks/testing`, `./mybricks-testing`),
      )
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
  dependencies = [],
}: BuildVibePreviewHtmlParams): Promise<string> => {
  const codeMap = buildCodeMap(source)
  const compiler = new LCCompiler()
  const ctx = vbDesignContext
  const hasCustomDeps = dependencies?.length > 0

  // 从配置依赖中提取 assets
  const { external: depExternal, scripts: depScripts, styles: depStyles } =
    hasCustomDeps
      ? buildAssetsFromDependencies(dependencies)
      : { external: {}, scripts: [], styles: [] }

  // 没传配置依赖时走原来的 biz center 兜底
  const bizAssets = !hasCustomDeps
    ? await loadBizCenterAssets(ctx).catch(() => ({
        scripts: [],
        styles: [],
        external: {},
      }))
    : { scripts: [], styles: [], external: {} }

  const extraExternal = {
    ...BASE_EXTERNAL,
    ...(hasCustomDeps ? depExternal : bizAssets.external),
  }

  const bundleCode = await compiler.generateBundle(
    codeMap,
    { name: source.name || 'component', props: {} },
    {
      target,
      extraExternal,
    },
  )

  const bundleJsUrl: any = await API.Upload.staticServer({
    content: bundleCode,
    folderPath: `/vibe/pc/publish/${chatId}`,
    fileName: `index.${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.js`,
    noHash: true
  });

  console.log('[bundleJsUrl]', bundleJsUrl)

  const mergedStyles = hasCustomDeps ? depStyles : bizAssets.styles
  const mergedScripts = [
    ...BASE_SCRIPTS(ctx?.prefixUrl || ''),
    ...(hasCustomDeps ? depScripts : bizAssets.scripts),
  ]

  const headStyles = mergedStyles
    .map(url => `<link rel="stylesheet" href="${url}" />`)
    .join('\n')

  // const themeStyleText = buildThemeStyleText(source.activeTheme?.vars)
  // const themeStyleTag = themeStyleText
  //   ? `<style id="vibe-design-theme-vars">\n${themeStyleText}\n</style>`
  //   : ''

  const headScripts = mergedScripts
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

/**
 * 构建离线 zip 包：index.html 中所有资源引用本地相对路径，
 * 同时把对应静态文件写入 zip 的 assets/ 目录。
 */
export const buildVibePreviewZip = async ({
  title,
  source,
  chatId,
  assetOwnerId,
  vbDesignContext,
  dependencies = [],
}: {
  title: string
  source: VibePublishSourceItem
  chatId: number | string
  assetOwnerId: string
  vbDesignContext?: BizCenterContext
  dependencies?: AIConfigManifestDependency[]
}): Promise<Blob> => {
  const codeMap = buildCodeMap(source)
  const compiler = new LCCompiler()
  const hasCustomDeps = dependencies?.length > 0

  const { external: depExternal, zipAssets: depZipAssets } = hasCustomDeps
    ? buildAssetsFromDependencies(dependencies)
    : { external: {} as Record<string, string>, zipAssets: [] as Array<{ zipPath: string; fetchUrl: string }> }

  // external: 基础 + 配置（或硬编码兜底）
  const zipExternal = {
    ...BASE_EXTERNAL,
    ...(hasCustomDeps
      ? depExternal
      : {
          antd: 'antd',
          '@ant-design/icons': 'icons',
          echarts: 'echarts',
          'echarts-for-react': 'EChartsForReact',
        }),
  }

  const bundleCode = await compiler.generateBundle(
    codeMap,
    { name: source.name || 'component', props: {} },
    { extraExternal: zipExternal },
  )

  // 依赖的 js 和 css 文件（不含基础库）
  const depJsFiles = depZipAssets.filter(
    a => !a.fetchUrl.endsWith('.css'),
  )
  const depCssFiles = depZipAssets.filter(a =>
    a.fetchUrl.endsWith('.css'),
  )

  // 构建 index.html —— 基础库 + 配置依赖（或兜底）
  const localStyles = [
    ...(hasCustomDeps
      ? depCssFiles.map(
          a => `<link rel="stylesheet" href="${a.zipPath}" />`,
        )
      : [`<link rel="stylesheet" href="assets/antd/5.21.4/reset.min.css" />`]),
  ].join('\n')

  const localScripts = [
    // 基础库（永远需要）
    ...BASE_ZIP_ASSETS.map(a => `<script src="${a.zipPath}"></script>`),
    // 配置依赖（或兜底）
    ...(hasCustomDeps
      ? depJsFiles.map(a => `<script src="${a.zipPath}"></script>`)
      : DEFAULT_ZIP_ASSETS.map(a => `<script src="${a.zipPath}"></script>`)),
  ].join('\n')

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${localStyles}
  ${localScripts}
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
  <script defer src="assets/index.js"></script>
</body>
</html>`

  // 打包 zip
  const zip = new JSZip()
  zip.file('index.html', htmlContent)
  zip.file('assets/index.js', bundleCode)

  // 基础库资源 + 配置依赖（或兜底）
  const allZipAssets = [
    ...BASE_ZIP_ASSETS,
    ...(hasCustomDeps ? depZipAssets : DEFAULT_ZIP_ASSETS),
  ]

  await Promise.all(
    allZipAssets.map(async ({ zipPath, fetchUrl }) => {
      const resp = await fetch(fetchUrl)
      if (!resp.ok) {
        console.warn(
          `[buildVibePreviewZip] failed to fetch asset: ${fetchUrl} (${resp.status})`,
        )
        return
      }
      const buffer = await resp.arrayBuffer()
      zip.file(zipPath, buffer)
    }),
  )

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}
