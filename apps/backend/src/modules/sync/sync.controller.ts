import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncPullDto } from './dto/sync-pull.dto';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(
    @CurrentUser('sub') userId: string,
    @CurrentUser('householdId') householdId: string,
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.push(userId, householdId, dto);
  }

  @Get('pull')
  pull(
    @CurrentUser('sub') userId: string,
    @CurrentUser('householdId') householdId: string,
    @Query() query: SyncPullDto,
  ) {
    return this.syncService.pull(userId, householdId, query.since, query.version);
  }

  @Post('checkpoint')
  checkpoint(
    @CurrentUser('sub') userId: string,
    @Body('deviceId') deviceId: string,
    @Body('version') version: number,
  ) {
    return this.syncService.updateCheckpoint(userId, deviceId, version);
  }
}
