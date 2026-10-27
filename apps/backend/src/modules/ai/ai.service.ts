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
          max_tokens: 2500,
          temperature: 0.5,
          messages: [
            { role: 'system', content: this.buildSystemPrompt(context, dto.enableActions) },
            ...history.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ],
        }),
      );

      const rawContent =
        response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const tokensUsed = response.usage?.total_tokens || 0;

      // Parse [ACTIONS]...[/ACTIONS] block if present
      let assistantMessage = rawContent;
      let actions: any[] = [];
      const actionsMatch = rawContent.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
      if (actionsMatch) {
        assistantMessage = rawContent.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/g, '').trim();
        try {
          actions = JSON.parse(actionsMatch[1].trim());
          if (!Array.isArray(actions)) actions = [];
        } catch {
          actions = [];
        }
      }

      // Save assistant response (store the display text only, not the action block)
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
        ...(actions.length > 0 ? { actions } : {}),
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

    // Compute next 7 day dates for the AI to use in action dates
    const baseDate = new Date();
    const nextDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().split('T')[0];
    });
    const todayDate = baseDate.toISOString().split('T')[0];

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
- "actions": array of 1–4 app items to auto-create for this suggestion. Each action object must have a "type" field.

Supported action types and their required fields:
- task: { "type":"task", "title":"...", "description":"...(optional)", "dueDate":"YYYY-MM-DD(optional)", "priority":"low|medium|high" }
- event: { "type":"event", "title":"...", "startDate":"YYYY-MM-DDTHH:mm:ss", "endDate":"YYYY-MM-DDTHH:mm:ss", "description":"...(optional)", "location":"...(optional)" }
- meal_plan: { "type":"meal_plan", "date":"YYYY-MM-DD", "breakfast":"...(optional)", "lunch":"...(optional)", "dinner":"...(optional)" }
- habit: { "type":"habit", "name":"...", "description":"...(optional)", "frequency":"daily|weekly" }
- goal: { "type":"goal", "title":"...", "description":"...(optional)", "targetDate":"YYYY-MM-DD(optional)" }
- expense: { "type":"expense", "title":"...", "amount":number, "category":"groceries|dining|utilities|rent|transport|entertainment|health|other" }

Action guidelines per plan type:
- date: include 1 event (the date itself with a realistic startDate/endDate in the next 7 days) + optionally 1–2 tasks (e.g. "Make reservation", "Buy flowers")
- weekend: include 1–2 events for weekend activities + optionally 1 task for preparation
- meal: include 1 meal_plan action with breakfast/lunch/dinner populated. Use today's date (${todayDate}) or tomorrow (${nextDates[0]}).
- celebration: include 1 event + 1–2 tasks (e.g. "Order cake", "Send invites")

