import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { useAuthStore } from './authStore';

export type MessageType = 'text' | 'activity_card' | 'poll' | 'date_idea' | 'image' | 'nudge' | 'location';

export interface PollData {
  question: string;
  options: string[];
  votes: Record<string, number>; // userId -> option index
  closed?: boolean;
}

export interface ActivityCardData {
  activityType: 'task' | 'event' | 'expense';
  activityId: string;
  activityTitle: string;
  activityMeta?: string; // e.g. "Due tomorrow", "$24.00", "3pm"
  activityColor?: string;
  completed?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  mapsUrl: string;
}

export interface DateIdeaData {
  ideas: string[];
  likes: Record<string, number>; // userId -> idea index they liked (-1 = none)
  matched?: number; // idea index both picked
}

export interface ReplyData {
  messageId: string;
  senderName: string;
  content: string; // preview text of replied-to message
  type: MessageType;
}

export interface ChatMessage {
  id: string;
  householdId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  poll?: PollData;
  activityCard?: ActivityCardData;
  dateIdea?: DateIdeaData;
  location?: LocationData;
  replyTo?: ReplyData;
  createdAt: string;
  readBy: string[];
  // Optimistic state
  _pending?: boolean;
  _failed?: boolean;
}

export interface TypingUser {
  userId: string;
  name: string;
  expiresAt: number;
}

interface ChatState {
  // messages per householdId
  messagesByHousehold: Record<string, ChatMessage[]>;
  // offline queue: messages to send when reconnected
  pendingQueue: ChatMessage[];
  // typing indicators per householdId
  typingByHousehold: Record<string, TypingUser[]>;
  isLoading: boolean;

  fetchMessages: (householdId: string, force?: boolean) => Promise<void>;
  sendMessage: (householdId: string, message: Omit<ChatMessage, 'id' | 'householdId' | 'createdAt' | 'readBy'>) => Promise<void>;
  receiveMessage: (message: ChatMessage) => void;
  markRead: (householdId: string) => void;
  votePoll: (householdId: string, messageId: string, optionIndex: number) => void;
  likeDateIdea: (householdId: string, messageId: string, ideaIndex: number) => void;
  starredMessages: string[];
  setTyping: (householdId: string, user: TypingUser) => void;
  clearTyping: (householdId: string, userId: string) => void;
  starMessage: (messageId: string) => void;
  unstarMessage: (messageId: string) => void;
  deleteMessage: (householdId: string, messageId: string) => void;
  markReadByUser: (householdId: string, userId: string) => void;
  getUnreadCount: (householdId: string) => number;
  getMessages: (householdId: string) => ChatMessage[];
  clearHousehold: (householdId: string) => void;
  clear: () => void;
}

