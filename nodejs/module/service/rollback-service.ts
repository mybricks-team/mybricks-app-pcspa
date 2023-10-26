import { Injectable } from "@nestjs/common";
import { Logger } from "@mybricks/rocker-commons";
import axios from "axios";
import { decompressZipToJsonObject } from "../tools/zip";
import { publishPush } from "./service";
import { getRealDomain } from "../tools/analysis";

@Injectable()
export default class RollbackService {
  async rollback(req: any, zipUrl: string) {
    try {
      const domainName =
        process.env.NODE_ENV === "development"
          ? process.env.MYBRICKS_PLATFORM_ADDRESS
          : getRealDomain(req);

      Logger.info(`[publish] domainName is: ${domainName}`);

      Logger.info(`[rollback] 正在下载回滚数据 zip 包...`);
      const response = await axios.get(`${domainName}/${zipUrl}`, { responseType: "arraybuffer" });
      const zipContent = response.data;
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
}
