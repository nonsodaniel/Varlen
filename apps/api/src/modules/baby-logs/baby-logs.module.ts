import { Module } from '@nestjs/common';
import { BabyLogsController } from './baby-logs.controller';
import { BabyLogsService } from './baby-logs.service';

@Module({
  controllers: [BabyLogsController],
  providers: [BabyLogsService],
  exports: [BabyLogsService],
})
export class BabyLogsModule {}
