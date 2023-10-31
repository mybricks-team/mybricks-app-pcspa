import * as fs from "fs";
import { Logger } from "@mybricks/rocker-commons";
import { decompressGzipToObject } from "../tools/zip";
import { getRealDomain } from "../tools/analysis";
import { publishPush } from "./publish/push";
import { saveRollbackData } from "./publish/save-rollback-data";

export async function rollback(
  req: any,
  filePath: string,
  rollbackDataParams: { nowVersion: string; fileId: number; type: string },
  retry: number = 0
) {
  if (retry !== 0) {
    Logger.info(`[rollback] 第${retry}次重试回滚...`);
  }

  let zipContent: Buffer;

  try {
    const domainName =
      process.env.NODE_ENV === "development"
        ? process.env.MYBRICKS_PLATFORM_ADDRESS
        : getRealDomain(req);

    Logger.info(`[rollback] domainName is: ${domainName}`);
    Logger.info(`[rollback] 正在读取回滚数据 zip 包...`);

    zipContent = fs.readFileSync(filePath);

    Logger.info(`[rollback] 回滚数据 zip 包读取完成！`);
    Logger.info(`[rollback] 正在进行解压...`);

    const params = await decompressGzipToObject(zipContent);

    Logger.info(`[rollback] 解压完成！`);
    Logger.info(`[rollback] 正在进行发布...`);

    await publishPush(params, rollbackDataParams.nowVersion, false);

    Logger.info(`[rollback] 发布完成`);
  } catch (e) {
    Logger.error(`回滚失败！ ${e?.message || JSON.stringify(e, null, 2)}`);
    if (retry >= 3) throw e;
    await rollback(req, filePath, rollbackDataParams, retry + 1);
  }

  /** 保存回滚数据 */
  saveRollbackData(
    rollbackDataParams.fileId,
    rollbackDataParams.nowVersion,
    rollbackDataParams.type,
    zipContent
  );
}
