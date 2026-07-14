import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getRecentUsers(page || 1, limit || 20);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs (paginated)' })
  getAuditLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getRecentAuditLogs(page || 1, limit || 50);
  }

  @Get('households')
  @ApiOperation({ summary: 'List all households (paginated)' })
  getHouseholds(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getHouseholdOverview(page || 1, limit || 20);
  }
}
