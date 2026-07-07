import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CirclesService } from './circles.service';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Circles')
@ApiBearerAuth()
@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get('me')
  async getMyCircles(@CurrentUser('sub') userId: string) {
    return this.circlesService.getUserCircles(userId);
  }

  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCircleDto,
  ) {
    return this.circlesService.create(userId, dto);
  }

  @Get(':circleId')
  async findById(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
  ) {
    return this.circlesService.findById(circleId, userId);
  }

  @Patch(':circleId')
  async update(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
    @Body() dto: UpdateCircleDto,
  ) {
    return this.circlesService.update(circleId, userId, dto);
  }

  @Delete(':circleId')
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('circleId') circleId: string,
  ) {
    return this.circlesService.delete(circleId, userId);
  }
}
