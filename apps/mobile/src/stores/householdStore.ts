import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useAuthStore } from './authStore';
import { useCircleStore } from './circleStore';
import type { Household, User, Child, LifeMode } from '../types';

interface HouseholdState {
  household: Household | null;
  members: User[];
  isLoading: boolean;
  householdId: string | null;
  fetchHousehold: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  generateInviteCode: () => Promise<string | null>;
  updateHousehold: (updates: Record<string, unknown>) => Promise<void>;
  setMode: (mode: LifeMode) => Promise<void>;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  household: null,
  members: [],
  isLoading: false,
  householdId: null,

  fetchHousehold: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.householdId) return;

    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any }>(`/households/${user.householdId}`);
      const h = res.data;

      const membersRes = await apiGet<{ data: any[] }>(`/households/${user.householdId}/members`);
      const members: User[] = membersRes.data.map((m: any) => ({
        id: m.userId ?? m.id,
        name: m.user?.name ?? m.name ?? '',
        email: m.user?.email ?? m.email ?? '',
        avatarUrl: m.user?.avatarUrl ?? m.avatarUrl,
        role: (m.role ?? 'partner').toLowerCase() as User['role'],
        color: m.user?.color ?? m.color,
      }));

      // Fetch children if any
      let children: Child[] = [];
      try {
        const childrenRes = await apiGet<{ data: any[] }>(`/households/${user.householdId}/children`);
        children = (childrenRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name ?? '',
          dateOfBirth: c.dateOfBirth ?? '',
          avatarUrl: c.avatarUrl,
          color: c.color ?? '#8B5CF6',
          schoolName: c.schoolName,
          allergies: c.allergies,
          bedtime: c.bedtime,
          notes: c.notes,
        }));
      } catch {}

      const household: Household = {
        id: h.id,
        name: h.name,
        members,
        createdAt: h.createdAt,
        mode: (h.mode ?? 'couple').toLowerCase() as LifeMode,
        children,
        anniversary: h.anniversary,
        togetherSince: h.togetherSince,
      };

      set({ household, members, householdId: h.id, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createHousehold: async (name) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<{ data: any }>('/households', { name });
      const h = res.data;
      set({ householdId: h.id, isLoading: false });
      useAuthStore.getState().updateUser({ householdId: h.id });
      await get().fetchHousehold();
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to create household');
    }
  },

  joinHousehold: async (inviteCode) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<{ data: any }>('/households/join', { inviteCode });
      const h = res.data;
      set({ householdId: h.id, isLoading: false });
      useAuthStore.getState().updateUser({ householdId: h.id });
      await get().fetchHousehold();
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to join household');
    }
  },

  generateInviteCode: async () => {
    const { householdId } = get();
    if (!householdId) return null;
    try {
      const res = await apiPost<{ data: { inviteCode: string } }>(
        `/households/${householdId}/invite`,
        {},
      );
      return res.data.inviteCode;
    } catch {
      return null;
    }
  },

  updateHousehold: async (updates) => {
    const { householdId } = get();
    if (!householdId) return;
    try {
      await apiPatch(`/households/${householdId}`, updates);
      await get().fetchHousehold();
    } catch {}
  },

  setMode: async (mode) => {
    const { householdId } = get();
    if (!householdId) return;
    try {
      await apiPatch(`/households/${householdId}/mode`, { mode: mode.toUpperCase() });
      set((s) => ({
        household: s.household ? { ...s.household, mode } : null,
      }));
    } catch {}
  },

  reset: () => set({ household: null, members: [], householdId: null, isLoading: false }),
}));

// Sync householdId with circle store's active circle selection.
// Deferred to avoid running during module initialization before JSI/worklets are ready.
let _circleSubInitialized = false;
export function initCircleSync() {
  if (_circleSubInitialized) return;
  _circleSubInitialized = true;
  useCircleStore.subscribe((state) => {
    const effectiveId = state.activeCircleId || state.primaryCircleId;
    const current = useHouseholdStore.getState().householdId;
    if (effectiveId && effectiveId !== current) {
      useHouseholdStore.setState({ householdId: effectiveId });
    }
  });
}
