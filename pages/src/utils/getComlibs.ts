import {
  MySelf_COM_LIB,
  PC_NORMAL_COM_LIB,
  CHARS_COM_LIB,
  BASIC_COM_LIB,
} from "../constants";
import { compareVersions } from "compare-versions";
import API from "@mybricks/sdk-for-app/api";
const legacyLibs =
  APP_TYPE === "react" ? [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB] : [];

export const compatContent = (content) => {
  content = JSON.parse(content);
  return content[APP_TYPE] ?? content;
};

const getLibsFromConfig = (appData: Record<string, any>) => {
  let libs = [];
  if (appData?.defaultComlibs?.length) {
    appData?.defaultComlibs.forEach((lib) => {
      let { namespace, content, version } = lib;
      const legacyLib = legacyLibs.find((lib) => lib.namespace === namespace);
      content = compatContent(content);
      if (legacyLib) {
        libs.push({ id: legacyLib.id, namespace, version, ...content });
      } else {
        libs.push({ ...lib, ...content });
      }
    });
  } else {
    libs.push(...legacyLibs);
  }
  if (
    !appData.fileContent?.content?.comlibs ||
    appData.fileContent?.content?.comlibs?.some(
      (lib) => typeof lib === "string"
    )
  ) {
    //initial or cdn legacy
    const myselfLib =
      appData.fileContent?.content?.comlibs?.find(
        (lib) => lib.id === "_myself_"
      ) ?? MySelf_COM_LIB;
    libs.unshift(myselfLib);
    return libs;
  } else {
    libs = appData.fileContent?.content?.comlibs.map((lib) => {
      if (lib.id === "_myself_") return lib;
      try {
        const legacyLib = legacyLibs.find(
          ({ namespace }) => lib.namespace === namespace
        );
        if (legacyLib && compareVersions(legacyLib.version, lib.version) >= 0) {
          lib.legacy = true;
        }
      } catch (error) {
        console.error(error);
      }
      return lib;
    });
    return libs;
  }
};

export const getLatestComLib = async (comlibs) => {
  const latestComlibs = await API.Material.getLatestComponentLibrariesByPOST(
    comlibs.filter((lib) => lib.id !== "_myself_").map((lib) => lib.namespace)
  ).then((libs: Array<any>) =>
    (libs ?? []).map((lib) => ({
      ...lib,
      ...compatContent(lib.content),
    }))
  );
  return { comlibs, latestComlibs };
};

const checkDeps = async (libs) => {
  for (let i = 0; i < libs.length; i++) {
    const lib = libs[i];
    if (typeof lib === 'string' || "externals" in lib || lib.id === "_myself_") continue;
    try {
      const material = await getLibExternals({
        namespace: lib.namespace,
        version: lib.version,
      });
      Object.assign(lib, material);
    } catch (error) {
      console.error("获取物料依赖失败\n", error);
    }
  }
  return libs;
};

const getLibExternals = ({ namespace, version }) => {
  return API.Material.getMaterialContent({
    namespace,
    version,
    codeType: "pure",
  }).then((lib) => {
    const content = compatContent(lib.content);
    return {
      ...lib,
      ...content,
    };
  });
};

const createScript = (url: string) => {
  if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
  const script = document.createElement("script");
  script.src = url;
  script.defer = true;
  return new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const createLink = (url: string) => {
  if (document.querySelector(`link[href="${url}"]`)) return Promise.resolve();
  const link = document.createElement("link");
  link.href = url;
  link.rel = "stylesheet";
  return new Promise((resolve, reject) => {
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

const insertDeps = async (libs) => {
  if (!libs.length) return libs;
  await Promise.all(
    libs.map((lib) => {
      return (typeof lib === 'object' && "externals" in lib) ? insertExternal(lib) : Promise.resolve();
    })
  );
  return libs;
};

const insertExternal = async (lib) => {
  const p = [];
  lib.externals?.forEach((it) => {
    const { library, urls } = it;
    if (Array.isArray(urls) && urls.length) {
      urls.forEach((url) => {
        if (url.endsWith(".js")) {
          if (library in window) return;
          p.push(createScript(url));
        }
        if (url.endsWith(".css")) {
          p.push(createLink(url));
        }
      });
    }
  });
  await Promise.all(p);
  return lib;
};

const composeAsync =
  (...fns) =>
    async (arg) =>
      fns.reduceRight(async (pre, fn) => fn(await pre), Promise.resolve(arg));

const getInitComLibs = composeAsync(
  getLatestComLib,
  insertDeps,
  checkDeps,
  getLibsFromConfig
);

const upgradeExternal = composeAsync(insertExternal, getLibExternals);

export { getInitComLibs, upgradeExternal, insertDeps };
