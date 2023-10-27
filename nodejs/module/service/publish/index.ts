import * as fs from "fs";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { getComboScriptText } from "./generateComLib";
import { Logger } from "@mybricks/rocker-commons";
import { getNextVersion, getRealDomain } from "../../tools/analysis";
import { getAppTypeFromTemplate } from "../../tools/common";
import { handleTemplate } from "./handle-template";
import { localization } from "./localization";
import { publishPush } from "./push";
import { saveRollbackData } from "./save-rollback-data";

let app_type;

export async function publish(
  req,
  { json, userId, fileId, envType, commitInfo }
) {
  try {
    const publishFilePath = path.resolve(__dirname, "../../../../assets");

    let template = fs.readFileSync(publishFilePath + "/publish.html", "utf8");

    app_type = getAppTypeFromTemplate(template);
    Logger.info(`[publish] app_type: ${app_type}`);
    Logger.info(template);
    const {
      title,
      comlibs,
      projectId,
      fileName,
      folderPath,
      publisherEmail,
      publisherName,
      groupId,
      groupName,
      envList = [],
      appConfig = {},
    } = json.configuration;

    Reflect.deleteProperty(json, "configuration");

    /** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
    const domainName =
      process.env.NODE_ENV === "development"
        ? process.env.MYBRICKS_PLATFORM_ADDRESS
        : getRealDomain(req);

    Logger.info(`[publish] domainName is: ${domainName}`);

    Logger.info("[publish] getLatestPub begin");

    const latestPub = (
      await API.File.getLatestPub({
        fileId,
        type: envType,
      })
    )?.[0];

    Logger.info(`[publish] getLatestPub ok`);

    const version = getNextVersion(latestPub?.version);

    /** 处理发布模板 */
    const {
      hasOldComLib,
      needCombo,
      comlibRtName,
      template: _template,
    } = await handleTemplate({
      json,
      template,
      fileId,
      envType,
      comlibs,
      title,
      envList,
      projectId,
      version,
    });
    template = _template;

    /** 资源本地化 */
    const {
      globalDeps,
      images,
      template: __template,
    } = await localization({ req, appConfig, template, app_type });
    template = __template;

    const comboScriptText = await getComboScriptText(
      comlibs,
      json,
      {
        domainName,
        fileId,
        noThrowError: hasOldComLib,
        app_type,
      },
      needCombo
    );

    /** 推送数据 */
    const result = await publishPush(
      {
        envType,
        fileId,
        title,
        publisherEmail,
        publisherName,
        version,
        commitInfo,
        groupId,
        groupName,
        json,
        template,
        needCombo,
        comboScriptText,
        images,
        globalDeps,
        folderPath,
        domainName,
        comlibRtName,
        fileName,
        userId,
      },
      true
    );

    // TODO: 待优化，直接保存 JSON 太大了，想办法拆一下
    /** 保存回滚数据 */
    saveRollbackData(fileId, version, envType, {
      envType,
      fileId,
      title,
      publisherEmail,
      publisherName,
      version,
      commitInfo,
      groupId,
      groupName,
      json,
      template,
      needCombo,
      comboScriptText,
      images,
      globalDeps,
      folderPath,
      domainName,
      comlibRtName,
      fileName,
      userId,
    });

    return result;
  } catch (e) {
    Logger.error(
      `[publish] pcpage publish error ${
        e?.message || JSON.stringify(e, null, 2)
      }`
    );
    throw e;
  }
}
