import type { Href } from 'expo-router';

import type { FairnessTone } from '@/lib/ui-config';
import type { HangoutStatus, StoredSuggestion, Suggestion, TravelTime } from '@/lib/api/types';

/** The place fields both a live `/suggest` option and a stored one carry. */
type PlaceLike = Pick<
  Suggestion & StoredSuggestion,
  'rating' | 'userRatingCount' | 'priceLevel' | 'typeLabels'
>;

/** 720 → "12 phút". The design never shows seconds. */
export function formatMinutes(durationSec: number) {
  return `${Math.round(durationSec / 60)} phút`;
}

export function minutesOf(durationSec: number) {
  return Math.round(durationSec / 60);
}

/** Google price level 0–4 → the design's "$"/"$$" notation. */
export function formatPriceLevel(priceLevel?: number) {
  if (priceLevel === undefined) return undefined;
  if (priceLevel <= 0) return 'Miễn phí';
  return '$'.repeat(Math.min(priceLevel, 4));
}

/**
 * "4.6 ★ · $$ · Cà phê, bánh ngọt" — the meta line under a place name. Parts
 * the API didn't return are dropped rather than rendered empty.
 */
export function placeMeta(suggestion: PlaceLike, options: { withReviewCount?: boolean } = {}) {
  const parts: string[] = [];

  if (suggestion.rating !== undefined) {
    const count =
      options.withReviewCount && suggestion.userRatingCount !== undefined
        ? ` (${suggestion.userRatingCount} đánh giá)`
        : '';
    parts.push(`${suggestion.rating.toFixed(1)} ★${count}`);
  }

  const price = formatPriceLevel(suggestion.priceLevel);
  if (price) parts.push(price);

  // The API translates and dedupes the Google place types; `types` itself is
  // still raw snake_case keys, so never render those.
  const labels = suggestion.typeLabels ?? [];
  if (labels.length > 0) parts.push(labels.slice(0, 2).join(', '));

  return parts.join(' · ');
}

/**
 * "Ai cũng đến trong khoảng 12–18 phút" when the spread is tight, otherwise
 * the design's softer "Đến trong khoảng 10–25 phút".
 */
export function travelSummary(travelTimes: TravelTime[], tightSpreadMinutes = 8) {
  if (travelTimes.length === 0) return '';
  const minutes = travelTimes.map((travel) => minutesOf(travel.durationSec));
  const low = Math.min(...minutes);
  const high = Math.max(...minutes);
  const lead = high - low <= tightSpreadMinutes ? 'Ai cũng đến' : 'Đến';
  return `${lead} trong khoảng ${low}–${high} phút`;
}

/** "Chênh lệch xa nhất: 8 phút" on the place detail screen. */
export function spreadMinutes(travelTimes: TravelTime[]) {
  if (travelTimes.length === 0) return 0;
  const minutes = travelTimes.map((travel) => minutesOf(travel.durationSec));
  return Math.max(...minutes) - Math.min(...minutes);
}

/**
 * Fairness debt as the ledger pill. Positive debt means this person travelled
 * longer than average, so they get pulled closer next time — the design shows
 * that in amber, and a credit in green.
 */
export function fairnessBalance(debtSeconds: number): { label: string; tone: FairnessTone } {
  const minutes = Math.round(debtSeconds / 60);
  if (minutes === 0) return { label: 'Cân bằng', tone: 'neutral' };
  if (minutes > 0) return { label: `+${minutes} phút`, tone: 'amber' };
  // U+2212 minus sign, matching the design rather than a hyphen.
  return { label: `−${Math.abs(minutes)} phút`, tone: 'success' };
}

/** "3 kèo gần đây" under each ledger row. */
export function outingsLabel(outingsCompleted: number) {
  return `${outingsCompleted} kèo gần đây`;
}

/** Stable avatar hue per member, so colours don't shuffle between renders. */
export function hueIndexFor(id: string, paletteSize = 5) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100_000;
  }
  return hash % paletteSize;
}

export function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

const WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/** "Thứ Bảy, 23/08" — formatted by hand so it doesn't rely on Intl on Hermes. */
export function formatDayDate(iso: string) {
  const date = new Date(iso);
  return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "19:00" in the device's local zone. */
export function formatTime(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "23/08" for the recent-outings list. */
export function formatShortDate(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "Thứ Bảy" alone, for the suggestions subtitle. */
export function formatWeekday(iso: string) {
  return WEEKDAYS[new Date(iso).getDay()];
}

const ACTIVITY_LABELS: Record<string, string> = {
  food: 'Ăn uống',
  restaurant: 'Ăn uống',
  an: 'Ăn uống',
  cafe: 'Cà phê',
  ca_phe: 'Cà phê',
  drinks: 'Nhậu',
  nhau: 'Nhậu',
  movie: 'Xem phim',
  phim: 'Xem phim',
  karaoke: 'Karaoke',
  bowling: 'Bowling',
};

export function activityLabel(activityType: string) {
  return ACTIVITY_LABELS[activityType] ?? activityType;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'đang lên kèo',
  voting: 'đang bình chọn',
  decided: 'đã chốt',
  done: 'đã xong',
  cancelled: 'đã huỷ',
};

export function hangoutStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Where tapping a kèo should land. Once it is decided the only screen that
 * shows the chosen place is `confirmed`, and it is reachable nowhere else —
 * sending those rows to the locations form left it stranded after one back tap.
 *
 * Everything before that still goes to locations: a member who hasn't shared a
 * starting point yet needs that screen no matter how far the kèo has got.
 */
export function hangoutRoute(hangoutId: string, status: HangoutStatus): Href {
  if (status === 'decided' || status === 'done') return `/hangout/${hangoutId}/confirmed`;
  return `/hangout/${hangoutId}/locations`;
}
