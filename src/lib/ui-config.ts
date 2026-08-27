/**
 * Local UI configuration. Groups, hangouts, participants, places and the
 * fairness ledger all come from mido-api; what lives here is the picker content
 * and the budget bounds the design specifies, which the API has no opinion
 * about.
 */

export type FairnessTone = 'neutral' | 'success' | 'amber';

/**
 * `activityType` sent to the API must be a canonical key: it folds diacritics
 * but not multi-word labels, so "Ăn uống" would normalise to `an_uong` and be
 * rejected. The label is ours, the key is the contract.
 */
export const CATEGORIES = [
  { key: 'food', label: 'Ăn uống', tile: '#E8A08C' },
  { key: 'cafe', label: 'Cà phê', tile: '#E8C8A4' },
  { key: 'drinks', label: 'Nhậu', tile: '#D3C6F0' },
  { key: 'movie', label: 'Xem phim', tile: '#B1D2F4' },
] as const;

/** Maps onto the API's `timeCapSeconds`, which it constrains to 300..14400. */
export const TRAVEL_LIMITS = [
  { label: '15 phút', seconds: 900 },
  { label: '30 phút', seconds: 1_800 },
  { label: '45 phút', seconds: 2_700 },
  { label: '1 giờ', seconds: 3_600 },
] as const;

/**
 * The API's `fairness_mode`. Only reachable from the edit screen — creating a
 * kèo always starts on the API's `balanced` default.
 */
export const FAIRNESS_MODES = [
  { value: 'balanced', label: 'Cân bằng' },
  { value: 'fairest', label: 'Công bằng' },
  { value: 'fastest', label: 'Nhanh nhất' },
  { value: 'weighted', label: 'Trọng số' },
] as const;

/** Order matches the API's `travel_mode` enum. */
export const TRAVEL_MODES = [
  { value: 'two_wheeler', label: 'Xe máy' },
  { value: 'drive', label: 'Ô tô' },
  { value: 'walk', label: 'Đi bộ' },
  { value: 'transit', label: 'Xe buýt' },
] as const;

/** Budget slider bounds in VND. 55% of this range is the design's 150.000đ. */
export const BUDGET = {
  min: 40_000,
  max: 240_000,
  step: 10_000,
  default: 150_000,
};

/** 150000 → "150.000đ". Grouped by hand so it doesn't depend on Intl on Hermes. */
export function formatDong(amount: number) {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
