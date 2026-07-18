export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  authProvider: 'local' | 'google';
  emailVerified: boolean;
  country?: string;
  suspendedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: {
    householdMembers?: number;
    memberships?: number;
  };
}

export interface Circle {
  id: string;
  name: string;
  type: 'PRIMARY' | 'EXTENDED' | 'FRIENDS' | 'CUSTOM';
  emoji?: string;
  color?: string;
  description?: string;
  mode?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  _count?: {
    members?: number;
  };
}

export interface CircleMember {
  id: string;
  userId: string;
  householdId: string;
  role: string;
  joinedAt: string;
  user?: User;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: Pick<User, 'name' | 'email'>;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  category: string;
  phase: 'mvp' | 'post_mvp' | 'experimental';
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedDashboardStats {
  users: {
    total: number;
    verified: number;
    suspended: number;
    newThisMonth: number;
    activeThisMonth: number;
  };
  households: { total: number };
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
  };
  expenses: {
    count: number;
    totalAmount: number;
  };
  events: { total: number };
  polls: { total: number };
  subscriptions: {
    appActive: number;
    householdActive: number;
  };
  featureUsage: {
    tasks: number;
    events: number;
    expenses: number;
    polls: number;
    shoppingLists: number;
    goals: number;
    routines: number;
    journal: number;
    meals: number;
    countdowns: number;
    memories: number;
  };
  countryDistribution: { country: string; count: number }[];
  platformDistribution: { platform: string; count: number }[];
  authBreakdown: { local: number; google: number };
  featureFlagSummary: {
    total: number;
    enabled: number;
    disabled: number;
    byPhase: {
      mvp: { total: number; enabled: number };
      post_mvp: { total: number; enabled: number };
      experimental: { total: number; enabled: number };
    };
  };
  recentActivity: AuditLog[];
}

export interface AdminUserDetail extends Omit<User, '_count'> {
  memberships?: {
    id: string;
    role: string;
    joinedAt: string;
    household: { id: string; name: string; type: string; mode: string };
  }[];
  appSubscriptions?: {
    id: string;
    plan: string;
    status: string;
    platform: string;
    entitlement: string;
    expiresAt?: string;
  }[];
  auditLogs?: {
    id: string;
    action: string;
    resource: string;
    createdAt: string;
  }[];
  _count?: {
    createdTasks?: number;
    createdEvents?: number;
    paidExpenses?: number;
    notifications?: number;
  };
}

export interface PlatformActivity {
  period: string;
  tasksCreated: number;
  tasksCompleted: number;
  eventsCreated: number;
  expensesCreated: number;
  pollsCreated: number;
  usersCreated: number;
}

export interface AnalyticsData {
  engagement: {
    dau: number;
    wau: number;
    mau: number;
  };
  userGrowth: { date: string; users: number }[];
  signupsByWeekday: { day: string; signups: number }[];
  countryDistribution: { country: string; count: number }[];
  authBreakdown: { provider: string; count: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
