'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import type { AdminUserDetail } from '@/types';
import { format, parseISO } from 'date-fns';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<AdminUserDetail>(`/admin/users/${id}/detail`);
        setUser(res);
      } catch {
        setUser(null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSuspend() {
    if (!user) return;
    setActionLoading('suspend');
    try {
      if (user.suspendedAt) {
        await apiPost(`/admin/users/${id}/unsuspend`, {});
        setUser({ ...user, suspendedAt: undefined });
      } else {
        await apiPost(`/admin/users/${id}/suspend`, {});
        setUser({ ...user, suspendedAt: new Date().toISOString() });
      }
    } catch {
      // stay
    }
    setActionLoading(null);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setActionLoading('delete');
    try {
      await apiDelete(`/admin/users/${id}`);
      router.push('/users');
    } catch {
      setActionLoading(null);
    }
  }

  async function handleSendNotification() {
    if (!notifyTitle.trim() || !notifyBody.trim()) return;
    setActionLoading('notify');
    try {
      await apiPost(`/admin/users/${id}/notify`, { title: notifyTitle, body: notifyBody });
      setNotifyTitle('');
      setNotifyBody('');
      setNotifySuccess(true);
      setTimeout(() => setNotifySuccess(false), 3000);
    } catch {
      // stay
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">User not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const initials = (user.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const subscription = user.appSubscriptions?.[0];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 sm:mb-6 flex items-center gap-1"
      >
        ← Back to users
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: user.color || '#6366f1' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {user.name || 'Unnamed User'}
            </h1>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.authProvider === 'google'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {user.authProvider}
              </span>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.emailVerified
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </span>
              {user.suspendedAt && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                  Suspended
                </span>
              )}
              {subscription && (
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    subscription.status === 'ACTIVE'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {subscription.plan} ({subscription.status})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">User ID</p>
            <p className="text-xs sm:text-sm text-gray-700 mt-0.5 font-mono truncate">{user.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Joined</p>
            <p className="text-xs sm:text-sm text-gray-700 mt-0.5">
              {format(parseISO(user.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Country</p>
            <p className="text-xs sm:text-sm text-gray-700 mt-0.5">{user.country || '--'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Platform</p>
            <p className="text-xs sm:text-sm text-gray-700 mt-0.5">{subscription?.platform || '--'}</p>
          </div>
        </div>
      </div>

      {/* Usage Summary */}
      {user._count && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Tasks Created</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{user._count.createdTasks ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Events Created</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{user._count.createdEvents ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Expenses Paid</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{user._count.paidExpenses ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Notifications</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{user._count.notifications ?? 0}</p>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Admin Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSuspend}
            disabled={actionLoading === 'suspend'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              user.suspendedAt
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {actionLoading === 'suspend'
              ? 'Processing...'
              : user.suspendedAt
                ? 'Unsuspend User'
                : 'Suspend User'}
          </button>

          <button
            onClick={() => setShowNotifyForm(!showNotifyForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            Send Notification
          </button>

          <button
            onClick={handleDelete}
            disabled={actionLoading === 'delete'}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete User'}
          </button>
        </div>

        {/* Notify form */}
        {showNotifyForm && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <input
              type="text"
              placeholder="Notification title"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <textarea
              placeholder="Notification body"
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSendNotification}
                disabled={actionLoading === 'notify' || !notifyTitle.trim() || !notifyBody.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'notify' ? 'Sending...' : 'Send'}
              </button>
              {notifySuccess && (
                <span className="text-xs text-emerald-600 font-medium">Notification sent</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Circles */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Circles</h2>
        {!user.memberships || user.memberships.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Not a member of any circle
          </p>
        ) : (
          <div className="space-y-3">
            {user.memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-50 last:border-0 gap-1"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {membership.household.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {membership.household.type} · {membership.household.mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {membership.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    Joined {format(parseISO(membership.joinedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
        {!user.auditLogs || user.auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No recent activity
          </p>
        ) : (
          <div className="space-y-2">
            {user.auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-50 last:border-0 gap-1"
              >
                <div>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{log.resource}</span>
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
