import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_FLAGS = [
  { key: 'tasks',          label: 'Tasks',           description: 'Task management and chores',               enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'expenses',       label: 'Expenses',         description: 'Expense tracking and splitting',           enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'calendar',       label: 'Calendar',         description: 'Calendar and events',                      enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'shopping',       label: 'Shopping Lists',   description: 'Shopping list management',                 enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'polls',          label: 'Polls',            description: 'Group polls and voting',                   enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'countdowns',     label: 'Countdowns',       description: 'Event countdowns',                         enabled: true,  category: 'feature', phase: 'mvp' },
  { key: 'meals',          label: 'Meal Planning',    description: 'Meals and meal plans',                     enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'goals',          label: 'Goals',            description: 'Goal tracking',                            enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'routines',       label: 'Routines',         description: 'Daily routines and habits',               enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'journal',        label: 'Journal',          description: 'Journal entries',                          enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'wellness',       label: 'Wellness',         description: 'Wellness tracking',                        enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'memories',       label: 'Memories',         description: 'Memory and milestone tracking',            enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'ai_assistant',   label: 'AI Assistant',     description: 'AI-powered chat and suggestions',          enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'budget_insights',label: 'Budget Insights',  description: 'Budget analytics and insights',            enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'savings_goals',  label: 'Savings Goals',    description: 'Savings goal tracking',                    enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'weekly_recap',   label: 'Weekly Recap',     description: 'Weekly household summary',                 enabled: true,  category: 'feature', phase: 'post_mvp' },
  { key: 'timeline',       label: 'Timeline',         description: 'Timeline entries',                         enabled: false, category: 'feature', phase: 'experimental' },
] as const;

@Injectable()
export class FeatureFlagSeeder implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const existing = await this.prisma.featureFlag.count();
      if (existing >= DEFAULT_FLAGS.length) return; // Already seeded

      for (const flag of DEFAULT_FLAGS) {
        await this.prisma.featureFlag.upsert({
          where: { key: flag.key },
          create: flag,
          update: { label: flag.label, description: flag.description, category: flag.category, phase: flag.phase },
        });
      }
      this.logger.log(`Feature flags seeded: ${DEFAULT_FLAGS.length} flags`);
    } catch (err) {
      this.logger.warn('Feature flag seeding skipped: ' + (err as Error).message);
    }
  }
}
