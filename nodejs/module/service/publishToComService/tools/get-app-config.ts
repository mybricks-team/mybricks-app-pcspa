import { Logger } from "@mybricks/rocker-commons";
import API from "@mybricks/sdk-for-app/api";

export const APP_NAME = "mybricks-app-pc-cdm";

// 不传groupId表示获取的是全局配置
export const getAppConfig = async ({ groupId } = {} as any) => {
  const options = !!groupId ? { type: "group", id: groupId } : {};
  const res = (await API.Setting.getSetting([APP_NAME], options)) as any;

  let config = {} as any;
  const originConfig = res[APP_NAME]?.config || {};
  try {
    config =
      typeof originConfig === "string"
        ? JSON.parse(originConfig)
        : originConfig;
  } catch (e) {
    // @ts-ignore 不知道为啥 catch 出来的 error 是 unknow type
    Logger.error("[云组件(pc-react)发布] getAppConfig error", e);
  }
  return config;
};
