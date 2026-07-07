import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { QueryFeedDto } from './dto/query-feed.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller('me/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryFeedDto,
  ) {
    return this.feedService.getFeed(userId, {
      type: query.type,
      circleId: query.circleId,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      cursor: query.cursor,
    });
  }
}
