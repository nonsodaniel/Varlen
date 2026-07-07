import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SharingService } from './sharing.service';
import { ShareItemDto } from './dto/share-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sharing')
@ApiBearerAuth()
@Controller('items/:entityType/:entityId')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post('share')
  async shareItem(
    @CurrentUser('sub') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: ShareItemDto,
  ) {
    return this.sharingService.shareItem(entityType, entityId, userId, dto);
  }

  @Get('shares')
  async getItemShares(
    @CurrentUser('sub') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.sharingService.getItemShares(entityType, entityId, userId);
  }

  @Delete('shares/:shareId')
  async removeShare(
    @CurrentUser('sub') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('shareId') shareId: string,
  ) {
    return this.sharingService.removeShare(entityType, entityId, shareId, userId);
  }
}
