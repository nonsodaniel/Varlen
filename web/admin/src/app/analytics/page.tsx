'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import { SimpleLineChart, SimpleBarChart } from '@/components/Charts';
import { apiGet } from '@/lib/api';
import type { PlatformActivity, AnalyticsData } from '@/types';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activity, setActivity] = useState<PlatformActivity | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  // Load analytics once (engagement + growth + demographics)
  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await apiGet<AnalyticsData>('/admin/analytics');
        setAnalytics(res);
      } catch {
        // stays null
      }
    }
    loadAnalytics();
  }, []);

  // Load activity by period
  useEffect(() => {
    async function loadActivity() {
      setLoading(true);
      try {
        const res = await apiGet<PlatformActivity>(`/admin/activity?days=${period}`);
        setActivity(res);
      } catch {
        // stays null
      }
      setLoading(false);
    }
    loadActivity();
  }, [period]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Real-time platform engagement and growth metrics
        </p>
      </div>

      {/* Engagement stats from audit logs */}
      {analytics && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <StatsCard
            title="Daily Active"
            value={analytics.engagement.dau}
            subtitle="Unique users (24h)"
          />
          <StatsCard
            title="Weekly Active"
            value={analytics.engagement.wau}
            subtitle="Unique users (7d)"
          />
          <StatsCard
            title="Monthly Active"
            value={analytics.engagement.mau}
            subtitle="Unique users (30d)"
          />
        </div>
      )}

      {/* Platform Activity with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Platform Activity
        </h2>
        <div className="flex gap-2 mt-2 sm:mt-0">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {activity && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <StatsCard title="New Users" value={activity.usersCreated} />
          <StatsCard title="Tasks Created" value={activity.tasksCreated} />
          <StatsCard title="Tasks Done" value={activity.tasksCompleted} />
          <StatsCard title="Events" value={activity.eventsCreated} />
          <StatsCard title="Expenses" value={activity.expensesCreated} />
          <StatsCard title="Polls" value={activity.pollsCreated} />
        </div>
      )}

      {/* User growth chart from real signup data */}
      {analytics && analytics.userGrowth.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 mb-4 sm:mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            User Growth (90d)
          </h2>
          <SimpleLineChart
            data={analytics.userGrowth}
            xKey="date"
            yKey="users"
            height={300}
          />
        </div>
      )}

      {/* Country Distribution from real user data */}
      {analytics && analytics.countryDistribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 mb-4 sm:mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Users by Country
          </h2>
          <SimpleBarChart
            data={analytics.countryDistribution}
            xKey="country"
            yKey="count"
            color="#10b981"
            height={250}
          />
        </div>
      )}

      {/* Signups by weekday + Auth breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Signups by Day of Week
            </h2>
            <SimpleBarChart
              data={analytics.signupsByWeekday}
              xKey="day"
              yKey="signups"
              color="#8b5cf6"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Auth Provider Breakdown
            </h2>
            <SimpleBarChart
              data={analytics.authBreakdown}
              xKey="provider"
              yKey="count"
              color="#06b6d4"
            />
          </div>
        </div>
      )}
    </div>
  );
}
