export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  authProvider: 'local' | 'google';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: {
    householdMembers?: number;
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
  user?: User;
}

export interface DashboardStats {
  totalUsers: number;
  newUsersLast7d: number;
  totalCircles: number;
  totalExpenses: number;
  totalTasks: number;
  totalEvents: number;
  totalPolls: number;
  totalJournalEntries: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
