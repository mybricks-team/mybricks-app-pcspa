import { Module } from '@nestjs/common'
// 别把 /index 删了，平台有脏数据
import Service from './service/index'
import Controller from './controller'

@Module({
  controllers: [Controller],
  providers: [Service],
  exports: [Service],
})
export default class PcPageModule {}
