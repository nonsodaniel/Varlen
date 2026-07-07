import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LifeMode } from '@prisma/client';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { HouseholdMemberGuard } from '../../common/guards/household-member.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Households')
@ApiBearerAuth()
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new household' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.householdsService.create(userId, dto);
  }

  @Get(':householdId')
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Get household details' })
  async findById(@Param('householdId') householdId: string) {
    return this.householdsService.findById(householdId);
  }

  @Patch(':householdId')
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update household details (owner only)' })
  async update(
    @Param('householdId') householdId: string,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.householdsService.update(householdId, dto);
  }

  @Delete(':householdId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete household (owner only)' })
  async delete(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdsService.delete(householdId, userId);
  }

  @Get(':householdId/members')
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'List household members' })
  async getMembers(@Param('householdId') householdId: string) {
    return this.householdsService.getMembers(householdId);
  }

  @Post(':householdId/invite')
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Generate invite code (owner only)' })
  async generateInviteCode(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdsService.generateInviteCode(householdId, userId);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a household via invite code' })
  async joinByCode(
    @Body() dto: JoinHouseholdDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdsService.joinByCode(dto.inviteCode, userId);
  }

  @Post(':householdId/leave')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HouseholdMemberGuard)
  @ApiOperation({ summary: 'Leave a household (non-owner members)' })
  async leave(
    @Param('householdId') householdId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdsService.leave(householdId, userId);
  }

  @Delete(':householdId/members/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Remove a member from the household (owner only)' })
  async removeMember(
    @Param('householdId') householdId: string,
    @Param('userId') memberUserId: string,
    @CurrentUser('sub') requestingUserId: string,
  ) {
    return this.householdsService.removeMember(
      householdId,
      memberUserId,
      requestingUserId,
    );
  }

  @Patch(':householdId/members/:userId/role')
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  async updateMemberRole(
    @Param('householdId') householdId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('sub') requestingUserId: string,
  ) {
    return this.householdsService.updateMemberRole(
      householdId,
      memberUserId,
      dto.role,
      requestingUserId,
    );
  }

  @Patch(':householdId/mode')
  @UseGuards(HouseholdMemberGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Change household life mode (owner only)' })
  async changeMode(
    @Param('householdId') householdId: string,
    @Body('mode') mode: LifeMode,
    @CurrentUser('sub') userId: string,
  ) {
    return this.householdsService.changeMode(householdId, mode, userId);
  }
}
