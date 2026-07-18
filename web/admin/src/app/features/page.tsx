'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { FeatureFlag } from '@/types';

const PHASE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'mvp', label: 'MVP' },
  { key: 'post_mvp', label: 'Post-MVP' },
  { key: 'experimental', label: 'Experimental' },
] as const;

const PHASE_STYLES: Record<string, { badge: string; label: string }> = {
  mvp: { badge: 'bg-emerald-50 text-emerald-700', label: 'MVP' },
  post_mvp: { badge: 'bg-blue-50 text-blue-700', label: 'Post-MVP' },
  experimental: { badge: 'bg-purple-50 text-purple-700', label: 'Experimental' },
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [activePhase, setActivePhase] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<FeatureFlag[]>('/admin/feature-flags');
        setFlags(Array.isArray(res) ? res : []);
      } catch {
        setFlags([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredFlags = useMemo(() => {
    let result = flags;
    if (activePhase !== 'all') {
      result = result.filter((f) => f.phase === activePhase);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [flags, activePhase, search]);

  // Group filtered flags by category
  const grouped: Record<string, FeatureFlag[]> = {};
  filteredFlags.forEach((flag) => {
    const cat = flag.category || 'feature';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(flag);
  });

  const enabledCount = flags.filter((f) => f.enabled).length;

  async function handleToggle(flag: FeatureFlag) {
    const newEnabled = !flag.enabled;
    setToggling(flag.id);

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, enabled: newEnabled } : f)),
    );

    try {
      await apiPatch(`/admin/feature-flags/${flag.id}`, { enabled: newEnabled });
    } catch {
      // Revert on error
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, enabled: flag.enabled } : f)),
      );
    }
    setToggling(null);
  }

  async function handleBulkToggle(phase: string, enabled: boolean) {
    setBulkLoading(true);
    try {
      await apiPost('/admin/feature-flags/bulk', { phase, enabled });
      // Update local state
      setFlags((prev) =>
        prev.map((f) => (f.phase === phase ? { ...f, enabled } : f)),
      );
    } catch {
      // Reload on error
      try {
        const res = await apiGet<FeatureFlag[]>('/admin/feature-flags');
        setFlags(Array.isArray(res) ? res : []);
      } catch {
        // ignore
      }
    }
    setBulkLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {enabledCount} of {flags.length} features enabled.
          Toggle features to show or hide them across the platform.
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {PHASE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActivePhase(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activePhase === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {activePhase !== 'all' && (
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => handleBulkToggle(activePhase, true)}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            Enable all {PHASE_TABS.find((t) => t.key === activePhase)?.label}
          </button>
          <button
            onClick={() => handleBulkToggle(activePhase, false)}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            Disable all {PHASE_TABS.find((t) => t.key === activePhase)?.label}
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([category, categoryFlags]) => (
        <div key={category} className="mb-6 sm:mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {categoryFlags.map((flag) => {
              const phaseStyle = PHASE_STYLES[flag.phase] || PHASE_STYLES.mvp;
              return (
                <div
                  key={flag.id}
                  className={`bg-white rounded-xl border p-3 sm:p-4 transition-colors ${
                    flag.enabled
                      ? 'border-gray-200'
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {flag.label}
                        </h3>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${phaseStyle.badge}`}>
                          {phaseStyle.label}
                        </span>
                      </div>
                      {flag.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {flag.description}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 font-mono mt-1.5">
                        {flag.key}
                      </p>
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggle(flag)}
                      disabled={toggling === flag.id}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                        flag.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      aria-label={`Toggle ${flag.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          flag.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        flag.enabled
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {flag.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredFlags.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">
            {search ? 'No features match your search' : 'No feature flags configured'}
          </p>
        </div>
      )}
    </div>
  );
}
