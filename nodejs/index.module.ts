import { Module } from '@nestjs/common'

import PcModule from './module/module'

@Module({
	imports: [PcModule]
})

export default class IndexModule {}
