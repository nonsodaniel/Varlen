'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import { SimpleLineChart, SimpleBarChart } from '@/components/Charts';
import { apiGet } from '@/lib/api';
import type { User, AuditLog } from '@/types';
import { format, subDays, parseISO } from 'date-fns';

interface Stats {
  totalUsers: number;
  newUsersLast7d: number;
  totalCircles: number;
  activeCircles: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newUsersLast7d: 0,
    totalCircles: 0,
    activeCircles: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, circlesRes, logsRes] = await Promise.allSettled([
          apiGet<User[]>('/users'),
          apiGet<any[]>('/circles'),
          apiGet<AuditLog[]>('/audit'),
        ]);

        const allUsers =
          usersRes.status === 'fulfilled' ? usersRes.value : [];
        const allCircles =
          circlesRes.status === 'fulfilled' ? circlesRes.value : [];
        const allLogs =
          logsRes.status === 'fulfilled' ? logsRes.value : [];

        const usersArr = Array.isArray(allUsers) ? allUsers : [];
        const circlesArr = Array.isArray(allCircles) ? allCircles : [];
        const logsArr = Array.isArray(allLogs) ? allLogs : [];

        const sevenDaysAgo = subDays(new Date(), 7);
        const newUsers = usersArr.filter(
          (u) => new Date(u.createdAt) >= sevenDaysAgo,
        );

        setUsers(usersArr);
        setStats({
          totalUsers: usersArr.length,
          newUsersLast7d: newUsers.length,
          totalCircles: circlesArr.length,
          activeCircles: circlesArr.filter(
            (c: any) => (c._count?.members ?? c.memberCount ?? 0) > 1,
          ).length,
        });
        setRecentLogs(logsArr.slice(0, 10));
      } catch {
        // Silently handle — stats stay at defaults
      }
      setLoading(false);
    }
    load();
  }, []);

  // Build user growth chart data (last 30 days)
  const growthData = (() => {
    const days: { date: string; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = users.filter(
        (u) => format(new Date(u.createdAt), 'yyyy-MM-dd') <= dayStr,
      ).length;
      days.push({ date: format(day, 'MMM d'), users: count });
    }
    return days;
  })();

  // Feature usage chart data
  const featureData = [
    { feature: 'Tasks', count: 0 },
    { feature: 'Events', count: 0 },
    { feature: 'Expenses', count: 0 },
    { feature: 'Polls', count: 0 },
    { feature: 'Journal', count: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          trend={{ value: stats.newUsersLast7d, label: 'this week' }}
        />
        <StatsCard
          title="New Users (7d)"
          value={stats.newUsersLast7d}
        />
        <StatsCard
          title="Total Circles"
          value={stats.totalCircles}
        />
        <StatsCard
          title="Active Circles"
          value={stats.activeCircles}
          subtitle="With 2+ members"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            User Growth (30d)
          </h2>
          <SimpleLineChart data={growthData} xKey="date" yKey="users" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Feature Usage
          </h2>
          <SimpleBarChart
            data={featureData}
            xKey="feature"
            yKey="count"
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Recent audit logs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Recent Activity
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{log.action}</span> on{' '}
                    <span className="text-gray-500">{log.resource}</span>
                  </p>
                  {log.user && (
                    <p className="text-xs text-gray-400">
                      by {log.user.name || log.user.email}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {format(parseISO(log.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
