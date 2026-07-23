import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WidgetDataController } from './widget-data.controller';
import { FeatureFlagSeeder } from './feature-flag.seeder';

@Module({
  controllers: [AdminController, WidgetDataController],
  providers: [AdminService, FeatureFlagSeeder],
})
export class AdminModule {}