Date reference — today is ${todayDate}, next 7 days: ${nextDates.join(', ')}
For events, use realistic times (e.g. 19:00 for evenings, 10:00 for mornings).

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
          max_tokens: 2000,
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

  async getSuggestions(userId: string, mode?: string) {
    const effectiveMode = (mode || 'personal').toLowerCase();
    // Cache is mode-specific so switching modes always yields fresh suggestions
    const cacheKey = `ai:suggestions:${userId}:${effectiveMode}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const context = await this.contextService.buildContext(userId);

    const modeGuidance: Record<string, string> = {
      personal: 'The user is in Personal mode — focus on individual wellness, goals, habits, journaling, and self-care. Do NOT suggest couple activities, date nights, or family outings.',
      couple: 'The user is in Couple mode — suggest activities for two people: date ideas, shared goals, finances together, and couple milestones. Do NOT suggest solo activities or parenting tasks.',
      family: 'The user is in Family mode — suggest family activities, shared events, household management, and group planning. Include all family members.',
      parenting: 'The user is in Parenting mode — focus on child-related activities: feeding schedules, bedtime routines, school events, kids\' milestones, family meal planning, and parenting tips. Do NOT suggest date nights, romantic activities, or couple-only suggestions.',
    };
    const modeInstruction = modeGuidance[effectiveMode] || modeGuidance.personal;

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

IMPORTANT MODE CONTEXT: ${modeInstruction}

Prioritize: overdue tasks, budget warnings, wellness gaps, unplanned meals, upcoming events.
Include relevant planning suggestions for the current mode (e.g. "Plan this week's meals", "Review your weekly schedule").
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

  private buildSystemPrompt(ctx: UserContext, enableActions?: boolean): string {
    const sections: string[] = [];

    sections.push(`You are Sivena AI, a warm and helpful personal life assistant embedded in the Sivena app. Sivena helps people manage their daily life — tasks, events, expenses, meals, wellness, habits, goals, and household coordination.

## Your Personality
- Warm, encouraging, concise, and action-oriented
- Use a friendly but not overly casual tone
- **Bias to action**: when users describe something they want, create it immediately via [ACTIONS] — don't ask for permission or describe what you'll do, just do it
- Be specific: include dates, amounts, times, and concrete details in generated actions
- Celebrate achievements and streaks
- Be sensitive about finances and wellness data
- Never be preachy or judgmental
- Keep explanatory text brief (under 200 words) — action cards show the details
- Use **bold** for important items and bullet points for lists
- When giving plans, always pair the plan description with the corresponding action cards

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

    // Action creation instructions
    if (enableActions) {
      // Compute next 7 day dates for the AI to use in plans
      const baseDate = new Date(ctx.today.date);
      const nextDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i + 1);
        return d.toISOString().split('T')[0];
      });
      const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

      sections.push(`## Creating Items — CRITICAL INSTRUCTIONS

You MUST generate a [ACTIONS] block whenever the user wants to create, add, schedule, plan, build, set up, or organize anything in their life. This is your primary job — not just advising, but actually doing it.

**When to include [ACTIONS]:** Any time the user's intent is to have something added to the app. This includes:
- Direct requests: "add", "create", "schedule", "set up", "plan", "build", "help me with", "let's add"
- Planning requests: "plan my week", "set up my morning routine", "create a meal plan", "help me organize"
- Indirect intent: "I need to...", "I want to...", "Can you help me...", "What about adding..."
- Multi-item lists: If the user lists multiple things, create ALL of them — never partial

**Completeness rule:** If the user asks for 5 habits, generate all 5 habit actions. If they ask for a week of meals, generate 7 meal_plan actions. NEVER truncate the list. Complete every single item requested.

**Proactive actions:** When giving a plan or schedule, automatically generate the action cards for it. Don't just describe what to do — do it. A good response gives a brief explanation + the full set of action cards.

Supported action types:
- task: { "type":"task", "title":"...", "description":"...(optional)", "dueDate":"YYYY-MM-DD(optional)", "priority":"low|medium|high(optional)" }
- event: { "type":"event", "title":"...", "startDate":"YYYY-MM-DDTHH:mm:ss", "endDate":"YYYY-MM-DDTHH:mm:ss", "description":"...(optional)", "location":"...(optional)" }
- meal_plan: { "type":"meal_plan", "date":"YYYY-MM-DD", "breakfast":"...(optional)", "lunch":"...(optional)", "dinner":"...(optional)", "notes":"...(optional)" }
- expense: { "type":"expense", "title":"...", "amount":number, "category":"groceries|dining|utilities|rent|transport|entertainment|health|other" }
- goal: { "type":"goal", "title":"...", "description":"...(optional)", "targetDate":"YYYY-MM-DD(optional)" }
- habit: { "type":"habit", "name":"...", "description":"...(optional)", "frequency":"daily|weekly" }

Date reference — today is ${ctx.today.date} (${ctx.today.dayOfWeek}):
- "tomorrow" = ${nextDates[0]}
- "in 2 days" = ${nextDates[1]}
- "next ${dayNames[0]}" = compute from today
- Next 7 days: ${nextDates.join(', ')}

Rules:
- ALWAYS include [ACTIONS] when the user wants anything created — err on the side of including it
- Generate ALL items in one [ACTIONS] block — no partial completion
- Keep titles concise (under 60 chars)
- For meal plans, populate all meals that make sense
- Omit [ACTIONS] ONLY for pure information questions with zero creative intent (e.g., "What is a calorie?")

Format — always at the very END of your response:
[ACTIONS]
[{"type":"task","title":"Buy groceries","dueDate":"${ctx.today.date}","priority":"medium"},{"type":"task","title":"Call the doctor","priority":"high"}]
[/ACTIONS]`);
    }

    // Guidelines
    sections.push(`## Guidelines
- **Execute, don't just advise.** When the user wants something done, do it — generate the action cards. Never describe a plan without also generating the corresponding [ACTIONS] block.
- **Complete every request fully.** If they ask for a week plan, create 7 entries. If they list 4 tasks, create all 4. Never truncate.
- Reference the user's actual data when answering questions
- Keep responses concise (under 200 words of explanation) — the action cards carry the detail
- NEVER fabricate data not present in the context
- Be encouraging; use **bold** for key points and bullet points for lists
- Always offer to expand: "Want me to add more days?" or "Should I break this into subtasks?"
- NEVER fabricate data not present in the context`);

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
    // Use Redis INCR for an atomic check-and-increment, preventing concurrent
    // requests from bypassing the limit via TOCTOU race.
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `ai:rl:${userId}:${todayStr}`;
    const redisClient = this.redis.getClient();

    const count = await redisClient.incr(key);
    if (count === 1) {
      // First request today — set TTL to 48h to guarantee daily key cleanup
      await redisClient.expire(key, 172800);
    }
    if (count > this.DAILY_LIMIT) {
      // Roll back the increment so the count stays accurate
      await redisClient.decr(key);
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
