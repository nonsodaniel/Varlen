import { create } from 'zustand';
import { apiGet, apiPost, apiDelete } from '../services/api';

export interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color?: string;
}

export interface CircleInvite {
  id: string;
  circleId: string;
  circle: { id: string; name: string; emoji?: string; color?: string };
  role: string;
  status: string;
  inviteLink: string;
  expiresAt: string;
  createdAt: string;
}

interface InviteState {
  incoming: CircleInvite[];
  isLoading: boolean;
  fetchIncoming: () => Promise<void>;
  sendInvite: (circleId: string, data: { userId?: string; email?: string; phone?: string; role?: string }) => Promise<CircleInvite | null>;
  acceptInvite: (token: string) => Promise<{ circle: { id: string; name: string } } | null>;
  declineInvite: (token: string) => Promise<void>;
  revokeInvite: (circleId: string, inviteId: string) => Promise<void>;
  getInviteByToken: (token: string) => Promise<{ circle: { id: string; name: string; emoji?: string; color?: string }; role: string; expired: boolean } | null>;
  searchUsers: (query: string) => Promise<SearchUser[]>;
}

export const useInviteStore = create<InviteState>((set) => ({
  incoming: [],
  isLoading: false,

  fetchIncoming: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>('/me/invites');
      set({ incoming: res.data ?? (res as any) ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendInvite: async (circleId, data) => {
    try {
      const res = await apiPost<{ data: CircleInvite }>(`/circles/${circleId}/invites`, data);
      return res.data ?? (res as any);
    } catch {
      return null;
    }
  },

  acceptInvite: async (token) => {
    try {
      const res = await apiPost<{ data: any }>(`/invites/${token}/accept`, {});
      const result = res.data ?? (res as any);
      // Remove from incoming list
      set((s) => ({
        incoming: s.incoming.filter((inv) => !inv.inviteLink?.includes(token)),
      }));
      return result;
    } catch {
      return null;
    }
  },

  declineInvite: async (token) => {
    try {
      await apiPost(`/invites/${token}/decline`, {});
      set((s) => ({
        incoming: s.incoming.filter((inv) => !inv.inviteLink?.includes(token)),
      }));
    } catch {}
  },

  revokeInvite: async (circleId, inviteId) => {
    try {
      await apiDelete(`/circles/${circleId}/invites/${inviteId}`);
    } catch {}
  },

  getInviteByToken: async (token) => {
    try {
      const res = await apiGet<{ data: any }>(`/invites/${token}`);
      return res.data ?? (res as any);
    } catch {
      return null;
    }
  },

  searchUsers: async (query) => {
    try {
      const res = await apiGet<any>(`/users/search?q=${encodeURIComponent(query)}`);
      return res.data ?? (res as any) ?? [];
    } catch {
      return [];
    }
  },
}));
