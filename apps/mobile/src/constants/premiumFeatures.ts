/** Set to true to unlock all premium features for beta testing */
export const BETA_MODE = true;

export type PremiumFeature =
  | 'meal_planning'
  | 'savings_goals'
  | 'wellness_trends'
  | 'budgets_insights'
  | 'expense_insights'
  | 'weekly_recap'
  | 'countdowns'
  | 'multiple_circles'
  | 'unlimited_list_items'
  | 'date_ideas_unlimited';

export const FREE_LIMITS = {
  maxCircles: 1,
  maxListItems: 50,
  historyDays: 30,
  maxDateIdeas: 5,
} as const;

export const PREMIUM_FEATURE_INFO: Record<
  PremiumFeature,
  { title: string; description: string; icon: string }
> = {
  meal_planning: {
    title: 'Meal Planning',
    description: 'Plan your weekly meals and generate shopping lists',
    icon: 'restaurant-outline',
  },
  savings_goals: {
    title: 'Savings Goals',
    description: 'Set and track savings goals together',
    icon: 'wallet-outline',
  },
  wellness_trends: {
    title: 'Wellness Trends',
    description: 'Track mood, sleep, and wellness patterns over time',
    icon: 'heart-outline',
  },
  budgets_insights: {
    title: 'Budget Insights',
    description: 'Get detailed spending insights and budget analytics',
    icon: 'pie-chart-outline',
  },
  expense_insights: {
    title: 'Expense Insights',
    description: 'Detailed breakdown of your spending patterns',
    icon: 'trending-up-outline',
  },
  weekly_recap: {
    title: 'Weekly Recap',
    description: 'Get a summary of your household activity each week',
    icon: 'newspaper-outline',
  },
  countdowns: {
    title: 'Countdowns',
    description: 'Create countdowns for special events and milestones',
    icon: 'timer-outline',
  },
  multiple_circles: {
    title: 'Multiple Circles',
    description: 'Create and manage multiple household circles',
    icon: 'people-outline',
  },
  unlimited_list_items: {
    title: 'Unlimited Lists',
    description: 'Add unlimited items to your shopping and task lists',
    icon: 'list-outline',
  },
  date_ideas_unlimited: {
    title: 'Unlimited Date Ideas',
    description: 'Save unlimited date ideas for inspiration',
    icon: 'sparkles-outline',
  },
};

/** Features that gate entire screens */
export const SCREEN_GATED_FEATURES: PremiumFeature[] = [
  'meal_planning',
  'savings_goals',
  'wellness_trends',
  'budgets_insights',
  'expense_insights',
  'weekly_recap',
  'countdowns',
];
