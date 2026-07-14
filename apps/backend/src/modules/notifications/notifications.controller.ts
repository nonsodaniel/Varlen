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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
    private readonly preferencesService: NotificationPreferencesService,
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

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences(
    @CurrentUser('sub') userId: string,
    @Query('householdId') householdId?: string,
  ) {
    return this.preferencesService.getPreferences(userId, householdId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() data: {
      householdId?: string;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
      reminders?: boolean;
      activities?: boolean;
      chores?: boolean;
      events?: boolean;
      expenses?: boolean;
      system?: boolean;
      digestEnabled?: boolean;
      digestTime?: string;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    },
  ) {
    return this.preferencesService.updatePreferences(userId, data);
  }
}
