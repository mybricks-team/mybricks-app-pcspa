import { Injectable } from "@nestjs/common";
import publish from './publishEntry';
import { searchUser } from "./seachUser";
import { upload } from "./upload";
import { rollback } from "./rollback";
import { downloadProduct } from "./download-product";
import publishToCom from "./publishToCom";

@Injectable()
export default class PcPageService {
  async publish(req, { json, userId, fileId, envType, commitInfo, appConfig }) {
    // return await publish(req, { json, userId, fileId, envType, commitInfo, appConfig });
    return await publish({ req, json, userId, envType, fileId, commitInfo, appConfig, imagesPath: new Set() })
  }

  async upload(req, { file }, { groupId = "" } = {}) {
    return await upload(req, { file }, { groupId });
  }

  async rollback(
    req: any,
    filePath: string,
    rollbackDataParams: { nowVersion: string; fileId: number; type: string }
  ) {
    return await rollback(req, filePath, rollbackDataParams);
  }

  async searchUser(params: { keyword: string }) {
    return await searchUser(params);
  }

  async downloadProduct(
    res: any,
    params: { fileId: number; envType: string; version: string }
  ) {
    return await downloadProduct(res, params);
  }

  async publishToCom(params: any) {
    const { json, userId, envType, fileId, componentName, hostname, toLocalType, origin, staticResourceToCDN } = params

    return await publishToCom({ json, userId, envType, fileId, componentName, hostname, toLocalType, origin, staticResourceToCDN })
  }
}
