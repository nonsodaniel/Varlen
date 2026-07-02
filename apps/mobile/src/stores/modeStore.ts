import { create } from 'zustand';
import type { LifeMode } from '../types';

interface ModeState {
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
}

export const useModeStore = create<ModeState>((set) => ({
  mode: 'couple',
  setMode: (mode) => set({ mode }),
}));
