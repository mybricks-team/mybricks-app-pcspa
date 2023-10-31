import {
  Req,
  Post,
  Body,
  Inject,
  Controller,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
// 别把 /index 删了，平台有脏数据
import Service from "./service/index";
import { Logger } from "@mybricks/rocker-commons";
import Decorator from "@mybricks/sdk-for-app/decorator";
import * as fs from "fs";
import * as path from "path";
import { getAppTypeFromTemplate } from "./tools/common";
const pkg = require("../../package.json");
const template = fs.readFileSync(
  path.resolve(__dirname, "../../assets") + "/publish.html",
  "utf8"
);
const app_type = getAppTypeFromTemplate(template);

@Decorator.Controller("api/pcpage", {
  namespace: pkg.appConfig[app_type].name ?? pkg.name,
})
export default class PcPageController {
  service: Service;

  constructor() {
    this.service = new Service();
  }

  @Post("/publish")
  async publish(
    @Body("userId") userId: string,
    @Body("fileId") fileId: number,
    @Body("json") json: any,
    @Body("envType") envType: string,
    @Body("commitInfo") commitInfo: string,

    // @Body('manateeUserInfo') manateeUserInfo: {token: string, session: string},
    @Req() req: any
  ) {
    if (!isDefined(json) || !isDefined(userId) || !isDefined(fileId)) {
      return { code: 0, message: "参数 json、userId、fileId 不能为空" };
    }
    try {
      Logger.info("[publish] 调用发布接口");
      const startTime = Date.now();

      const result = await this.service.publish(req, {
        json,
        userId,
        fileId,
        envType,
        commitInfo,
      });

      Logger.info("[publish] 发布成功！");
      Logger.info(
        `[publish] 发布时长：${String((Date.now() - startTime) / 1000)}s`
      );
      return {
        code: 1,
        data: result,
        message: "发布完成",
      };
    } catch (error) {
      Logger.error("[publish] 发布失败: ", error);
      return {
        code: -1,
        message: error.message || "发布失败",
      };
    }
  }

  @Post("/upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file, @Req() req) {
    return await this.service.upload(req, { file });
  }

  @Post("/rollback")
  async rollback(
    @Body("filePath") filePath: string,
    @Body("nowVersion") nowVersion: string,
    @Req() req: any
  ) {
    try {
      Logger.info(`[rollback] 调用回滚接口`);

      const startTime = Date.now();
      const result = await this.service.rollback(req, filePath, nowVersion);

      Logger.info("[rollback] 回滚成功！");
      Logger.info(
        `[rollback] 回滚时长：${String((Date.now() - startTime) / 1000)}s`
      );

      return {
        code: 1,
        data: result,
        message: "回滚完成",
      };
    } catch (error) {
      Logger.error(
        `[rollback] 回滚失败: ${
          error?.message || JSON.stringify(error, null, 2)
        }`
      );
      return {
        code: -1,
        message: error?.message || "回滚失败",
      };
    }
  }

  // @Post("/testPublish")
  // async testPublish(
  //   @Body("version") version: string,
  //   @Body("content") content: any
  // ) {
  //   Logger.info(`content.js[0].name JD==> ${content.js[0].name}`,);
  //   Logger.info(`version JD==> ${version}`, );
  // }

  // @Post('/generateHTML')
  // async generateHTML(
  //   @Body('userId') userId: string,
  //   @Body('fileId') fileId: number,
  //   @Body('json') json: any,
  //   @Req() req: any
  // ) {
  // 	if (!isDefined(json) || !isDefined(fileId)) {
  // 		return { code: 0, message: '参数 json、fileId 不能为空' };
  // 	}

  // 	const res = await this.service.generateHTML(req, { json, fileId });

  // 	return res.code !== 1 ? { code: 0, message: res.error } : { code: 1, data: { bundle: res.data, ext_name: 'html' } };
  // }
}

export function isDefined(v: any) {
  return v !== undefined;
}
