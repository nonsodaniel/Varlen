'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { User } from '@/types';
import { format, parseISO } from 'date-fns';

interface UserDetail extends User {
  householdMembers?: {
    id: string;
    role: string;
    joinedAt: string;
    household: {
      id: string;
      name: string;
      type: string;
      mode: string;
    };
  }[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<UserDetail>(`/users/${id}`);
        setUser(res);
      } catch {
        setUser(null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

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

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Back to users
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: user.color || '#6366f1' }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {user.name || 'Unnamed User'}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex gap-3 mt-3">
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              User ID
            </p>
            <p className="text-sm text-gray-700 mt-0.5 font-mono">{user.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Joined
            </p>
            <p className="text-sm text-gray-700 mt-0.5">
              {format(parseISO(user.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Circles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Circles</h2>
        {!user.householdMembers || user.householdMembers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Not a member of any circle
          </p>
        ) : (
          <div className="space-y-3">
            {user.householdMembers.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {membership.household.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {membership.household.type} · {membership.household.mode}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {membership.role}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    Joined {format(parseISO(membership.joinedAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
