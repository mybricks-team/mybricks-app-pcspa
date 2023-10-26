import { Module } from '@nestjs/common'

import Service from './service/service'
import Controller from './controller'

@Module({
  controllers: [Controller],
  providers: [Service],
  exports: [Service],
})
export default class PcPageModule {}
