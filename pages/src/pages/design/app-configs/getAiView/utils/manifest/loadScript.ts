import { message } from "antd";

interface LoadUMDParams {
  url: string;
  sandbox?: any;
  options?: LoadUMDOptions;
}

interface LoadUMDOptions {
  // 库名
  name?: string;
  // UMD 库的全局变量名
  libraryName?: string;
}

// 单个加载
async function loadUMD(params: LoadUMDParams) {
  const { url, options, sandbox } = params;
  const { name, libraryName } = options || {};

  try {
    // 1. 沙箱全局对象
    const _sandbox = sandbox || {};

    // 2. 代理：读可穿透到真实 window，写只留在沙箱
    // 缓存已绑定的函数，避免每次属性访问都创建新的 bind 包装
    const boundFnCache = new WeakMap<Function, Function>();

    const proxyGlobal = new Proxy(_sandbox, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        // 模拟真实 window 上的属性（如 document、setTimeout）
        const rawValue = (window as any)[prop];
        if (typeof rawValue === 'function') {
          // 原生函数必须绑定 window，否则以 proxyGlobal 作为 this 调用时会报
          // "TypeError: Illegal invocation"（如 antd 内部对 setTimeout、addEventListener 等的调用）
          let bound = boundFnCache.get(rawValue);
          if (!bound) {
            bound = rawValue.bind(window);
            boundFnCache.set(rawValue, bound);
          }
          return bound;
        }
        return rawValue;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });

    // 3. 获取脚本文本并执行
    const response = await fetch(url);
    const scriptText = await response.text();

    // 部分库（如 Rollup 打包的 supabase）以 `var <libraryName> = (function(){...})()` 形式发布，
    // 执行后结果只停留在函数体局部变量，不会挂到 window/this 沙箱上，导致后续依赖注入失败。
    // 这里在脚本末尾追加一段，把同名的局部变量补挂到沙箱全局对象上。
    const exposeCode = libraryName
      ? `;(function(){ var __umdExposeValue__; try { __umdExposeValue__ = typeof ${libraryName} !== 'undefined' ? ${libraryName} : undefined; } catch (e) {} if (typeof globalThis[${JSON.stringify(libraryName)}] === 'undefined' && __umdExposeValue__ !== undefined) { globalThis[${JSON.stringify(libraryName)}] = __umdExposeValue__; } })();`
      : '';

    const wrappedCode = `var define = undefined;\n${scriptText}\n${exposeCode}`;
    const fn = new Function('window', 'self', 'globalThis', wrappedCode);

    // 执行时将 this 也指向 proxyGlobal，确保 UMD 里 this 即沙箱
    fn.call(proxyGlobal, proxyGlobal, proxyGlobal, proxyGlobal);

    // 4. 返回结果
    if (libraryName) {
      return _sandbox[libraryName];
    }
    if (name) {
      return _sandbox[name];
    }
  } catch (error) {
    message.error(`加载 ${name} UMD 库失败`);
    console.error(`加载 ${name} UMD 库失败:`, error);
  }
  return undefined;
}

// 批量加载
async function loadUMDS(urls: Array<{ url: string; libraryName?: string }>) {
  const sandbox = {};

  const loadNext = async (index: number): Promise<void> => {
    if (index >= urls.length) return;
    const item = urls[index];
    await loadUMD({
      url: item.url,
      sandbox,
      options: { name: item.libraryName, libraryName: item.libraryName },
    });
    await loadNext(index + 1);
  };

  await loadNext(0);
  return sandbox;
}

export { loadUMD, loadUMDS }