let _lastFetchedAt: Record<string, number> = {};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messagesByHousehold: {},
      pendingQueue: [],
      typingByHousehold: {},
      starredMessages: [],
      isLoading: false,

      fetchMessages: async (householdId, force?) => {
        const msgs = get().messagesByHousehold[householdId] ?? [];
        const hasData = msgs.length > 0;
        const lastFetch = _lastFetchedAt[householdId] ?? 0;
        if (!force && hasData && Date.now() - lastFetch < 30000) return;

        set({ isLoading: !hasData });
        try {
          const res = await apiGet<any>(`/households/${householdId}/messages?limit=60`);
          const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.messages ?? []);
          const messages: ChatMessage[] = raw.map(mapMessage); // oldest first → newest at bottom
          _lastFetchedAt[householdId] = Date.now();
          set((state) => ({
            messagesByHousehold: { ...state.messagesByHousehold, [householdId]: messages },
            isLoading: false,
          }));
        } catch (err) {
          console.warn('[chatStore] fetchMessages failed:', err);
          set({ isLoading: false });
        }
      },

      sendMessage: async (householdId, payload) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimistic: ChatMessage = {
          id: tempId,
          householdId,
          senderAvatar: user.avatarUrl,
          createdAt: new Date().toISOString(),
          readBy: [user.id],
          _pending: true,
          ...payload,
          senderId: user.id,
          senderName: user.name,
        };

        // Add optimistic message
        set((state) => {
          const existing = state.messagesByHousehold[householdId] ?? [];
          return {
            messagesByHousehold: {
              ...state.messagesByHousehold,
              [householdId]: [...existing, optimistic],
            },
          };
        });

        try {
          const res = await apiPost<any>(`/households/${householdId}/messages`, {
            type: payload.type,
            content: payload.content,
            poll: payload.poll,
            activityCard: payload.activityCard,
            dateIdea: payload.dateIdea,
            location: payload.location,
            replyTo: payload.replyTo,
          });
          // Ensure householdId and sender identity are preserved even if server omits them.
          // We know the current user sent this message, so patch their info as fallback.
          const mapped = mapMessage(res?.data ?? res);
          const created: ChatMessage = {
            ...mapped,
            householdId,
            senderId: mapped.senderId ?? user.id,
            senderName: mapped.senderName !== 'Unknown' ? mapped.senderName : user.name,
            senderAvatar: mapped.senderAvatar ?? user.avatarUrl,
          };

          // Replace optimistic with real, also remove any socket-echoed duplicate
          set((state) => {
            const existing = state.messagesByHousehold[householdId] ?? [];
            const without = existing.filter((m) => m.id !== tempId && m.id !== created.id);
            return {
              messagesByHousehold: {
                ...state.messagesByHousehold,
                [householdId]: [...without, { ...created, _pending: false }],
              },
            };
          });
          _lastFetchedAt[householdId] = 0; // force next fetch to refresh
        } catch (err) {
          console.warn('[chatStore] sendMessage failed:', err);
          // Mark as failed — user can tap to retry
          set((state) => {
            const existing = state.messagesByHousehold[householdId] ?? [];
            return {
              messagesByHousehold: {
                ...state.messagesByHousehold,
                [householdId]: existing.map((m) => m.id === tempId ? { ...m, _pending: false, _failed: true } : m),
              },
            };
          });
        }
      },

      receiveMessage: (message) => {
        if (!message.householdId) return; // Can't store without a householdId key
        set((state) => {
          const existing = state.messagesByHousehold[message.householdId] ?? [];
          const idx = existing.findIndex((m) => m.id === message.id);
          if (idx >= 0) {
            // Update in-place: covers date idea like updates, poll state sync, etc.
            const updated = existing.slice();
            updated[idx] = { ...existing[idx], ...message };
            return {
              messagesByHousehold: {
                ...state.messagesByHousehold,
                [message.householdId]: updated,
              },
            };
          }
          return {
            messagesByHousehold: {
              ...state.messagesByHousehold,
              [message.householdId]: [...existing, message],
            },
          };
        });
      },

      markRead: (householdId) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set((state) => {
          const msgs = state.messagesByHousehold[householdId] ?? [];
          const updated = msgs.map((m) =>
            m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] }
          );
          return { messagesByHousehold: { ...state.messagesByHousehold, [householdId]: updated } };
        });
        // Best-effort backend mark-read
        apiPost(`/households/${householdId}/messages/read`, {}).catch(() => {});
      },

      votePoll: (householdId, messageId, optionIndex) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        // Snapshot for rollback
        const prevMessages = get().messagesByHousehold[householdId];
        set((state) => {
          const msgs = state.messagesByHousehold[householdId] ?? [];
          const updated = msgs.map((m) => {
            if (m.id !== messageId || !m.poll) return m;
            const votes = { ...m.poll.votes, [userId]: optionIndex };
            return { ...m, poll: { ...m.poll, votes } };
          });
          return { messagesByHousehold: { ...state.messagesByHousehold, [householdId]: updated } };
        });
        apiPost(`/households/${householdId}/messages/${messageId}/vote`, { optionIndex }).catch(() => {
          // Rollback on failure so UI stays consistent with server truth
          if (prevMessages) {
            set((state) => ({
              messagesByHousehold: { ...state.messagesByHousehold, [householdId]: prevMessages },
            }));
          }
        });
      },

      likeDateIdea: (householdId, messageId, ideaIndex) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        // Snapshot for rollback
        const prevMessages = get().messagesByHousehold[householdId];
        set((state) => {
          const msgs = state.messagesByHousehold[householdId] ?? [];
          const updated = msgs.map((m) => {
            if (m.id !== messageId || !m.dateIdea) return m;
            const likes = { ...m.dateIdea.likes, [userId]: ideaIndex };
            // Check for a match
            const vals = Object.values(likes);
            const matched = vals.length >= 2 && vals.every((v) => v === vals[0]) ? vals[0] : undefined;
            return { ...m, dateIdea: { ...m.dateIdea, likes, ...(matched !== undefined ? { matched } : {}) } };
          });
          return { messagesByHousehold: { ...state.messagesByHousehold, [householdId]: updated } };
        });
        apiPost(`/households/${householdId}/messages/${messageId}/like`, { ideaIndex }).catch(() => {
          // Rollback on failure
          if (prevMessages) {
            set((state) => ({
              messagesByHousehold: { ...state.messagesByHousehold, [householdId]: prevMessages },
            }));
          }
        });
      },

      setTyping: (householdId, user) => {
        set((state) => {
          const current = (state.typingByHousehold[householdId] ?? []).filter(
            (t) => t.userId !== user.userId && t.expiresAt > Date.now()
          );
          return {
            typingByHousehold: { ...state.typingByHousehold, [householdId]: [...current, user] },
          };
        });
      },

      clearTyping: (householdId, userId) => {
        set((state) => {
          const current = (state.typingByHousehold[householdId] ?? []).filter((t) => t.userId !== userId);
          return { typingByHousehold: { ...state.typingByHousehold, [householdId]: current } };
        });
      },

      starMessage: (messageId) => {
        set((s) => ({
          starredMessages: s.starredMessages.includes(messageId)
            ? s.starredMessages
            : [...s.starredMessages, messageId],
        }));
      },

      unstarMessage: (messageId) => {
        set((s) => ({
          starredMessages: s.starredMessages.filter((id) => id !== messageId),
        }));
      },

      deleteMessage: (householdId, messageId) => {
        set((s) => {
          const existing = s.messagesByHousehold[householdId] ?? [];
          return {
            messagesByHousehold: {
              ...s.messagesByHousehold,
              [householdId]: existing.filter((m) => m.id !== messageId),
            },
            starredMessages: s.starredMessages.filter((id) => id !== messageId),
          };
        });
        // Best-effort server delete — ignore errors silently
        apiDelete(`/households/${householdId}/messages/${messageId}`).catch(() => {});
      },

      markReadByUser: (householdId, userId) => {
        set((state) => {
          const msgs = state.messagesByHousehold[householdId] ?? [];
          const updated = msgs.map((m) =>
            m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] }
          );
          return { messagesByHousehold: { ...state.messagesByHousehold, [householdId]: updated } };
        });
      },

      getUnreadCount: (householdId) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return 0;
        const msgs = get().messagesByHousehold[householdId] ?? [];
        return msgs.filter((m) => !m.readBy.includes(userId) && m.senderId !== userId).length;
      },

      getMessages: (householdId) => get().messagesByHousehold[householdId] ?? [],

      clearHousehold: (householdId) => {
        set((s) => {
          const { [householdId]: _removed, ...rest } = s.messagesByHousehold;
          return {
            messagesByHousehold: rest,
            starredMessages: s.starredMessages.filter(
              (id) => !(_removed ?? []).some((m) => m.id === id)
            ),
          };
        });
      },

      clear: () => set({ messagesByHousehold: {}, pendingQueue: [], typingByHousehold: {}, starredMessages: [] }),
    }),
    {
      name: 'sivena-chat',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messagesByHousehold: Object.fromEntries(
          Object.entries(state.messagesByHousehold).map(([hid, msgs]) => [
            hid,
            // Keep last 80 messages per household, strip pending/failed
            msgs.filter((m) => !m._pending && !m._failed).slice(-80),
          ])
        ),
        starredMessages: state.starredMessages,
      }),
    },
  ),
);

function mapMessage(m: any): ChatMessage {
  return {
    id: m.id ?? m._id,
    householdId: m.householdId,
    // Try every common server-side field name for the sender identifier
    senderId: m.senderId ?? m.userId ?? m.sender?.id ?? m.sender?.userId ?? m.authorId ?? m.author?.id,
    // Try every common server-side field name for the sender display name
    senderName: m.senderName ?? m.sender?.name ?? m.sender?.displayName ?? m.authorName ?? m.author?.name ?? 'Unknown',
    senderAvatar: m.senderAvatar ?? m.sender?.avatarUrl ?? m.sender?.avatar ?? m.author?.avatarUrl,
    type: (m.type as MessageType) ?? 'text',
    content: m.content ?? m.text ?? '',
    poll: m.poll ?? undefined,
    activityCard: m.activityCard ?? m.metadata?.activityCard ?? undefined,
    dateIdea: m.dateIdea ?? m.metadata?.dateIdea ?? undefined,
    location: m.location ?? m.metadata?.location ?? undefined,
    replyTo: m.replyTo ?? undefined,
    createdAt: m.createdAt ?? m.timestamp ?? new Date().toISOString(),
    readBy: m.readBy ?? [],
  };
}
