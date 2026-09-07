import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useAuthStore } from './authStore';
import { useCircleStore } from './circleStore';
import type { Household, User, Child, LifeMode } from '../types';
// Lazy import to avoid circular dependency — resolved at call time
function getModeStore() { return require('./modeStore').useModeStore; }

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
    const { getModeHousehold, ids: modeIds } = require('./modeHouseholdStore').useModeHouseholdStore.getState();
    const currentMode = getModeStore().getState().mode;
    const modeHid = getModeHousehold(currentMode);
    const hasAnyModeHouseholds = Object.keys(modeIds ?? {}).length > 0;
    // Strict mode isolation: once any mode-specific household exists, only use the
    // household mapped to the current mode — never bleed data from another mode.
    // Before any mode households are set (initial state), fall back to user's primary.
    const hid = get().householdId || modeHid || (!hasAnyModeHouseholds ? user?.householdId : null);
    if (!hid) return;

    set({ isLoading: true });
    try {
      // Fetch household, members, and children in parallel
      const [res, membersRes, childrenRes] = await Promise.allSettled([
        apiGet<any>(`/households/${hid}`),
        apiGet<any>(`/households/${hid}/members`),
        apiGet<any>(`/households/${hid}/children`),
      ]);

      if (res.status === 'rejected') throw res.reason;
      const h = res.value.data ?? res.value;

      const members: User[] = membersRes.status === 'fulfilled'
        ? (membersRes.value.data ?? membersRes.value ?? []).map((m: any) => ({
            id: m.userId ?? m.id,
            name: m.user?.name ?? m.name ?? '',
            email: m.user?.email ?? m.email ?? '',
            avatarUrl: m.user?.avatarUrl ?? m.avatarUrl,
            role: (m.role ?? 'partner').toLowerCase() as User['role'],
            color: m.user?.color ?? m.color,
          }))
        : [];

      let children: Child[] = [];
      if (childrenRes.status === 'fulfilled') {
        children = (childrenRes.value.data ?? childrenRes.value ?? []).map((c: any) => ({
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
      }

      const household: Household = {
        id: h.id,
        name: h.name,
        members,
        createdAt: h.createdAt,
        mode: (h.mode === 'SINGLE' ? 'personal' : (h.mode ?? 'couple').toLowerCase()) as LifeMode,
        children,
        anniversary: h.anniversary,
        togetherSince: h.togetherSince,
      };

      set({ household, members, householdId: h.id, isLoading: false });
      // Restore the persisted mode from the server so app always shows the right mode on launch
      getModeStore().getState().syncFromHousehold();
    } catch (err) {
      console.warn('[householdStore] fetchHousehold failed:', err);
      set({ isLoading: false });
    }
  },

  createHousehold: async (name) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<any>('/households', { name });
      const h = res.data ?? res;
      set({ householdId: h.id, isLoading: false });
      useAuthStore.getState().updateUser({ householdId: h.id });
      await get().fetchHousehold();
    } catch (err) {
      console.warn('[householdStore] createHousehold failed:', err);
      set({ isLoading: false });
      throw new Error('Failed to create household');
    }
  },

  joinHousehold: async (inviteCode) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<any>('/households/join', { inviteCode });
      const h = res.data ?? res;
      set({ householdId: h.id, isLoading: false });
      useAuthStore.getState().updateUser({ householdId: h.id });
      await get().fetchHousehold();
    } catch (err) {
      console.warn('[householdStore] joinHousehold failed:', err);
      set({ isLoading: false });
      throw new Error('Failed to join household');
    }
  },

  generateInviteCode: async () => {
    const { householdId } = get();
    if (!householdId) return null;
    try {
      const res = await apiPost<any>(
        `/households/${householdId}/invite`,
        {},
      );
      const result = res.data ?? res;
      return result.inviteCode;
    } catch (err) {
      console.warn('[householdStore] generateInviteCode failed:', err);
      return null;
    }
  },

  updateHousehold: async (updates) => {
    const { householdId } = get();
    if (!householdId) return;
    try {
      await apiPatch(`/households/${householdId}`, updates);
      await get().fetchHousehold();
    } catch (err) { console.warn('[householdStore] operation failed:', err); }
  },

  setMode: async (mode) => {
    const { householdId } = get();
    if (!householdId) return;
    try {
      await apiPatch(`/households/${householdId}/mode`, { mode: mode === 'personal' ? 'SINGLE' : mode.toUpperCase() });
      set((s) => ({
        household: s.household ? { ...s.household, mode } : null,
      }));
    } catch (err) { console.warn('[householdStore] operation failed:', err); }
  },

  reset: () => set({ household: null, members: [], householdId: null, isLoading: false }),
}));

