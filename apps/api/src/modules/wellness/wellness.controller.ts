import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WellnessService } from './wellness.service';
import { CreateWellnessEntryDto } from './dto/create-wellness-entry.dto';
import { UpdateWellnessEntryDto } from './dto/update-wellness-entry.dto';
import { QueryWellnessDto } from './dto/query-wellness.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wellness')
@ApiBearerAuth()
@Controller('wellness')
export class WellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a wellness entry' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateWellnessEntryDto,
  ) {
    return this.wellnessService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List wellness entries' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryWellnessDto,
  ) {
    return this.wellnessService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wellness entry by ID' })
  findById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.wellnessService.findById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wellness entry' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWellnessEntryDto,
  ) {
    return this.wellnessService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wellness entry' })
  delete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.wellnessService.delete(userId, id);
  }
}
