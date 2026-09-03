'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { format, parseISO } from 'date-fns';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  PRO_MONTHLY:    { label: 'Pro Monthly',   color: 'bg-indigo-100 text-indigo-700' },
  PRO_YEARLY:     { label: 'Pro Yearly',    color: 'bg-blue-100 text-blue-700' },
  FAMILY_MONTHLY: { label: 'Family',        color: 'bg-purple-100 text-purple-700' },
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-700',
  CANCELED:  'bg-red-100 text-red-700',
  EXPIRED:   'bg-gray-100 text-gray-600',
  PAUSED:    'bg-amber-100 text-amber-700',
};

interface Subscription {
  id: string;
  plan: string;
  status: string;
  platform: string;
  entitlement: string;
  originalPurchaseDate?: string;
  expiresAt?: string;
  canceledAt?: string;
  renewalIntent: boolean;
  user?: { id: string; name: string; email: string; country?: string };
}

interface FinanceData {
  summary: {
    mrr: number;
    arr: number;
    totalSubs: number;
    activeSubs: number;
    canceledThisMonth: number;
    newThisMonth: number;
    planBreakdown: Record<string, { count: number; mrr: number }>;
    totalExpenseAmount: number;
    totalExpenseCount: number;
    expenseByCategory: { category: string; count: number; total: number }[];
  };
  subscriptions: Subscription[];
  total: number;
  page: number;
  totalPages: number;
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiGet<FinanceData>(`/admin/finance?page=${page}&limit=30`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { summary } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Subscriptions, revenue, and in-app expense tracking</p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'MRR', value: `$${summary.mrr.toFixed(2)}`, sub: 'Monthly recurring revenue' },
          { label: 'ARR', value: `$${summary.arr.toFixed(2)}`, sub: 'Annual run rate' },
          { label: 'Active Subs', value: summary.activeSubs, sub: `${summary.newThisMonth} new this month` },
          { label: 'Churned (30d)', value: summary.canceledThisMonth, sub: 'cancellations this month' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown + expense summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue by plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue by Plan</h2>
          <div className="space-y-3">
            {['PRO_MONTHLY', 'PRO_YEARLY', 'FAMILY_MONTHLY'].map((plan) => {
              const d = summary.planBreakdown[plan] ?? { count: 0, mrr: 0 };
              const meta = PLAN_LABELS[plan];
              return (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm text-gray-600">{d.count} subscribers</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">${d.mrr.toFixed(2)}/mo</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* In-app expense stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">In-App Expenses Tracked</h2>
          <p className="text-xs text-gray-400 mb-4">User-logged expenses across all circles</p>
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">${Number(summary.totalExpenseAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400">Total logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalExpenseCount.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Entries</p>
            </div>
          </div>
          <div className="space-y-2">
            {summary.expenseByCategory.slice(0, 5).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize">{cat.category || 'Uncategorized'}</span>
                <span className="text-gray-500">${Number(cat.total).toFixed(2)} ({cat.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            All Subscriptions ({data.total})
          </h2>
          <span className="text-xs text-gray-400">Page {data.page} of {data.totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Plan</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Platform</th>
                <th className="text-left py-3 px-4 font-semibold">Purchased</th>
                <th className="text-left py-3 px-4 font-semibold">Expires</th>
                <th className="text-left py-3 px-4 font-semibold">Renews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {sub.user?.name || '—'}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">
                      {sub.user?.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_LABELS[sub.plan]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                      {PLAN_LABELS[sub.plan]?.label ?? sub.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize text-gray-600">{sub.platform}</td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {sub.originalPurchaseDate
                      ? format(parseISO(sub.originalPurchaseDate), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {sub.expiresAt
                      ? format(parseISO(sub.expiresAt), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${sub.renewalIntent ? 'text-emerald-600' : 'text-red-500'}`}>
                      {sub.renewalIntent ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    No subscriptions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
