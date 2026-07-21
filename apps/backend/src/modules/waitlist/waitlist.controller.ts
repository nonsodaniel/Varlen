import { Controller, Post, Get, Delete, Body, Query, Param, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Join the waitlist' })
  async join(@Body() dto: JoinWaitlistDto, @Req() req: any) {
    // Try to detect country from common reverse-proxy headers
    const country =
      req.headers['cf-ipcountry'] ||          // Cloudflare
      req.headers['x-vercel-ip-country'] ||    // Vercel
      req.headers['x-country-code'] ||         // Railway / generic
      null;

    return this.waitlistService.join(dto, country);
  }

  // ── Admin endpoints (protected by JWT auth guard) ──

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all waitlist entries (admin)' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.waitlistService.getAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get waitlist statistics (admin)' })
  async stats() {
    return this.waitlistService.getStats();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a waitlist entry (admin)' })
  async remove(@Param('id') id: string) {
    return this.waitlistService.delete(id);
  }
}
