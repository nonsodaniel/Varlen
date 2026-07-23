import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AiContextService, UserContext } from './ai-context.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { PlanDto } from './dto/plan.dto';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private readonly DAILY_LIMIT = 50;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
    private contextService: AiContextService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'sk-your-openai-api-key-here') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not configured — AI features disabled');
    }
  }

  private getClient(): OpenAI {
    if (!this.openai) {
      throw new HttpException(
        'AI service is not configured. Please set OPENAI_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.openai;
  }

  private async callWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        if (err?.status === 429 && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`OpenAI 429 — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Unreachable');
  }

  async chat(userId: string, dto: ChatMessageDto) {
    // Check rate limit
    await this.checkRateLimit(userId);

    // Get or create conversation
    let conversationId = dto.conversationId;
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!existing) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
    } else {
      const conversation = await this.prisma.aiConversation.create({
        data: { userId },
      });
      conversationId = conversation.id;
    }

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.message,
      },
    });

    // Build context
    const context = await this.contextService.buildContext(userId);

    // Get conversation history (last 20 messages)
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Call OpenAI
    const client = this.getClient();
    try {
      const response = await this.callWithRetry(() =>
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          temperature: 0.7,
          messages: [
            { role: 'system', content: this.buildSystemPrompt(context) },
            ...history.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ],
        }),
      );

      const assistantMessage =
        response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const tokensUsed = response.usage?.total_tokens || 0;

      // Save assistant response
      await this.prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: assistantMessage,
          tokensUsed,
        },
      });

      // Track usage
      await this.incrementUsage(userId, tokensUsed);

      // Auto-generate title from first exchange
      if (history.length <= 1) {
        this.generateTitle(conversationId, dto.message).catch((err) => {
          this.logger.warn(`Failed to generate title: ${err.message}`);
        });
      }

      return {
        conversationId,
        message: assistantMessage,
      };
    } catch (err: any) {
      this.logger.error(`OpenAI API error: ${err.message}`, err.stack);

      if (err?.status === 401 || err?.code === 'invalid_api_key') {
        throw new HttpException(
          'AI service configuration error. Please check API key.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (err?.status === 429) {
        throw new HttpException(
          'AI service is busy. Please try again in a moment.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        'AI service is temporarily unavailable. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async plan(userId: string, dto: PlanDto) {
    await this.checkRateLimit(userId);
    const context = await this.contextService.buildContext(userId);
    const client = this.getClient();

    const typeConfig: Record<string, string> = {
      date: 'date night ideas',
      weekend: 'weekend activity ideas',
      meal: 'meal suggestions',
      celebration: 'celebration ideas',
    };
    const label = typeConfig[dto.type] || 'ideas';

    const systemPrompt = `You are Sivena AI, a creative life planner. Generate exactly 3 ${label} tailored to the user's preferences and context.

Return a JSON object with a "suggestions" array. Each suggestion must have:
- "id": "sug-1", "sug-2", or "sug-3"
- "title": engaging, specific title (max 35 chars)
- "description": what it involves and why it's great (max 120 chars)
- "estimatedCost": realistic cost range e.g. "Free", "$10–20", "$30–50" (max 20 chars)
- "duration": time estimate e.g. "2–3 hours", "Half day" (max 20 chars)
- "tags": array of 2–3 short vibe tags (e.g. ["romantic", "outdoor"])
- "steps": array of 3–5 concrete action steps to make this happen
- "prompt": a follow-up chat message (max 80 chars) starting with "Help me plan..."

Be creative, specific, and actionable. Vary the 3 suggestions so they feel genuinely different.`;

    const userContent = [
      `Plan ${label} for me.`,
      dto.vibes?.length ? `Vibe preferences: ${dto.vibes.join(', ')}` : '',
      dto.budget ? `Budget: ${dto.budget}` : '',
      dto.freeText ? `Additional notes: ${dto.freeText}` : '',
      `Life mode: ${context.user.lifeMode}`,
      context.household
        ? `People: ${context.household.members.map((m) => m.name).join(', ')}`
        : '',
      context.finances.monthlyBudgetTotal > 0
        ? `Monthly budget: ${context.finances.currency} ${context.finances.monthlyBudgetTotal}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await this.callWithRetry(() =>
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1200,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      );

      const raw = response.choices[0]?.message?.content || '{"suggestions":[]}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { suggestions: [] };
      }

      await this.incrementUsage(userId, response.usage?.total_tokens || 0);
      return { suggestions: parsed.suggestions || [] };
    } catch (err: any) {
      this.logger.error(`Plan error: ${err.message}`);
      throw new HttpException(
        'AI planning is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getSuggestions(userId: string) {
    // Check Redis cache first (30 min TTL)
    const cacheKey = `ai:suggestions:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const context = await this.contextService.buildContext(userId);

    const client = this.getClient();
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are Sivena AI. Generate 3-5 brief, actionable suggestions based on the user's current context. Return a JSON object with a "suggestions" array.

Each suggestion must have:
- "id": unique string (e.g., "sug-1")
- "title": short title (max 40 chars)
- "subtitle": brief description (max 80 chars)
- "type": one of "reminder", "tip", "achievement", "insight"
- "priority": number 1-10 (10 = most urgent)
- "category": one of "tasks", "calendar", "expenses", "wellness", "habits", "meals", "goals", "shopping", "feature"
- "prompt": a suggested message the user could send to the AI chat for follow-up (max 60 chars)

Prioritize: overdue tasks, budget warnings, wellness gaps, unplanned meals, upcoming events, date ideas for couples, family activities.
Include planning suggestions like "Plan a date night", "Plan this week's meals", "Review your weekly schedule".
Be specific and reference actual data from the context. Do not make up data.`,
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
      });

      const content = response.choices[0]?.message?.content || '{"suggestions":[]}';
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { suggestions: [] };
      }

      const suggestions = parsed.suggestions || [];

      // Cache for 30 minutes
      await this.redis.set(cacheKey, JSON.stringify(suggestions), 1800);

      // Track usage
      await this.incrementUsage(userId, response.usage?.total_tokens || 0);

      return suggestions;
    } catch (err: any) {
      this.logger.error(`Suggestions error: ${err.message}`);
      return [];
    }
  }

  async getConversations(userId: string, query: QueryConversationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
        },
      }),
      this.prisma.aiConversation.count({ where: { userId } }),
    ]);

    return {
      data: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        lastMessage: c.messages[0]?.content?.substring(0, 100) || null,
        lastMessageRole: c.messages[0]?.role || null,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.aiConversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted' };
  }

  async getUsage(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.aiUsage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    return {
      requestCount: usage?.requestCount || 0,
      tokensUsed: usage?.tokensUsed || 0,
      dailyLimit: this.DAILY_LIMIT,
      remaining: this.DAILY_LIMIT - (usage?.requestCount || 0),
    };
  }

  private buildSystemPrompt(ctx: UserContext): string {
    const sections: string[] = [];

    sections.push(`You are Sivena AI, a warm and helpful personal life assistant embedded in the Sivena app. Sivena helps people manage their daily life — tasks, events, expenses, meals, wellness, habits, goals, and household coordination.

## Your Personality
- Warm, encouraging, concise
- Use a friendly but not overly casual tone
- Be specific and actionable in suggestions
- Celebrate achievements and streaks
- Be sensitive about finances and wellness data
- Never be preachy or judgmental
- Keep responses under 250 words unless the user asks for more detail
- Use **bold** for important items and bullet points for lists
- When giving plans, structure them clearly with numbered steps

## Planning Capabilities
You are an expert life planner. You can help users with:
- **Date Planning**: Suggest creative date ideas based on budget, weather, preferences, and relationship context. Consider the couple's interests and local activities.
- **Meal Planning**: Suggest meals for the day or week based on dietary preferences, what they've had recently, and household size. Recommend recipes with prep time estimates.
- **Weekly Planning**: Help organize their upcoming week — balance events, tasks, meals, and self-care. Suggest time blocks.
- **Budget Planning**: Help plan spending, suggest savings strategies, and review expense patterns.
- **Goal Setting**: Help break down big goals into actionable steps with deadlines.
- **Family Activities**: Suggest age-appropriate activities for kids, family outings, and coordination.
- **Self-Care**: Recommend wellness activities, habit improvements, and work-life balance tips.
- **Special Occasions**: Help plan birthdays, anniversaries, holidays, and celebrations.

When users ask for planning help:
1. Ask clarifying questions if needed (budget, preferences, constraints)
2. Give concrete, actionable suggestions with details
3. Offer to help break plans into tasks/events they can add to the app
4. Consider their schedule, budget, and existing commitments from context`);

    // User info
    sections.push(`## User
Name: ${ctx.user.name}
Life Mode: ${ctx.user.lifeMode}
${ctx.user.country ? `Country: ${ctx.user.country}` : ''}
Member since: ${ctx.user.memberSince}`);

    // Household
    if (ctx.household) {
      let householdSection = `## Household
Name: "${ctx.household.name}" (${ctx.household.mode} mode)
Members: ${ctx.household.members.map((m) => `${m.name} (${m.role})`).join(', ')}`;
      if (ctx.household.children && ctx.household.children.length > 0) {
        householdSection += `\nChildren: ${ctx.household.children.map((c) => `${c.name} (age ${c.age})`).join(', ')}`;
      }
      if (ctx.household.daysTogether) {
        householdSection += `\nTogether for ${ctx.household.daysTogether} days`;
      }
      sections.push(householdSection);
    } else {
      sections.push(`## Household\nNo household (single mode)`);
    }

    // Today
    let todaySection = `## Today (${ctx.today.date}, ${ctx.today.dayOfWeek})
Events: ${ctx.today.eventsCount} today`;
    if (ctx.today.events.length > 0) {
      todaySection += '\n' + ctx.today.events.map((e) => `  - ${e.time}: ${e.title}${e.shared ? ' (shared)' : ''}`).join('\n');
    }
    todaySection += `\nTasks: ${ctx.today.incompleteTasks} incomplete`;
    if (ctx.today.overdueTasks.length > 0) {
      todaySection += `\nOverdue: ${ctx.today.overdueTasks.map((t) => `"${t.title}" (${t.daysOverdue}d overdue)`).join(', ')}`;
    }
    if (ctx.today.tasksDueToday.length > 0) {
      todaySection += `\nDue today: ${ctx.today.tasksDueToday.join(', ')}`;
    }
    sections.push(todaySection);

    // Finances
    let finSection = `## Finances (${ctx.finances.currency})
Monthly budget: ${ctx.finances.monthlyBudgetTotal > 0 ? `${ctx.finances.currency} ${ctx.finances.monthlyBudgetTotal} (${ctx.finances.budgetUtilization} used)` : 'Not set'}`;
    if (ctx.finances.overBudgetCategories.length > 0) {
      finSection += `\nOver budget: ${ctx.finances.overBudgetCategories.join(', ')}`;
    }
    if (ctx.finances.unsettledBalance !== 0) {
      finSection += `\nUnsettled balance: ${ctx.finances.unsettledBalance > 0 ? 'Others owe you' : 'You owe'} ${ctx.finances.currency} ${Math.abs(ctx.finances.unsettledBalance)}`;
    }
    sections.push(finSection);

    // Wellness
    let wellSection = `## Wellness`;
    if (ctx.wellness.loggedToday) {
      wellSection += `\nToday's mood: ${ctx.wellness.lastMood}/5`;
    } else if (ctx.wellness.daysSinceLastLog >= 0) {
      wellSection += `\nNot logged today (last logged ${ctx.wellness.daysSinceLastLog} days ago)`;
    } else {
      wellSection += `\nNo wellness entries yet`;
    }
    wellSection += `\nMood trend: ${ctx.wellness.moodTrend}`;
    if (ctx.wellness.avgSleepLastWeek) {
      wellSection += `\nAvg sleep last week: ${ctx.wellness.avgSleepLastWeek}h`;
    }
    sections.push(wellSection);

    // Routines/Habits
    sections.push(`## Routines
${ctx.habits.totalRoutines} routines (${ctx.habits.enabledRoutines} active)
${ctx.habits.routineNames.length > 0 ? `Active: ${ctx.habits.routineNames.join(', ')}` : ''}`);

    // Meals
    sections.push(`## Meals
${ctx.meals.hasMealPlanToday ? 'Meals planned for today' : `Unplanned: ${ctx.meals.unplannedMeals.join(', ')}`}`);

    // Goals
    let goalSection = `## Goals
${ctx.goals.activeGoals} active goals`;
    if (ctx.goals.nearCompletion.length > 0) {
      goalSection += '\nNear completion: ' + ctx.goals.nearCompletion.map((g) => `"${g.title}" at ${g.percentComplete}%`).join(', ');
    }
    sections.push(goalSection);

    // Shopping
    sections.push(`## Shopping
${ctx.shopping.totalUncheckedItems} items across ${ctx.shopping.listNames.length} lists${ctx.shopping.listNames.length > 0 ? ` (${ctx.shopping.listNames.join(', ')})` : ''}`);

    // Upcoming
    let upcomingSection = `## Upcoming
Tomorrow: ${ctx.upcoming.tomorrowEvents} events | This week: ${ctx.upcoming.weekEvents} events`;
    if (ctx.upcoming.countdowns.length > 0) {
      upcomingSection += '\n' + ctx.upcoming.countdowns.map((c) => `"${c.title}" in ${c.daysAway} days`).join(', ');
    }
    sections.push(upcomingSection);

    // Feature discovery
    if (ctx.featureUsage.unusedFeatures.length > 0) {
      sections.push(`## Feature Discovery
Features used: ${ctx.featureUsage.usedFeatures.join(', ') || 'none yet'}
Not yet tried: ${ctx.featureUsage.unusedFeatures.join(', ')}`);
    }

    // Life mode guidance
    sections.push(this.getLifeModeGuidance(ctx.user.lifeMode));

    // Guidelines
    sections.push(`## Guidelines
- Reference the user's actual data when answering questions
- Suggest specific actions: "You could create a task for...", "Try adding a meal plan..."
- For unused features, explain what they do and encourage trying them
- Keep responses under 250 words unless the user asks for detail
- NEVER fabricate data not present in the context
- Guide users to relevant app sections by name (not technical routes)
- Be encouraging about progress and achievements
- Use **bold** for key points and structure responses with bullet points
- When suggesting plans, include concrete details (times, items, amounts)
- For date ideas, consider budget, time of day, and relationship dynamics
- For meal planning, consider household size and existing meal history
- Always offer to help further: "Want me to plan the full week?" or "Should I suggest alternatives?"`);

    return sections.join('\n\n');
  }

  private getLifeModeGuidance(lifeMode: string): string {
    switch (lifeMode) {
      case 'COUPLE':
        return `## Life Mode Notes
This user is in couple mode. Reference their partner by name when relevant. Proactively suggest:
- Date night ideas (budget-friendly, adventurous, cozy at home)
- Shared meal planning and cooking together
- Balance/settle-up reminders
- Anniversary or milestone celebrations
- Shared goals and quality time activities`;
      case 'FAMILY':
        return `## Life Mode Notes
This user is in family mode. Reference children by name and age when relevant. Proactively suggest:
- Family activities suited to children's ages
- Chore assignments and routines for kids
- Family meal planning with kid-friendly options
- School-related reminders and event planning
- Family game nights, outings, and traditions`;
      case 'PARENTING':
        return `## Life Mode Notes
This user is in parenting mode. Be aware of baby logs, developmental milestones, sleep schedules, and feeding patterns. Proactively suggest:
- Age-appropriate activities and developmental milestones
- Sleep routine optimization
- Meal ideas for babies/toddlers
- Self-care for parents (they need it!)
- Coordination between parents for childcare`;
      default:
        return `## Life Mode Notes
This user is in single mode. Proactively suggest:
- Personal productivity optimization
- Self-care routines and wellness habits
- Meal prep ideas for one
- Social activities and hobby suggestions
- Goal setting and personal growth`;
    }
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.aiUsage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (usage && usage.requestCount >= this.DAILY_LIMIT) {
      throw new HttpException(
        `You've reached your daily AI message limit (${this.DAILY_LIMIT}). Try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async incrementUsage(
    userId: string,
    tokens: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.aiUsage.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        requestCount: { increment: 1 },
        tokensUsed: { increment: tokens },
      },
      create: {
        userId,
        date: today,
        requestCount: 1,
        tokensUsed: tokens,
      },
    });
  }

  private async generateTitle(
    conversationId: string,
    firstMessage: string,
  ): Promise<void> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 30,
        messages: [
          {
            role: 'system',
            content:
              'Generate a short title (max 5 words) for this conversation based on the user\'s first message. Return only the title, no quotes or punctuation.',
          },
          { role: 'user', content: firstMessage },
        ],
      });

      const title =
        response.choices[0]?.message?.content?.trim() || 'New Conversation';

      await this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    } catch (err: any) {
      this.logger.warn(`Title generation failed: ${err.message}`);
    }
  }
}
