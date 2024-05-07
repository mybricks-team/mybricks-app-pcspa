import { Logger } from "@mybricks/rocker-commons";
import { compressObjectToGzip } from "../../tools/zip";
import API from "@mybricks/sdk-for-app/api";
import { TProcessor } from "./type";
const Buffer = require("buffer").Buffer;

function isBuffer(variable): variable is Buffer {
    return Buffer.isBuffer(variable);
}

const saveRoll: TProcessor = async (ctx) => {
    const { publisherEmail, publisherName, title, groupId, groupName, folderPath, projectId, fileName } = ctx.configuration
    const { fileId, envType, version, commitInfo, json, template, needCombo, comboScriptText, images, globalDeps, comlibRtName, userId } = ctx
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
    await saveRollbackData(fileId, version, envType, params, 0);
}

export default saveRoll

/**
 * 保存回滚数据
 */
export async function saveRollbackData(
    fileId: number,
    version: string,
    type: string,
    data: Record<string, unknown> | Buffer,
    retry: number = 0
) {
    if (retry !== 0) {
        Logger.info(`[saveRollbackData] 第${retry}次重试保存回滚数据...`);
    }

    try {
        Logger.info("[saveRollbackData] 正在保存回滚数据...");

        const content = !isBuffer(data) ? await compressObjectToGzip(data) : data;

        Logger.info(
            `[saveRollbackData] 保存回滚数据部分参数: ${JSON.stringify({
                fileId,
                version,
                type,
            })}`
        );

        await API.Upload.saveProducts({
            fileId,
            version,
            type,
            content,
        });

        Logger.info("[saveRollbackData] 保存回滚数据成功！");
    } catch (e) {
        Logger.error(
            `[saveRollbackData] 保存回滚数据失败！ ${e?.message || JSON.stringify(e, null, 2)
            }`
        );
        if (retry >= 3) return;
        await saveRollbackData(fileId, version, type, data, retry + 1);
    }
}
