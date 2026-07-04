import { Module } from '@nestjs/common';
import { BabyLogsController } from './baby-logs.controller';
import { BabyLogsService } from './baby-logs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BabyLogsController],
  providers: [BabyLogsService],
  exports: [BabyLogsService],
})
export class BabyLogsModule {}
