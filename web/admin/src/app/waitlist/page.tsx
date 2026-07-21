'use client';

import { useEffect, useState, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import { SimpleBarChart } from '@/components/Charts';
import { apiGet, apiDelete } from '@/lib/api';
import { format, parseISO } from 'date-fns';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  country: string | null;
  source: string | null;
  createdAt: string;
}

interface WaitlistStats {
  total: number;
  today: number;
  thisWeek: number;
  byCountry: { country: string; count: number }[];
  bySource: { source: string; count: number }[];
  recentSignups: WaitlistEntry[];
}

interface WaitlistListResponse {
  data: WaitlistEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function WaitlistPage() {
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'overview' | 'list'>('overview');

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiGet<WaitlistStats>('/waitlist/stats');
      setStats(res);
    } catch {}
  }, []);

  const fetchEntries = useCallback(async (p = 1) => {
    try {
      const res = await apiGet<WaitlistListResponse>(`/waitlist?page=${p}&limit=50`);
      setEntries(res.data);
      setMeta(res.meta);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchEntries()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEntries(page);
  }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this entry from the waitlist?')) return;
    try {
      await apiDelete(`/waitlist/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      fetchStats();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Waitlist</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Track signups and interest</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('overview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              view === 'overview'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              view === 'list'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Signups
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatsCard title="Total Signups" value={stats.total} />
          <StatsCard title="Today" value={stats.today} />
          <StatsCard title="This Week" value={stats.thisWeek} />
        </div>
      )}

      {view === 'overview' ? (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Country distribution */}
            {stats && stats.byCountry.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Signups by Country</h3>
                <SimpleBarChart
                  data={stats.byCountry.map((c) => ({ name: c.country, value: c.count }))}
                  xKey="name"
                  yKey="value"
                  color="#6366F1"
                />
              </div>
            )}

            {/* Source distribution */}
            {stats && stats.bySource.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Signups by Source</h3>
                <div className="space-y-3">
                  {stats.bySource.map((s) => (
                    <div key={s.source} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{s.source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-indigo-500 rounded-full h-2 transition-all"
                            style={{ width: `${(s.count / (stats?.total || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent signups */}
          {stats && stats.recentSignups.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Signups</h3>
              <div className="space-y-2">
                {stats.recentSignups.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {(entry.name || entry.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.name || entry.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500">{entry.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{entry.country || '—'}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(entry.createdAt), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stats && stats.total === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-4xl mb-3">&#128236;</p>
              <p className="text-gray-500 text-sm">No waitlist signups yet. Share your landing page to start collecting interest.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Full list view */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Country</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Source</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{((meta?.page || 1) - 1) * 50 + i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.email}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.country || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full capitalize">
                          {entry.source || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{format(parseISO(entry.createdAt), 'MMM d, yyyy h:mm a')}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No signups yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((meta.page - 1) * 50) + 1}–{Math.min(meta.page * 50, meta.total)} of {meta.total}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
