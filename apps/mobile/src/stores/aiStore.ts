import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../services/api';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  subtitle: string;
  type: 'reminder' | 'tip' | 'achievement' | 'insight';
  priority: number;
  category: string;
  prompt?: string;
}

export interface PlanSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedCost: string;
  duration: string;
  tags: string[];
  steps: string[];
  prompt: string;
}

export interface AiUsage {
  requestCount: number;
  tokensUsed: number;
  dailyLimit: number;
  remaining: number;
}

interface AiState {
  conversations: AiConversation[];
  activeConversationId: string | null;
  messages: AiMessage[];
  isTyping: boolean;
  suggestions: AiSuggestion[];
  suggestionsLoading: boolean;
  suggestionsLastFetched: number;
  dismissedSuggestionIds: string[];
  usage: AiUsage | null;

  planSuggestions: PlanSuggestion[];
  planLoading: boolean;

  sendMessage: (message: string, conversationId?: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  fetchSuggestions: () => Promise<void>;
  dismissSuggestion: (id: string) => void;
  fetchUsage: () => Promise<void>;
  clearChat: () => void;
  requestPlan: (type: string, preferences: { vibes?: string[]; budget?: string; freeText?: string }) => Promise<void>;
  clearPlanSuggestions: () => void;
}

let _convLastFetched = 0;

function getErrorMessage(err: any): string {
  const status = err?.statusCode || err?.status;
  const message = err?.message || '';

  if (status === 429) {
    if (message.includes('daily')) {
      return "You've reached your daily message limit. Try again tomorrow!";
    }
    return 'Sivena is a bit busy right now. Please try again in a moment.';
  }

  if (status === 503) {
    if (message.includes('not configured') || message.includes('API key')) {
      return 'AI service is being set up. Please try again later.';
    }
    return 'Sivena is temporarily unavailable. Please try again.';
  }

  if (message.includes('Network request failed')) {
    return "Couldn't connect to the server. Check your internet connection.";
  }

  return message || 'Something went wrong. Please try again.';
}

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isTyping: false,
      suggestions: [],
      suggestionsLoading: false,
      suggestionsLastFetched: 0,
      dismissedSuggestionIds: [],
      usage: null,
      planSuggestions: [],
      planLoading: false,

      sendMessage: async (message, conversationId) => {
        const userMsg: AiMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          createdAt: new Date().toISOString(),
        };

        // Optimistic: show user message immediately
        set((s) => ({
          messages: [...s.messages, userMsg],
          isTyping: true,
        }));

        try {
          const convId = conversationId || get().activeConversationId;
          const res = await apiPost<{ conversationId: string; message: string }>(
            '/ai/chat',
            {
              message,
              ...(convId ? { conversationId: convId } : {}),
            },
          );

          const assistantMsg: AiMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: res.message,
            createdAt: new Date().toISOString(),
          };

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            activeConversationId: res.conversationId,
            isTyping: false,
          }));

          // Refresh usage and conversations after successful send
          get().fetchUsage();
          _convLastFetched = 0; // Reset cooldown to force refresh
          get().fetchConversations();
        } catch (err: any) {
          const errorMsg: AiMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: getErrorMessage(err),
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, errorMsg],
            isTyping: false,
          }));
        }
      },

      fetchConversations: async () => {
        if (Date.now() - _convLastFetched < 30000) return;
        try {
          const res = await apiGet<any>('/ai/conversations');
          const data = res?.data ?? res;
          const arr = Array.isArray(data) ? data : [];
          _convLastFetched = Date.now();
          set({ conversations: arr });
        } catch (err) {
          // Silently fail - use cached conversations
        }
      },

      loadConversation: async (id) => {
        try {
          const res = await apiGet<any>(`/ai/conversations/${id}`);
          const conv = res?.data ?? res;
          const messages = (conv?.messages ?? []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }));
          set({
            activeConversationId: id,
            messages,
          });
        } catch (err) {
          console.warn('[aiStore] loadConversation failed:', err);
        }
      },

      deleteConversation: async (id) => {
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          ...(s.activeConversationId === id
            ? { activeConversationId: null, messages: [] }
            : {}),
        }));
        try {
          await apiDelete(`/ai/conversations/${id}`);
        } catch (err) {
          // Silently fail - already removed from UI
        }
      },

      startNewConversation: () => {
        set({
          activeConversationId: null,
          messages: [],
        });
      },

      fetchSuggestions: async () => {
        const { suggestionsLastFetched } = get();
        if (Date.now() - suggestionsLastFetched < 300000) return; // 5 min cooldown
        set({ suggestionsLoading: true });
        try {
          const res = await apiGet<any>('/ai/suggestions');
          const data = Array.isArray(res) ? res : res?.data ?? [];
          set({
            suggestions: data,
            suggestionsLoading: false,
            suggestionsLastFetched: Date.now(),
          });
        } catch {
          set({ suggestionsLoading: false });
        }
      },

      dismissSuggestion: (id) => {
        set((s) => ({
          suggestions: s.suggestions.filter((sug) => sug.id !== id),
          dismissedSuggestionIds: [...s.dismissedSuggestionIds, id],
        }));
      },

      fetchUsage: async () => {
        try {
          const res = await apiGet<AiUsage>('/ai/usage');
          set({ usage: res });
        } catch {
          // Silently fail - usage banner just won't show
        }
      },

      clearChat: () => {
        set({ messages: [], activeConversationId: null });
      },

      requestPlan: async (type, preferences) => {
        set({ planLoading: true, planSuggestions: [] });
        try {
          const res = await apiPost<{ suggestions: PlanSuggestion[] }>('/ai/plan', {
            type,
            ...preferences,
          });
          const suggestions = (res as any)?.suggestions ?? [];
          set({ planSuggestions: suggestions, planLoading: false });
        } catch (err: any) {
          set({ planLoading: false });
          throw err;
        }
      },

      clearPlanSuggestions: () => {
        set({ planSuggestions: [], planLoading: false });
      },
    }),
    {
      name: 'sivena-ai',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        suggestions: state.suggestions,
        suggestionsLastFetched: state.suggestionsLastFetched,
        dismissedSuggestionIds: state.dismissedSuggestionIds,
      }),
    },
  ),
);
