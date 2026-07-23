import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [NotificationsModule, EmailModule],
  providers: [JobsService],
})
export class JobsModule {}
