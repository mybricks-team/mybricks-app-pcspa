import { Module } from '@nestjs/common'

import Service from './service/service'
import RollbackService from './service/rollback-service'
import Controller from './controller'

@Module({
  controllers: [Controller],
  providers: [Service, RollbackService],
  exports: [Service, RollbackService],
})
export default class PcPageModule {}
