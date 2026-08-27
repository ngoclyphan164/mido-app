import { create } from 'zustand';

import { BUDGET } from '@/lib/ui-config';

/**
 * Draft values for the "Kèo mới" form, before the hangout exists — plus the
 * traveller's own transport choice on the locations screen. Everything else
 * about a kèo comes from the API.
 *
 * Suggestions used to be cached here too, because the API didn't persist
 * provider content and losing the cache meant paying for `/suggest` again.
 * They now live in the API's `suggestion_places`, which every member's device
 * reads for free, so a second copy here would only add a way to drift.
 */
type HangoutState = {
  categoryIndex: number;
  budget: number;
  travelLimitIndex: number;
  /** The traveller's own transport choice on the locations screen. */
  travelModeIndex: number;

  setCategoryIndex: (index: number) => void;
  setBudget: (amount: number) => void;
  setTravelLimitIndex: (index: number) => void;
  setTravelModeIndex: (index: number) => void;
  resetDraft: () => void;
};

const draftDefaults = {
  // "Cà phê" — the activity the rest of the screens describe.
  categoryIndex: 1,
  budget: BUDGET.default,
  travelLimitIndex: 1,
  travelModeIndex: 0,
};

export const useHangoutStore = create<HangoutState>((set) => ({
  ...draftDefaults,

  setCategoryIndex: (categoryIndex) => set({ categoryIndex }),
  setBudget: (budget) => set({ budget }),
  setTravelLimitIndex: (travelLimitIndex) => set({ travelLimitIndex }),
  setTravelModeIndex: (travelModeIndex) => set({ travelModeIndex }),
  resetDraft: () => set(draftDefaults),
}));
