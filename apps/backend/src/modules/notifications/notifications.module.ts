import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { DigestService } from './digest.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, DigestService, NotificationPreferencesService],
  exports: [NotificationsService, PushService, NotificationPreferencesService],
})
export class NotificationsModule {}
