import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async readiness() {
    const services: Record<string, string> = {
      database: 'down',
      redis: 'down',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'up';
    } catch {
      // database is down
    }

    try {
      const client = this.redis.getClient();
      await client.ping();
      services.redis = 'up';
    } catch {
      // redis is down
    }

    const allUp = Object.values(services).every((s) => s === 'up');

    if (!allUp) {
      throw new HttpException(
        { status: 'error', services },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      services,
    };
  }
}
