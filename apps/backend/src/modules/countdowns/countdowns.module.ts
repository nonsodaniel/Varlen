import { Module } from '@nestjs/common';
import { CountdownsController } from './countdowns.controller';
import { CountdownsService } from './countdowns.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CountdownsController],
  providers: [CountdownsService],
  exports: [CountdownsService],
})
export class CountdownsModule {}
