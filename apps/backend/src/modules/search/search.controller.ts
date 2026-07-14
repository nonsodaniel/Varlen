import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('households/:householdId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across all resources in a household' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated: tasks,events,expenses,lists,meals,memories,goals' })
  search(
    @Param('householdId') householdId: string,
    @Query('q') query: string,
    @Query('types') types?: string,
  ) {
    const typeList = types ? types.split(',').map(t => t.trim()) : undefined;
    return this.searchService.search(householdId, query, typeList);
  }
}
