import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  @Post('push-token')
  registerPushToken(
    @CurrentUser('sub') userId: string,
    @Body() body: { token: string; platform: string },
  ) {
    return this.pushService.saveToken(userId, body.token, body.platform);
  }

  @Delete('push-token')
  removePushToken(@Body() body: { token: string }) {
    return this.pushService.removeToken(body.token);
  }

  @Get()
  findAll(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Delete(':id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.delete(userId, id);
  }
}
