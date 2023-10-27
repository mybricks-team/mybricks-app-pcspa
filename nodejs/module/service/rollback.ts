import * as fs from "fs";
import { Logger } from "@mybricks/rocker-commons";
import { decompressZipToJsonObject } from "../tools/zip";
import { getRealDomain } from "../tools/analysis";
import { publishPush } from "./publish/push";

export async function rollback(req: any, filePath: string) {
  // TODO: 回滚重试机制
  // TODO: 优化压缩包体积，可以和发布集成推送数据大小优化一起，不用单独优化

  try {
    const domainName =
      process.env.NODE_ENV === "development"
        ? process.env.MYBRICKS_PLATFORM_ADDRESS
        : getRealDomain(req);

    Logger.info(`[publish] domainName is: ${domainName}`);
    Logger.info(`[rollback] 正在下载回滚数据 zip 包...`);

    const zipContent = fs.readFileSync(filePath);

    Logger.info(`[rollback] 回滚数据 zip 包下载完成！`);
    Logger.info(`[rollback] 正在进行解压...`);

    const params = await decompressZipToJsonObject(zipContent);

    Logger.info(`[rollback] 解压完成！`);
    Logger.info(`[rollback] 正在进行发布...`);

    await publishPush(params, false);

    Logger.info(`[rollback] 发布完成`);
  } catch (e) {
    Logger.error(`回滚失败！ ${e?.message || JSON.stringify(e, null, 2)}`);
    throw e;
  }
}
