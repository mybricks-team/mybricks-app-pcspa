import { compileToUMd } from '../compiler'
import { ModuleMatcher } from '../compiler/type'
import { getExternalInfo, moduleMatcher } from './config'

type AIDialogStore = any

const prefixCode = `try {
  // 修复三方包的如下报错： Automatic publicPath is not supported in this browser
  if (document && !document.currentScript) {
    Object.defineProperty(document, 'currentScript', {
      get() {
        // 返回一个伪造的 script 对象，src 指向当前域名根目录
        // 这样代码中的 _.replace(...) 就能正常工作并解析出 '/'
        return { src: window.location.origin + '/fake-script.js' };
      },
      configurable: true
    });
  }
} catch (e) {
  console.warn('Failed to polyfill currentScript', e);
}
  `

export class LCCompiler {
  // 内网模块配置
  // key匹配模块名，value是模块内网路径
  private _externalModulesMatcher: Array<ModuleMatcher> = [...moduleMatcher]

  public async generateComponentUMD(
    code: Record<string, string>,
    options?: {
      name?: string
      target?: string
      extraExternal?: Record<string, string>
    },
  ) {
    const finalExternal = {
      ...getExternalInfo(options?.target),
      ...(options?.extraExternal || {}),
    }
    const finalOptions = {
      entry: 'entry.tsx',
      files: {
        ...code,
        'entry.tsx': `import Component from './index'
export default {
"default": Component
}
`,
      },
      external: finalExternal,
      preload: [] as any,
      externalModulesMatcher: this._externalModulesMatcher,
      name: options?.name,
    }
    const bundle = await compileToUMd(finalOptions)
    return bundle
  }

  public async generateBundle(
    code: Record<string, string>,
    componentInfo: AIDialogStore['metaComponent']['info'],
    options?: {
      target?: string
      extraExternal?: Record<string, string>
    },
  ) {
    const finalExternal = {
      ...getExternalInfo(options?.target),
      ...(options?.extraExternal || {}),
    }
    const finalOptions = {
      entry: 'entry',
      files: {
        ...code,
        'entry.tsx': this._createEntryCode(componentInfo, options?.target),
      },
      external: finalExternal,
      preload: [] as any,
      externalModulesMatcher: this._externalModulesMatcher,
    }
    let bundle = await compileToUMd(finalOptions)
    if (options?.target === 'react') {
      bundle = prefixCode + bundle
    }
    return bundle
  }

  public addExternalModules(modules: Array<ModuleMatcher>) {
    this._externalModulesMatcher = [...this._externalModulesMatcher, ...modules]
  }

  public getComponentPropsString(
    componentInfo: AIDialogStore['metaComponent']['info'],
    defaultFunction = '() => { alert("hello")}',
  ) {
    const props = Object.entries(componentInfo?.props || {})
      .map(([key, value]: any) => {
        if (value.type === 'function') {
          return `${key}: ${value.defaultValue || defaultFunction},`
        } else {
          return `${key}: ${JSON.stringify(value.defaultValue)},`
        }
      })
      .join('\n    ')

    return `{${props}}`
  }

  private _createEntryCode(
    componentInfo: AIDialogStore['metaComponent']['info'],
    target?: string,
  ) {
    let entryCode = `
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

import Component from './index';
import zhCN from 'antd/es/locale/zh_CN';
import { ConfigProvider } from 'antd';


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  componentDidCatch(error, info) {
    console.error('[vibe-publish] React render error', error, info);
    this.setState({ hasError: true, error, info });
    try {
      window.parent.postMessage({
        type: 'iframe-error',
        message: error?.message || String(error),
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
      }, '*'); 
    } catch (e) {}
  }
  render() {
    if (this.state.hasError) {
      return <div></div>;
    }
    return this.props.children;
  }
}

const RenderTracker = ({ children }) => {

  useEffect(() => {
    // 首次挂载完成
    window.parent.postMessage({ type: 'iframe-mount-complete' }, '*');
  }, []); // 空依赖数组，确保只在挂载后执行

  return children;
};

// props中会调用message，需要提前定义到windows中
window.message = window['antd'] ? window['antd'].message : (msg) => { alert(msg); };

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[vibe-publish] root element #root not found');
  throw new Error('[vibe-publish] root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RenderTracker>
        <ConfigProvider locale={zhCN}>
          <Component {...${this.getComponentPropsString(componentInfo)}} />
        </ConfigProvider>
      </RenderTracker>
    </ErrorBoundary>
  </React.StrictMode>
);
`
    return entryCode
  }
}
