import * as fs from "fs";
import * as path from "path";
import API from "@mybricks/sdk-for-app/api";
import { getComboScriptText } from "./generateComLib";
import { Logger } from "@mybricks/rocker-commons";
import { getNextVersion } from "../../tools/analysis";
import { getAppTypeFromTemplate } from "../../tools/common";
import { handleTemplate } from "./handle-template";
import { localization } from "./localization";
import { publishPush } from "./push";
import { saveRollbackData } from "./save-rollback-data";

let app_type;

export async function publish(
  req,
  { json, userId, fileId, envType, commitInfo, appConfig }
) {
  try {
    const publishFilePath = path.resolve(__dirname, "../../../../assets");

    let template = fs.readFileSync(publishFilePath + "/publish.html", "utf8");

    app_type = getAppTypeFromTemplate(template);
    Logger.info(`[publish] app_type: ${app_type}`);
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
      i18nLangContent,
      pageHeader,
    } = json.configuration;
    console.log(pageHeader, 'pageHeader')
    Reflect.deleteProperty(json, "configuration");

    /** 本地测试 根目录 npm run start:nodejs，调平台接口需要起平台（apaas-platform）服务 */
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
      pageHeader,
      envList,
      projectId,
      version,
      i18nLangContent,
    });
    template = _template;

    /** 资源本地化 */
    const {
      globalDeps,
      images,
      template: __template,
    } = await localization({ req, appConfig, template, app_type, json, hasOldComLib });
    template = __template;

    const startComboScriptTime = Date.now();

    Logger.info(`[publish] 开始处理组件库脚本`);

    const comboScriptText = await getComboScriptText(
      comlibs,
      json,
      {
        fileId,
        noThrowError: hasOldComLib,
        app_type,
      },
      needCombo
    );

    Logger.info(`[publish] 处理组件库脚本完成，耗时：${(Date.now() - startComboScriptTime) / 1000}s`);

    const params = {
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
      projectId,
      comlibRtName,
      fileName,
      userId,
    };
    const result = await publishPush(params, version, true);

    /** 保存回滚数据 */
    await saveRollbackData(fileId, version, envType, params);

    return { ...result, fileId, envType, version };
  } catch (e) {
    Logger.error(
      `[publish] pcpage publish error ${e?.message || JSON.stringify(e, null, 2)
      }`
    );
    throw e;
  }
}
