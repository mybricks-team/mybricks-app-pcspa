import {
  Req,
  Post,
  Body,
  Inject,
  Controller
} from '@nestjs/common'

import Service from './service'

@Controller('api/pcpage')
export default class PcPageController {
  @Inject(Service)
  service: Service

  @Post('/publish')
  async publish(
    @Body('userId') userId: string,
    @Body('fileId') fileId: number,
    @Body('json') json: any,
    @Body('envType') envType: 'test' | 'prod',
    @Body('manateeUserInfo') manateeUserInfo: {token: string, session: string},
    @Req() req: any
	) {
		if (!isDefined(json) || !isDefined(userId) || !isDefined(fileId)) {
			return { code: 0, message: '参数 json、userId、fileId 不能为空' };
		}
		
		const error = await this.service.publish(req, { json, userId, fileId, envType, manateeUserInfo });
		
		return error ? { code: 0, message: error } : { code: 1, message: '发布完成' };
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
  return v !== undefined
}
