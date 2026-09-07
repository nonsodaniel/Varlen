import { create } from 'zustand';
import { Share } from 'react-native';
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
  token?: string;
  expiresAt: string;
  createdAt: string;
}

const SHARE_MESSAGES: Record<string, string> = {
  couple: "Hey! I'm using Sivena to plan life together with my partner — shared calendar, expenses, tasks, and memories in one place. Join me using this link:",
  family: "Hey! Our family is using Sivena to stay organised and connected. We share our calendars, split tasks, track spending, and save memories together. Join our family space:",
  parenting: "Hey! We're using Sivena to co-ordinate everything for the kids — feeding schedules, sleep tracking, school activities, and growth milestones. Join our parenting space:",
  default: "Hey! I'm using Sivena to organise life and stay connected with the people I care about. Join my space using this link:",
};

interface InviteState {
  incoming: CircleInvite[];
  isLoading: boolean;
  fetchIncoming: () => Promise<void>;
  sendInvite: (circleId: string, data: { userId?: string; email?: string; phone?: string; role?: string }) => Promise<CircleInvite | null>;
  generateAndShare: (circleId: string, mode: string) => Promise<boolean>;
  acceptInvite: (token: string) => Promise<{ circle: { id: string; name: string } } | null>;
  declineInvite: (token: string) => Promise<void>;
  revokeInvite: (circleId: string, inviteId: string) => Promise<void>;
  getInviteByToken: (token: string) => Promise<{ circle: { id: string; name: string; emoji?: string; color?: string }; role: string; expired: boolean; status?: string } | null>;
  searchUsers: (query: string) => Promise<SearchUser[]>;
  getCircleInvites: (circleId: string) => Promise<CircleInvite[]>;
  resendInvite: (circleId: string, inviteId: string) => Promise<boolean>;
}

export const useInviteStore = create<InviteState>((set) => ({
  incoming: [],
  isLoading: false,

  fetchIncoming: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{ data: any[] }>('/me/invites');
      set({ incoming: res.data ?? (res as any) ?? [], isLoading: false });
    } catch (err) {
      console.warn('[inviteStore] fetchIncoming failed:', err);
      set({ isLoading: false });
    }
  },

  sendInvite: async (circleId, data) => {
    try {
      const res = await apiPost<{ data: CircleInvite }>(`/circles/${circleId}/invites`, data);
      const invite = res.data ?? (res as any);
      if (invite && !invite.inviteLink && invite.token) {
        invite.inviteLink = `https://sivena.app/join/${invite.token}`;
      }
      return invite;
    } catch (error) {
      console.warn('[inviteStore] sendInvite failed:', error);
      return null;
    }
  },

  generateAndShare: async (circleId, mode) => {
    try {
      const res = await apiPost<{ data: CircleInvite }>(`/circles/${circleId}/invites`, {});
      const invite = res.data ?? (res as any);

      if (!invite?.token) return false;

      const link = invite.inviteLink || `https://sivena.app/join/${invite.token}`;
      const message = SHARE_MESSAGES[mode] || SHARE_MESSAGES.default;

      await Share.share({ message: `${message}\n\n${link}` });
      return true;
    } catch (error) {
      console.warn('[inviteStore] generateAndShare failed:', error);
      return false;
    }
  },

  acceptInvite: async (token) => {
    try {
      const res = await apiPost<{ data: any }>(`/invites/${token}/accept`, {});
      const result = res.data ?? (res as any);
      set((s) => ({
        incoming: s.incoming.filter((inv) =>
          inv.token !== token && inv.inviteLink?.split('/').pop() !== token
        ),
      }));
      return result;
    } catch (error) {
      console.warn('[inviteStore] acceptInvite failed:', error);
      return null;
    }
  },

  declineInvite: async (token) => {
    try {
      await apiPost(`/invites/${token}/decline`, {});
      set((s) => ({
        incoming: s.incoming.filter((inv) =>
          inv.token !== token && inv.inviteLink?.split('/').pop() !== token
        ),
      }));
    } catch (error) {
      console.warn('[inviteStore] declineInvite failed:', error);
    }
  },

  revokeInvite: async (circleId, inviteId) => {
    try {
      await apiDelete(`/circles/${circleId}/invites/${inviteId}`);
    } catch (err) { console.warn('[inviteStore] operation failed:', err); }
  },

  getInviteByToken: async (token) => {
    try {
      const res = await apiGet<{ data: any }>(`/invites/${token}`);
      return res.data ?? (res as any);
    } catch (err) {
      console.warn('[inviteStore] getInviteByToken failed:', err);
      return null;
    }
  },

  searchUsers: async (query) => {
    try {
      const res = await apiGet<any>(`/users/search?q=${encodeURIComponent(query)}`);
      return res.data ?? (res as any) ?? [];
    } catch (err) {
      console.warn('[inviteStore] searchUsers failed:', err);
      return [];
    }
  },

  // #15: Get outgoing invites for a circle
  getCircleInvites: async (circleId: string) => {
    try {
      const res = await apiGet<{ data: CircleInvite[] }>(`/circles/${circleId}/invites`);
      return res.data ?? (res as any) ?? [];
    } catch (err) {
      console.warn('[inviteStore] getCircleInvites failed:', err);
      return [];
    }
  },

  // #15: Resend invite notification
  resendInvite: async (circleId: string, inviteId: string) => {
    try {
      await apiPost(`/circles/${circleId}/invites/${inviteId}/resend`, {});
      return true;
    } catch (err) {
      console.warn('[inviteStore] resendInvite failed:', err);
      return false;
    }
  },
}));
