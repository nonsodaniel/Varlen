import { create } from 'zustand';
import { Memory } from '../types';
import { mockMemories } from '../data/mock';

interface MemoryState {
  memories: Memory[];
  addMemory: (memory: Memory) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: mockMemories,
  addMemory: (memory) => set((state) => ({ memories: [memory, ...state.memories] })),
}));
