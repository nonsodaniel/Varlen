import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

export interface Circle {
  id: string;
  name: string;
  type: 'PRIMARY' | 'EXTENDED' | 'FRIENDS' | 'CUSTOM';
  emoji?: string;
  color?: string;
  description?: string;
  memberCount?: number;
}

interface CircleState {
  circles: Circle[];
  activeCircleId: string | null;
  primaryCircleId: string | null;
  isLoading: boolean;
  fetchCircles: () => Promise<void>;
  createCircle: (data: { name: string; type?: string; emoji?: string; color?: string; description?: string }) => Promise<Circle | null>;
  updateCircle: (circleId: string, data: Partial<Circle>) => Promise<void>;
  deleteCircle: (circleId: string) => Promise<void>;
  removeMember: (householdId: string, userId: string) => Promise<boolean>;
  leaveCircle: (householdId: string) => Promise<boolean>;
  setActiveCircle: (circleId: string | null) => void;
  getEffectiveCircleId: () => string | null;
  reset: () => void;
}

export const useCircleStore = create<CircleState>((set, get) => ({
  circles: [],
  activeCircleId: null,
  primaryCircleId: null,
  isLoading: false,

  fetchCircles: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>('/circles/me');
      const circles: Circle[] = (res.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'CUSTOM',
        emoji: c.emoji,
        color: c.color,
        description: c.description,
        memberCount: c._count?.members ?? c.memberCount,
      }));

      const primary = circles.find((c) => c.type === 'PRIMARY');
      set({
        circles,
        primaryCircleId: primary?.id || circles[0]?.id || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  createCircle: async (data) => {
    const res = await apiPost<any>('/circles', data);
    const raw = res?.data ?? res;
    if (!raw?.id) return null;
    const circle: Circle = {
      id: raw.id,
      name: raw.name,
      type: raw.type || 'CUSTOM',
      emoji: raw.emoji,
      color: raw.color,
      description: raw.description,
    };
    set((s) => ({ circles: [...s.circles, circle] }));
    return circle;
  },

  updateCircle: async (circleId, data) => {
    try {
      await apiPatch(`/circles/${circleId}`, data);
      set((s) => ({
        circles: s.circles.map((c) =>
          c.id === circleId ? { ...c, ...data } : c,
        ),
      }));
    } catch {}
  },

  deleteCircle: async (circleId) => {
    try {
      await apiDelete(`/circles/${circleId}`);
      set((s) => ({
        circles: s.circles.filter((c) => c.id !== circleId),
        activeCircleId: s.activeCircleId === circleId ? null : s.activeCircleId,
      }));
    } catch {}
  },

  removeMember: async (householdId, userId) => {
    try {
      await apiDelete(`/households/${householdId}/members/${userId}`);
      return true;
    } catch {
      return false;
    }
  },

  leaveCircle: async (householdId) => {
    try {
      await apiPost(`/households/${householdId}/leave`, {});
      return true;
    } catch {
      return false;
    }
  },

  setActiveCircle: (circleId) => {
    set({ activeCircleId: circleId });
  },

  getEffectiveCircleId: () => {
    const { activeCircleId, primaryCircleId } = get();
    return activeCircleId || primaryCircleId;
  },

  reset: () => set({ circles: [], activeCircleId: null, primaryCircleId: null, isLoading: false }),
}));
