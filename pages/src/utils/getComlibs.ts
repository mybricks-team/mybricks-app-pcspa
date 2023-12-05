import {
  MySelf_COM_LIB,
  PC_NORMAL_COM_LIB,
  CHARS_COM_LIB,
  BASIC_COM_LIB,
} from "../constants";
const legacyLibs =
  APP_TYPE === "react" ? [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB] : [];

const getLibsFromConfig = (appData: Record<string, any>) => {
  const libs = [];
  if (appData?.defaultComlibs?.length) {
    appData?.defaultComlibs.forEach((lib) => {
      const { namespace, content, version } = lib;
      const legacyLib = legacyLibs.find((lib) => lib.namespace === namespace);
      const { editJs, rtJs, coms } = JSON.parse(content);
      if (legacyLib) {
        libs.push({ id: legacyLib.id, namespace, version, editJs, rtJs, coms });
      } else {
        libs.push({ ...lib, editJs, rtJs, coms });
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
    return appData.fileContent?.content?.comlibs;
  }
};

export { getLibsFromConfig };
