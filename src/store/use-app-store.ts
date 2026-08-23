import { create } from 'zustand';

type AppState = {
  isOnboarded: boolean;
  setOnboarded: (value: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isOnboarded: false,
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
}));
