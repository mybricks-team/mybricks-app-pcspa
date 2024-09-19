import * as fs from "fs";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";
import { TProcessor } from "./type";

import { APPType } from "../../types";

const templatePath = path.resolve(__dirname, "../../../../assets/publish.html");


const initParam: TProcessor = async (ctx) => {
  let template = fs.readFileSync(templatePath, "utf8");
  ctx.template = template
  ctx.app_type = getAppTypeFromTemplate(template);
  Logger.info(`[publish] app_type: ${ctx.app_type}`);

  ctx.configuration = { ...ctx.json.configuration }
  Reflect.deleteProperty(ctx.json, "configuration");

  /** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
  Logger.info("[publish] getLatestPub begin");

  const latestPub = (
    await API.File.getLatestPub({
      fileId: ctx.fileId,
      type: ctx.envType,
    })
  )?.[0];

  Logger.info(`[publish] getLatestPub ok`);

  const version = getNextVersion(latestPub?.version);
  Logger.info(`[publish] next version is begin ${version}`);
  ctx.version = version
}

export default initParam


const getAppTypeFromTemplate = (template: string) => {
  let app_type = APPType.React;
  try {
    const APP_TYPE_COMMIT = Array.from(template.match(/<!--(.*?)-->/g)).find(
      (matcher) => matcher.includes("_APP_TYPE_")
    );
    if (APP_TYPE_COMMIT.includes(APPType.Vue2)) {
      app_type = APPType.Vue2;
    }
    if (APP_TYPE_COMMIT.includes(APPType.Vue3)) {
      app_type = APPType.Vue3;
    }
    if (APP_TYPE_COMMIT.includes(APPType.React)) {
      app_type = APPType.React;
    }
  } catch (error) {
    Logger.error("template need appType");
  }
  return app_type;
};


function getNextVersion(version, max = 100) {
  if (!version) return "1.0.0";
  const vAry = version.split(".");
  let carry = false;
  const isMaster = vAry.length === 3;
  if (!isMaster) {
    max = -1;
  }

  for (let i = vAry.length - 1; i >= 0; i--) {
    const res = Number(vAry[i]) + 1;
    if (i === 0) {
      vAry[i] = res;
    } else {
      if (res === max) {
        vAry[i] = 0;
        carry = true;
      } else {
        vAry[i] = res;
        carry = false;
      }
    }
    if (!carry) break;
  }

  return vAry.join(".");
}