'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { apiGet } from '@/lib/api';
import type { Circle } from '@/types';
import { format, parseISO } from 'date-fns';

export default function CirclesPage() {
  const router = useRouter();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<Circle[]>('/circles');
        setCircles(Array.isArray(res) ? res : []);
      } catch {
        setCircles([]);
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
        <h1 className="text-2xl font-bold text-gray-900">Circles</h1>
        <p className="text-sm text-gray-500 mt-1">
          {circles.length} circle{circles.length !== 1 ? 's' : ''}
        </p>
      </div>

      <DataTable
        data={circles}
        searchable
        searchKeys={['name']}
        onRowClick={(circle) => router.push(`/circles/${circle.id}`)}
        columns={[
          {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (circle) => (
              <div className="flex items-center gap-2">
                {circle.emoji && <span>{circle.emoji}</span>}
                <span className="font-medium text-gray-900">
                  {circle.name}
                </span>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            sortable: true,
            render: (circle) => (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                {circle.type}
              </span>
            ),
          },
          {
            key: 'members',
            header: 'Members',
            render: (circle) => (
              <span className="text-gray-600">
                {circle._count?.members ?? 0}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Created',
            sortable: true,
            render: (circle) => (
              <span className="text-gray-500">
                {format(parseISO(circle.createdAt), 'MMM d, yyyy')}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
