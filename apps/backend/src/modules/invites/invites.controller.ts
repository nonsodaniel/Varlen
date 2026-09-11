import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Invites')
@ApiBearerAuth()
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('circles/:circleId/invites')
  async createInvite(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.createInvite(circleId, userId, dto);
  }

  @Get('circles/:circleId/invites')
  async getCircleInvites(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
  ) {
    return this.invitesService.getCircleInvites(circleId, userId);
  }

  @Get('me/invites')
  async getIncomingInvites(@CurrentUser('sub') userId: string) {
    return this.invitesService.getIncomingInvites(userId);
  }

  @Public()
  @Get('invites/:token')
  async getInviteByToken(@Param('token') token: string) {
    return this.invitesService.getInviteByToken(token);
  }

  @Post('invites/:token/accept')
  async acceptInvite(
    @CurrentUser('sub') userId: string,
    @Param('token') token: string,
  ) {
    return this.invitesService.acceptInvite(token, userId);
  }

  @Post('invites/:token/decline')
  async declineInvite(
    @CurrentUser('sub') userId: string,
    @Param('token') token: string,
  ) {
    return this.invitesService.declineInvite(token, userId);
  }

  @Post('circles/:circleId/invites/:inviteId/resend')
  async resendInvite(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitesService.resendInvite(circleId, inviteId, userId);
  }

  @Delete('circles/:circleId/invites/:inviteId')
  async revokeInvite(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitesService.revokeInvite(circleId, inviteId, userId);
  }
}
