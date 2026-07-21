'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/StatsCard';
import { SimpleBarChart } from '@/components/Charts';
import { apiGet } from '@/lib/api';
import type { EnhancedDashboardStats } from '@/types';
import { format, parseISO } from 'date-fns';

export default function DashboardPage() {
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<EnhancedDashboardStats>('/admin/dashboard');
        setStats(res);
      } catch {
        // stays null
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const featureData = [
    { feature: 'Tasks', count: stats.featureUsage.tasks },
    { feature: 'Events', count: stats.featureUsage.events },
    { feature: 'Expenses', count: stats.featureUsage.expenses },
    { feature: 'Polls', count: stats.featureUsage.polls },
    { feature: 'Lists', count: stats.featureUsage.shoppingLists },
    { feature: 'Goals', count: stats.featureUsage.goals },
    { feature: 'Routines', count: stats.featureUsage.routines },
    { feature: 'Journal', count: stats.featureUsage.journal },
    { feature: 'Meals', count: stats.featureUsage.meals },
  ];

  const flagSummary = stats.featureFlagSummary;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Platform overview and controls</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatsCard
          title="Total Users"
          value={stats.users.total}
          trend={{ value: stats.users.newThisMonth, label: 'new this month' }}
        />
        <StatsCard
          title="Active (30d)"
          value={stats.users.activeThisMonth}
          subtitle={`${stats.users.verified} verified`}
        />
        <StatsCard
          title="Circles"
          value={stats.households.total}
        />
        <StatsCard
          title="Waitlist"
          value={stats.waitlist?.total ?? 0}
        />
        <StatsCard
          title="Subscriptions"
          value={stats.subscriptions.appActive}
          subtitle={`${stats.subscriptions.householdActive} household`}
        />
      </div>

      {/* Content & Activity stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatsCard
          title="Tasks"
          value={stats.tasks.total}
          subtitle={`${stats.tasks.completionRate}% completed`}
        />
        <StatsCard
          title="Expenses"
          value={`$${stats.expenses.totalAmount.toLocaleString()}`}
          subtitle={`${stats.expenses.count} total`}
        />
        <StatsCard
          title="Events"
          value={stats.events.total}
        />
        <StatsCard
          title="Suspended"
          value={stats.users.suspended}
          subtitle="users"
        />
      </div>

      {/* Platform Info Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Auth Provider Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Auth Providers
          </h2>
          {stats.authBreakdown ? (
            <div className="space-y-2">
              {[
                { label: 'Email', count: stats.authBreakdown.local, color: 'bg-gray-600' },
                { label: 'Google', count: stats.authBreakdown.google, color: 'bg-blue-500' },
              ].map((item) => {
                const total = stats.authBreakdown.local + stats.authBreakdown.google;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 sm:w-24 bg-gray-100 rounded-full h-1.5">
                        <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{item.count} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No data</p>
          )}
        </div>

        {/* Country Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Top Countries
          </h2>
          {stats.countryDistribution && stats.countryDistribution.length > 0 ? (
            <div className="space-y-1.5">
              {stats.countryDistribution.slice(0, 5).map((item) => (
                <div key={item.country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{item.country}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No country data yet</p>
          )}
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Device Platforms
          </h2>
          {stats.platformDistribution && stats.platformDistribution.length > 0 ? (
            <div className="space-y-2">
              {stats.platformDistribution.map((item) => {
                const total = stats.platformDistribution.reduce((s, p) => s + p.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.platform} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-700 capitalize">{item.platform}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 sm:w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${item.platform === 'ios' ? 'bg-gray-800' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{item.count} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No device data yet</p>
          )}
        </div>
      </div>

      {/* Feature Flag Summary */}
      {flagSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Feature Controls
            </h2>
            <Link
              href="/features"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Manage all flags &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {flagSummary.enabled}/{flagSummary.total}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Features Active</p>
            </div>
            {(['mvp', 'post_mvp', 'experimental'] as const).map((phase) => {
              const data = flagSummary.byPhase[phase];
              const phaseLabels = { mvp: 'MVP', post_mvp: 'Post-MVP', experimental: 'Experimental' };
              const phaseColors = { mvp: 'text-emerald-700', post_mvp: 'text-blue-700', experimental: 'text-purple-700' };
              return (
                <div key={phase} className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <p className={`text-lg sm:text-xl font-bold ${phaseColors[phase]}`}>
                    {data.enabled}/{data.total}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{phaseLabels[phase]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Usage Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 mb-4 sm:mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Feature Usage
        </h2>
        <SimpleBarChart
          data={featureData}
          xKey="feature"
          yKey="count"
          color="#8b5cf6"
          height={250}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No recent activity
          </p>
        ) : (
          <div className="space-y-1 sm:space-y-2">
            {stats.recentActivity.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-50 last:border-0 gap-0.5 sm:gap-1"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-700 truncate">
                    <span className="font-medium">{log.action}</span>{' '}
                    <span className="text-gray-400">on</span>{' '}
                    <span className="text-gray-500">{log.resource}</span>
                  </p>
                  {log.user && (
                    <p className="text-[10px] sm:text-xs text-gray-400">
                      by {log.user.name || log.user.email}
                    </p>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
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
