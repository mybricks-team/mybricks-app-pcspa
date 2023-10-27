import { Logger } from "@mybricks/rocker-commons";
import { compressJsonObjectToZip } from "../../tools/zip";
import API from "@mybricks/sdk-for-app/api";

/**
 * 保存回滚数据
 */
export async function saveRollbackData(
  fileId: number,
  version: string,
  type: string,
  data: Record<string, unknown>
) {
  try {
    Logger.info("[publish] 正在保存回滚数据...");

    const content = await compressJsonObjectToZip(data);

    Logger.info(
      `[publish] 保存回滚数据部分参数: ${JSON.stringify({
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

    Logger.info("[publish] 保存回滚数据成功！");
  } catch (e) {
    Logger.error(`[publish] 保存回滚数据失败！ ${JSON.stringify(e, null, 2)}`);
  }
}
