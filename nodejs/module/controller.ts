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
import Service from "./service";
import { Logger } from "@mybricks/rocker-commons";

@Controller("api/pcpage")
export default class PcPageController {
  @Inject(Service)
  service: Service;

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
  async rollback(@Body("assetUrl") assetUrl: string, @Req() req: any) {
    try {
      Logger.info(`[rollback] 调用回滚接口`);

      const startTime = Date.now();
      const result = await this.service.rollback(req, assetUrl);

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
      Logger.error(`[rollback] 回滚失败: ${error?.message || JSON.stringify(error, null, 2)}`);
      return {
        code: -1,
        message: error?.message || "回滚失败",
      };
    }
  }

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
