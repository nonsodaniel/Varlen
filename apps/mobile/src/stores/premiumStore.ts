import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCustomerInfo,
  isPremiumFromInfo,
  getActiveEntitlement,
  getExpirationDate,
  setCustomerInfoListener,
} from '../services/revenueCat';

export type PremiumPlan = 'free' | 'pro' | 'family';

interface PremiumState {
  isPremium: boolean;
  plan: PremiumPlan;
  expiresAt: string | null;
  isLoading: boolean;
  syncWithRevenueCat: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  setPremiumStatus: (isPremium: boolean, plan: PremiumPlan, expiresAt?: string | null) => void;
  reset: () => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      isPremium: false,
      plan: 'free',
      expiresAt: null,
      isLoading: false,

      syncWithRevenueCat: async () => {
        set({ isLoading: true });
        try {
          const info = await getCustomerInfo();
          if (info) {
            const premium = isPremiumFromInfo(info);
            const entitlement = getActiveEntitlement(info);
            const expires = getExpirationDate(info);
            set({
              isPremium: premium,
              plan: entitlement,
              expiresAt: expires,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      // Must be called once after initRevenueCat to handle Android pending purchases
      // (payments confirmed asynchronously, e.g. bank transfer / cash)
      startListening: () => {
        setCustomerInfoListener((info) => {
          const premium = isPremiumFromInfo(info);
          const entitlement = getActiveEntitlement(info);
          const expires = getExpirationDate(info);
          set({ isPremium: premium, plan: entitlement, expiresAt: expires });
        });
      },

      stopListening: () => {
        setCustomerInfoListener(null);
      },

      setPremiumStatus: (isPremium, plan, expiresAt = null) =>
        set({ isPremium, plan, expiresAt }),

      reset: () =>
        set({
          isPremium: false,
          plan: 'free',
          expiresAt: null,
          isLoading: false,
        }),
    }),
    {
      name: 'sivena-premium',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