/**
 * Resolve the household ID from the best available source.
 * Falls back through householdStore → circleStore → authStore.
 * Mode-aware: once any mode-specific households exist, never bleed to another mode's data.
 */
export function getResolvedHouseholdId(): string | null {
  const hid = useHouseholdStore.getState().householdId;
  if (hid) return hid;

  // If mode-specific households have been configured, stay isolated — don't fall back to
  // circleStore or user.householdId which may belong to a completely different mode.
  try {
    const modeHouseholdStore = require('./modeHouseholdStore').useModeHouseholdStore;
    const { ids: modeIds } = modeHouseholdStore.getState();
    const hasAnyModeHouseholds = Object.keys(modeIds ?? {}).length > 0;
    if (hasAnyModeHouseholds) {
      return null; // Current mode has no dedicated household yet — don't leak another mode's data
    }
  } catch {}

  const circleId = useCircleStore.getState().getEffectiveCircleId();
  if (circleId) {
    useHouseholdStore.setState({ householdId: circleId });
    return circleId;
  }

  const userHid = useAuthStore.getState().user?.householdId ?? null;
  if (userHid) {
    useHouseholdStore.setState({ householdId: userHid });
  }
  return userHid;
}

/**
 * Ensures a household exists for the current user.
 * Returns the existing household ID or creates a personal household and returns its ID.
 * Returns null only if creation fails.
 */
export async function ensureHouseholdId(): Promise<string | null> {
  const existing = getResolvedHouseholdId();
  if (existing) return existing;
  try {
    const { user } = useAuthStore.getState();
    const name = user?.name ? `${user.name}'s Space` : 'My Space';
    await useHouseholdStore.getState().createHousehold(name);
    return useHouseholdStore.getState().householdId;
  } catch {
    console.warn('[householdStore] ensureHouseholdId: failed to create household');
    return null;
  }
}

// Sync householdId with circle store's active circle selection.
// Deferred to avoid running during module initialization before JSI/worklets are ready.
let _circleSyncUnsub: (() => void) | null = null;
export function initCircleSync() {
  if (_circleSyncUnsub) return;
  _circleSyncUnsub = useCircleStore.subscribe((state) => {
    const effectiveId = state.activeCircleId || state.primaryCircleId;
    const current = useHouseholdStore.getState().householdId;
    if (effectiveId && effectiveId !== current) {
      // Once mode isolation is active (ANY mode has a dedicated household configured),
      // circleSync must NEVER override householdId. primaryCircleId is the personal
      // household and would leak personal data into other modes that have no household.
      const modeHouseholdStore = require('./modeHouseholdStore').useModeHouseholdStore;
      const { ids: modeIds } = modeHouseholdStore.getState();
      if (Object.keys(modeIds ?? {}).length > 0) return;
      // Legacy fallback only: no mode households configured yet
      useHouseholdStore.setState({ householdId: effectiveId });
    }
  });
}

export function stopCircleSync() {
  if (_circleSyncUnsub) {
    _circleSyncUnsub();
    _circleSyncUnsub = null;
  }
}
