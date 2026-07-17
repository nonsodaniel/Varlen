import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppSubscriptionsService } from './app-subscriptions.service';
import { VerifyReceiptDto } from './dto/verify-receipt.dto';
import { ShareFamilyDto } from './dto/share-family.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('App Subscriptions')
@ApiBearerAuth()
@Controller('app-subscriptions')
export class AppSubscriptionsController {
  constructor(private readonly service: AppSubscriptionsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current subscription status' })
  getStatus(@CurrentUser('sub') userId: string) {
    return this.service.getStatus(userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify and record a purchase receipt' })
  verify(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyReceiptDto,
  ) {
    return this.service.verifyAndRecord(userId, dto);
  }

  @Get('family/members')
  @ApiOperation({ summary: 'Get family plan members' })
  getFamilyMembers(@CurrentUser('sub') userId: string) {
    return this.service.getFamilyMembers(userId);
  }

  @Post('family/share')
  @ApiOperation({ summary: 'Share family plan with another user' })
  shareFamilyPlan(
    @CurrentUser('sub') userId: string,
    @Body() dto: ShareFamilyDto,
  ) {
    return this.service.shareFamilyPlan(userId, dto.userId);
  }
}
