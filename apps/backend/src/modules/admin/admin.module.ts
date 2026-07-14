import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WidgetDataController } from './widget-data.controller';

@Module({
  controllers: [AdminController, WidgetDataController],
  providers: [AdminService],
})
export class AdminModule {}
