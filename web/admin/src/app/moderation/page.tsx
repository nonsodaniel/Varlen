'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatsCard from '@/components/StatsCard';
import { apiGet } from '@/lib/api';
import type { AuditLog } from '@/types';
import { format, parseISO } from 'date-fns';

interface HealthStatus {
  status: string;
  uptime?: number;
  database?: string;
}

export default function ModerationPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [logsRes, healthRes] = await Promise.allSettled([
        apiGet<{ logs: AuditLog[] }>('/admin/audit-logs?limit=200'),
        apiGet<HealthStatus>('/health'),
      ]);

      if (logsRes.status === 'fulfilled') {
        const data = logsRes.value;
        setLogs(Array.isArray(data) ? data : (data as any).logs || []);
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Count actions
  const actionCounts: Record<string, number> = {};
  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });
  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Audit logs and system health
        </p>
      </div>

      {/* Health + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatsCard
          title="System Status"
          value={health?.status === 'ok' ? 'Healthy' : health?.status || 'Unknown'}
          subtitle={
            health?.uptime
              ? `Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`
              : undefined
          }
        />
        <StatsCard
          title="Total Audit Logs"
          value={logs.length}
        />
        <StatsCard
          title="Unique Actions"
          value={Object.keys(actionCounts).length}
        />
      </div>

      {/* Top actions */}
      {topActions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Most Common Actions
          </h2>
          <div className="space-y-2">
            {topActions.map(([action, count]) => (
              <div key={action} className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-gray-700 font-mono truncate">
                  {action}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 sm:w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{
                        width: `${(count / logs.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit log table */}
      <DataTable
        data={logs}
        searchable
        searchKeys={['action', 'resource']}
        columns={[
          {
            key: 'action',
            header: 'Action',
            sortable: true,
            render: (log) => (
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                {log.action}
              </span>
            ),
          },
          {
            key: 'resource',
            header: 'Resource',
            sortable: true,
            render: (log) => (
              <span className="text-gray-600 text-xs sm:text-sm">{log.resource}</span>
            ),
          },
          {
            key: 'userId',
            header: 'User',
            render: (log) => (
              <span className="text-gray-500 text-xs font-mono">
                {log.user?.name || log.userId?.slice(0, 8) || '--'}
              </span>
            ),
          },
          {
            key: 'ipAddress',
            header: 'IP',
            hideOnMobile: true,
            render: (log) => (
              <span className="text-gray-400 text-xs font-mono">
                {log.ipAddress || '--'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Time',
            sortable: true,
            render: (log) => (
              <span className="text-gray-500 text-xs">
                {format(parseISO(log.createdAt), 'MMM d, h:mm a')}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
