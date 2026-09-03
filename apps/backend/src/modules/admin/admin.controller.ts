import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics with full platform data' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ── Feature Flags ──

  @Get('feature-flags')
  @ApiOperation({ summary: 'List all feature flags' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Get('feature-flags/enabled')
  @ApiOperation({ summary: 'List enabled feature flag keys (for mobile/client consumption)' })
  getEnabledFeatureFlags() {
    return this.adminService.getEnabledFeatureFlags();
  }

  @Patch('feature-flags/:id')
  @ApiOperation({ summary: 'Update a feature flag' })
  updateFeatureFlag(
    @Param('id') id: string,
    @Body() body: { label?: string; description?: string; enabled?: boolean; category?: string; phase?: string },
  ) {
    return this.adminService.updateFeatureFlag(id, body);
  }

  @Post('feature-flags/bulk')
  @ApiOperation({ summary: 'Bulk enable/disable feature flags by phase or category' })
  bulkUpdateFeatureFlags(
    @Body() body: { phase?: string; category?: string; enabled: boolean },
  ) {
    return this.adminService.bulkUpdateFeatureFlags(
      { phase: body.phase, category: body.category },
      body.enabled,
    );
  }

  // ── Users ──

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getRecentUsers(page || 1, limit || 20);
  }

  @Get('users/:id/detail')
  @ApiOperation({ summary: 'Get detailed admin view of a user' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getAdminUserDetail(id);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend a user' })
  unsuspendUser(@Param('id') id: string) {
    return this.adminService.unsuspendUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft-delete a user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.adminDeleteUser(id);
  }

  @Post('users/:id/notify')
  @ApiOperation({ summary: 'Send system notification to a user' })
  sendNotification(
    @Param('id') id: string,
    @Body() body: { title: string; body: string },
  ) {
    return this.adminService.sendSystemNotification(id, body.title, body.body);
  }

  // ── Audit Logs ──

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs (paginated)' })
  getAuditLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getRecentAuditLogs(page || 1, limit || 50);
  }

  // ── Households ──

  @Get('households')
  @ApiOperation({ summary: 'List all households (paginated)' })
  getHouseholds(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getHouseholdOverview(page || 1, limit || 20);
  }

  // ── Platform Activity ──

  @Get('activity')
  @ApiOperation({ summary: 'Get platform activity breakdown by time period' })
  getActivity(@Query('days') days?: number) {
    return this.adminService.getPlatformActivity(days || 30);
  }

  // ── Analytics ──

  @Get('analytics')
  @ApiOperation({ summary: 'Get full analytics (engagement, growth, demographics) from real data' })
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ── Finance ──

  @Get('finance')
  @ApiOperation({ summary: 'Get finance data: subscriptions list + revenue + in-app expense stats' })
  getFinance(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getFinanceData(page || 1, limit || 30);
  }
}
