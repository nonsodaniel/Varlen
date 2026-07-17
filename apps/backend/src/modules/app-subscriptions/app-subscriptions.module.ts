import { Module } from '@nestjs/common';
import { AppSubscriptionsController } from './app-subscriptions.controller';
import { AppSubscriptionsWebhookController } from './app-subscriptions-webhook.controller';
import { AppSubscriptionsService } from './app-subscriptions.service';

@Module({
  controllers: [AppSubscriptionsController, AppSubscriptionsWebhookController],
  providers: [AppSubscriptionsService],
  exports: [AppSubscriptionsService],
})
export class AppSubscriptionsModule {}
