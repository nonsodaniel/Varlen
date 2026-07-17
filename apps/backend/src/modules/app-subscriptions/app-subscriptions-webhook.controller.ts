import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { AppSubscriptionsService } from './app-subscriptions.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class AppSubscriptionsWebhookController {
  private readonly logger = new Logger(AppSubscriptionsWebhookController.name);
  private hasWarnedNoSecret = false;

  constructor(
    private readonly service: AppSubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  @Post('revenuecat')
  @Public()
  @ApiOperation({ summary: 'RevenueCat webhook endpoint' })
  async handleRevenueCatWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
  ) {
    const secret = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET');

    if (!secret) {
      if (!this.hasWarnedNoSecret) {
        this.logger.warn(
          'REVENUECAT_WEBHOOK_SECRET is not configured — webhook verification is disabled. Set this in production.',
        );
        this.hasWarnedNoSecret = true;
      }
    } else if (authHeader !== `Bearer ${secret}`) {
      this.logger.warn('Invalid webhook authorization');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return this.service.handleWebhookEvent(body);
  }
}
