import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HouseholdsModule } from './modules/households/households.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ListsModule } from './modules/lists/lists.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { MemoriesModule } from './modules/memories/memories.module';
import { PollsModule } from './modules/polls/polls.module';
import { BabyLogsModule } from './modules/baby-logs/baby-logs.module';
import { GoalsModule } from './modules/goals/goals.module';
import { JournalModule } from './modules/journal/journal.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { RoutinesModule } from './modules/routines/routines.module';
import { WellnessModule } from './modules/wellness/wellness.module';
import { CountdownsModule } from './modules/countdowns/countdowns.module';
import { ChildrenModule } from './modules/children/children.module';
import { configValidationSchema } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    }]),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    HouseholdsModule,
    CalendarModule,
    TasksModule,
    ListsModule,
    ExpensesModule,
    NotificationsModule,
    RealtimeModule,
    SyncModule,
    AuditModule,
    HealthModule,
    BudgetsModule,
    SubscriptionsModule,
    MemoriesModule,
    PollsModule,
    BabyLogsModule,
    GoalsModule,
    JournalModule,
    TimelineModule,
    RoutinesModule,
    WellnessModule,
    CountdownsModule,
    ChildrenModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
