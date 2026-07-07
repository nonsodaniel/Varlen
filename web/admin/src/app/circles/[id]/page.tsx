'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { Circle, CircleMember } from '@/types';
import { format, parseISO } from 'date-fns';

interface CircleDetail extends Circle {
  mode?: string;
  members?: CircleMember[];
}

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<CircleDetail>(`/households/${id}`);
        setCircle(res);
      } catch {
        setCircle(null);
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

  if (!circle) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Circle not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Back to circles
      </button>

      {/* Circle info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {circle.emoji && (
            <span className="text-3xl">{circle.emoji}</span>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{circle.name}</h1>
            {circle.description && (
              <p className="text-sm text-gray-500 mt-0.5">
                {circle.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Type
            </p>
            <p className="text-sm text-gray-700 mt-0.5">{circle.type}</p>
          </div>
          {circle.mode && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Mode
              </p>
              <p className="text-sm text-gray-700 mt-0.5">{circle.mode}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Members
            </p>
            <p className="text-sm text-gray-700 mt-0.5">
              {circle._count?.members ?? circle.members?.length ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Created
            </p>
            <p className="text-sm text-gray-700 mt-0.5">
              {format(parseISO(circle.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Members</h2>
        {!circle.members || circle.members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No members found
          </p>
        ) : (
          <div className="space-y-3">
            {circle.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-indigo-500"
                  >
                    {(member.user?.name || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {member.role}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    Joined {format(parseISO(member.joinedAt), 'MMM d, yyyy')}
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
