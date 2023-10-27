import { Injectable } from "@nestjs/common";
import { publish } from "./publish";
import { upload } from "./upload";
import { rollback } from "./rollback";

@Injectable()
export default class PcPageService {
  async publish(req, { json, userId, fileId, envType, commitInfo }) {
    return await publish(req, { json, userId, fileId, envType, commitInfo });
  }

  async upload(req, { file }, { groupId = "" } = {}) {
    return await upload(req, { file }, { groupId });
  }

  async rollback(req: any, zipUrl: string) {
    return await rollback(req, zipUrl);
  }
}
