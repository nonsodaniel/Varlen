import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiContextService } from './ai-context.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiContextService],
  exports: [AiService],
})
export class AiModule {}
