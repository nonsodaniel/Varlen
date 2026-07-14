import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Widget')
@ApiBearerAuth()
@Controller('widget')
export class WidgetDataController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('today')
  @ApiOperation({ summary: 'Get today summary for home screen widget' })
  async getTodayWidget(@CurrentUser('sub') userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's primary household
    const membership = await this.prisma.householdMember.findFirst({
      where: { userId, leftAt: null },
      select: { householdId: true },
    });

    if (!membership) {
      return { tasks: 0, events: 0, pendingExpenses: 0 };
    }

    const householdId = membership.householdId;

    const [tasks, events, pendingExpenses] = await Promise.all([
      this.prisma.task.count({
        where: {
          householdId,
          deletedAt: null,
          completed: false,
          OR: [
            { assignedToId: userId },
            { dueDate: { gte: today, lt: tomorrow } },
          ],
        },
      }),
      this.prisma.calendarEvent.count({
        where: {
          householdId,
          deletedAt: null,
          startDate: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.expense.count({
        where: {
          householdId,
          deletedAt: null,
          settled: false,
          splits: { some: { userId } },
        },
      }),
    ]);

    return { tasks, events, pendingExpenses, householdId };
  }
}
