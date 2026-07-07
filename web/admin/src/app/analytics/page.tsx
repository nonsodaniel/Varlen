'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import { SimpleLineChart, SimpleBarChart } from '@/components/Charts';
import { apiGet } from '@/lib/api';
import type { User } from '@/types';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<User[]>('/users');
        setUsers(Array.isArray(res) ? res : []);
      } catch {
        setUsers([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();

  // DAU / WAU / MAU approximation from user creation dates
  const dau = users.filter(
    (u) => new Date(u.updatedAt || u.createdAt) >= subDays(now, 1),
  ).length;
  const wau = users.filter(
    (u) => new Date(u.updatedAt || u.createdAt) >= subWeeks(now, 1),
  ).length;
  const mau = users.filter(
    (u) => new Date(u.updatedAt || u.createdAt) >= subMonths(now, 1),
  ).length;

  // User growth chart — last 90 days
  const growthData = (() => {
    const days: { date: string; users: number }[] = [];
    for (let i = 89; i >= 0; i -= 3) {
      const day = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = users.filter(
        (u) => format(new Date(u.createdAt), 'yyyy-MM-dd') <= dayStr,
      ).length;
      days.push({ date: format(day, 'MMM d'), users: count });
    }
    return days;
  })();

  // Signup distribution by weekday
  const weekdayData = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    users.forEach((u) => {
      counts[new Date(u.createdAt).getDay()]++;
    });
    return days.map((day, i) => ({ day, signups: counts[i] }));
  })();

  // Auth provider breakdown
  const authBreakdown = (() => {
    const local = users.filter((u) => u.authProvider === 'local').length;
    const google = users.filter((u) => u.authProvider === 'google').length;
    return [
      { provider: 'Email', count: local },
      { provider: 'Google', count: google },
    ];
  })();

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
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform growth and engagement metrics
        </p>
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatsCard title="Daily Active" value={dau} subtitle="Last 24 hours" />
        <StatsCard title="Weekly Active" value={wau} subtitle="Last 7 days" />
        <StatsCard title="Monthly Active" value={mau} subtitle="Last 30 days" />
      </div>

      {/* User growth */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          User Growth (90d)
        </h2>
        <SimpleLineChart
          data={growthData}
          xKey="date"
          yKey="users"
          height={350}
        />
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Signups by Day of Week
          </h2>
          <SimpleBarChart
            data={weekdayData}
            xKey="day"
            yKey="signups"
            color="#8b5cf6"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Auth Provider Breakdown
          </h2>
          <SimpleBarChart
            data={authBreakdown}
            xKey="provider"
            yKey="count"
            color="#06b6d4"
          />
        </div>
      </div>
    </div>
  );
}
