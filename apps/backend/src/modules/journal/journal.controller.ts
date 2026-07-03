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
import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { QueryJournalDto } from './dto/query-journal.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Journal')
@ApiBearerAuth()
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a journal entry' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.journalService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List journal entries' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryJournalDto,
  ) {
    return this.journalService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a journal entry by ID' })
  findById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.journalService.findById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journal entry' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
  ) {
    return this.journalService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a journal entry' })
  delete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.journalService.delete(userId, id);
  }
}
