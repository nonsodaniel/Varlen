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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {users.length} registered user{users.length !== 1 ? 's' : ''}
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
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: user.color || '#6366f1' }}
                >
                  {(user.name || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">
                  {user.name || 'Unnamed'}
                </span>
              </div>
            ),
          },
          { key: 'email', header: 'Email', sortable: true },
          {
            key: 'authProvider',
            header: 'Auth',
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
            key: 'emailVerified',
            header: 'Verified',
            render: (user) => (
              <span
                className={`text-xs ${
                  user.emailVerified ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {user.emailVerified ? 'Yes' : 'No'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Joined',
            sortable: true,
            render: (user) => (
              <span className="text-gray-500">
                {format(parseISO(user.createdAt), 'MMM d, yyyy')}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
