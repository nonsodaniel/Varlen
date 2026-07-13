import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { DigestService } from './digest.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, DigestService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
