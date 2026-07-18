'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { apiGet } from '@/lib/api';
import type { User } from '@/types';
import { format, parseISO } from 'date-fns';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<{ users: User[]; total: number }>('/admin/users?limit=500');
        setUsers(Array.isArray(res.users) ? res.users : []);
        setTotal(res.total || 0);
      } catch {
        setUsers([]);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} registered user{total !== 1 ? 's' : ''}
        </p>
      </div>

      <DataTable
        data={users}
        searchable
        searchKeys={['name', 'email']}
        onRowClick={(user) => router.push(`/users/${user.id}`)}
        columns={[
          {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (user) => (
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.color || '#6366f1' }}
                >
                  {(user.name || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="font-medium text-gray-900 truncate">
                  {user.name || 'Unnamed'}
                </span>
              </div>
            ),
          },
          { key: 'email', header: 'Email', sortable: true, hideOnMobile: true },
          {
            key: 'authProvider',
            header: 'Auth',
            hideOnMobile: true,
            render: (user) => (
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.authProvider === 'google'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {user.authProvider}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (user) => {
              if (user.suspendedAt) {
                return (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                    Suspended
                  </span>
                );
              }
              return (
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.emailVerified
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {user.emailVerified ? 'Verified' : 'Unverified'}
                </span>
              );
            },
          },
          {
            key: 'country',
            header: 'Country',
            hideOnMobile: true,
            render: (user) => (
              <span className="text-xs text-gray-500">
                {user.country || '--'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Joined',
            sortable: true,
            render: (user) => (
              <span className="text-gray-500 text-xs sm:text-sm">
                {format(parseISO(user.createdAt), 'MMM d, yyyy')}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
