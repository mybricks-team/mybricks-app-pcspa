import { message } from "antd";

interface LoadUMDParams {
  url: string;
  sandbox?: any;
  options?: LoadUMDOptions;
}

interface LoadUMDOptions {
  // 库名
  name: string;
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
    const proxyGlobal = new Proxy(_sandbox, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        // 模拟真实 window 上的属性（如 document、setTimeout）
        const value = window[prop];
        // 若是函数，直接返回，不做特殊绑定（绝大多数情况不影响）
        return value;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });

    // 3. 获取脚本文本并执行
    const response = await fetch(url);
    const scriptText = await response.text();

    const wrappedCode = `var define = undefined;\n${scriptText}`;
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
async function loadUMDS(urls: string[]) {
  const sandbox = {};

  const loadNext = async (index: number): Promise<void> => {
    if (index >= urls.length) return;
    await loadUMD({ url: urls[index], sandbox });
    await loadNext(index + 1);
  };

  await loadNext(0);
  return sandbox;
}

export { loadUMD, loadUMDS }
