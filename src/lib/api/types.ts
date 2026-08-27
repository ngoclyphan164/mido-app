/**
 * Wire types for mido-api (../mido-api), mirrored from its controllers and
 * service return types. Kept structural rather than validated at runtime — the
 * API owns validation with Zod, and duplicating those schemas here would mean
 * two definitions to keep in step.
 *
 * Every route below sits behind the `/v1` prefix except `GET /health`.
 */

export type Coordinate = { lat: number; lng: number };

/** `travel_mode` enum in the API's Postgres schema. */
export type TravelMode = 'two_wheeler' | 'drive' | 'walk' | 'transit';

/** Labels the design uses for each mode, in the same order as TRAVEL_MODES. */
export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  two_wheeler: 'Xe máy',
  drive: 'Ô tô',
  walk: 'Đi bộ',
  transit: 'Xe buýt',
};

export const TRAVEL_MODE_ORDER: TravelMode[] = ['two_wheeler', 'drive', 'walk', 'transit'];

export type VoteValue = 'up' | 'down' | 'veto';

export type PlaceAvailability = 'open' | 'closed' | 'unknown';

// ── GET /health ──────────────────────────────────────────────────────────────

export type HealthResponse = {
  status: string;
  service: string;
  env: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
};

// ── GET /v1/auth/me ──────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  sessionId?: string;
  email?: string;
  phone?: string;
  isAnonymous: boolean;
  assuranceLevel?: 'aal1' | 'aal2';
};

// ── POST /v1/midpoint/preview ────────────────────────────────────────────────

/** `weight` is clamped to 0.6–1.4 by the API; 2–10 participants. */
export type MidpointParticipantInput = Coordinate & { weight?: number };

export type MidpointPreview = {
  seed: Coordinate;
  converged: boolean;
  iterations: number;
  searchRadiusMeters: number;
  maxDistanceToSeedMeters: number;
  spreadMeters: number;
  splitSuggestion?: {
    clusters: [number[], number[]];
    seeds: [Coordinate, Coordinate];
  };
};

// ── GET /v1/places/search ──────────────────────────────────────────────────

export type SearchLocationsRequest = {
  q: string;
  /** Optional location bias; lat/lng must be sent together. */
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  /** Defaults to 5 and is capped at 10 by the API. */
  limit?: number;
};

export type SearchLocationPlace = {
  provider: string;
  placeId: string;
  name: string;
  address?: string;
  location: Coordinate;
  primaryType?: string;
  types: string[];
  /** Vietnamese label for `primaryType`; absent when every type is generic. */
  primaryTypeLabel?: string;
  /** `types` translated, deduped, generic entries dropped, primary first. */
  typeLabels: string[];
};

export type SearchLocationsResponse = {
  places: SearchLocationPlace[];
  attribution: string;
};

// ── POST /v1/hangouts/:id/suggest ────────────────────────────────────────────

export type SuggestRequest = {
  /** 1–10, defaults to 5 server-side. */
  topN?: number;
  minimumRating?: number;
};

export type TravelTime = {
  participantId: string;
  name: string;
  durationSec: number;
  distanceMeters?: number;
  mode: TravelMode;
};

export type ScoreBreakdown = {
  fairness: number;
  efficiency: number;
  maxTime: number;
  quality: number;
  preference: number;
  context: number;
  meanTimeSeconds: number;
  maxTimeSeconds: number;
  withinTimeCap: boolean;
};

export type Suggestion = {
  /** Stable option UUID — this is what votes and decide take. */
  suggestionId: string;
  /** Provider place ID, not a mido identifier. */
  id: string;
  provider: string;
  name: string;
  location: Coordinate;
  primaryType?: string;
  types: string[];
  /** Vietnamese label for `primaryType`; absent when every type is generic. */
  primaryTypeLabel?: string;
  /** `types` translated, deduped, generic entries dropped, primary first. */
  typeLabels: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  /** Provider image URLs, ordered with the cover first; empty when unavailable. */
  images: string[];
  mapsUri?: string;
  /** @deprecated Use mapsUri; retained for older Google responses. */
  googleMapsUri?: string;
  availability: PlaceAvailability;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  travelTimes: TravelTime[];
};

export type FairnessMeta = {
  debtScaleSeconds: number;
  participants: {
    participantId: string;
    name: string;
    debtSeconds: number;
    priorityWeight: number;
    effectiveWeight: number;
  }[];
};

export type SuggestResponse = {
  status: 'ok' | 'no_candidates' | 'split_recommended';
  hangoutId: string;
  seed: Coordinate;
  searchRadiusMeters: number;
  suggestions: Suggestion[];
  /** Present when the group is spread over 25 km. */
  splitSuggestion?: {
    clusters: {
      seed: Coordinate;
      participants: { id: string; name: string }[];
    }[];
  };
  meta: {
    capRelaxed: boolean;
    placesReceived: number;
    placesAfterFilters: number;
    placesRouted: number;
    searchCell?: string;
    fairness: FairnessMeta;
  };
};

// ── POST /v1/suggestions/:id/votes ───────────────────────────────────────────

export type VoteResponse = {
  vote: {
    id: string;
    suggestionId: string;
    participantId: string;
    value: VoteValue;
    updatedAt: string;
  };
  tally: { up: number; down: number; veto: number; total: number };
};

// ── POST /v1/hangouts/:id/decide · /complete ─────────────────────────────────

export type Outing = {
  id: string;
  hangoutId: string;
  chosenSuggestionId: string | null;
  decidedBy: string | null;
  decidedAt: string;
  happenedAt: string | null;
};

export type DecideResponse = { outing: Outing };

export type CompleteRequest = {
  happenedAt?: string;
  /** Must cover every participant exactly once; 2–10 entries. */
  actualTravelTimes: { participantId: string; durationSec: number }[];
};

export type CompleteResponse = {
  outing: Outing;
  meanActualDurationSec: number;
  ledger: {
    participantId: string;
    userId: string;
    actualDurationSec: number;
    deltaSeconds: number;
    debtSeconds: number;
  }[];
};

// ── GET /v1/groups/:id/fairness ──────────────────────────────────────────────

export type GroupFairness = {
  groupId: string;
  members: {
    userId: string;
    displayName: string;
    /** Positive = travelled longer than average, so gets priority next time. */
    debtSeconds: number;
    outingsCompleted: number;
  }[];
};

// ── Groups ───────────────────────────────────────────────────────────────────

export type GroupRole = 'owner' | 'admin' | 'member';

export type GroupMember = {
  userId: string;
  displayName: string;
  role: GroupRole;
  joinedAt: string;
};

export type Group = {
  id: string;
  name: string;
  role: GroupRole;
  memberCount: number;
  inviteExpiresAt: string;
  createdBy: string;
  createdAt: string;
};

export type GroupDetail = Group & { members: GroupMember[] };

/** `POST /v1/groups` — the raw invite code is only ever returned here. */
export type CreateGroupResponse = { group: GroupDetail; inviteCode: string };

export type JoinGroupResponse = { group: GroupDetail; alreadyMember: boolean };

/** `POST /v1/groups/:id/invite` — the DB stores only a hash, so showing a link
 *  again after creation means minting a fresh code. */
export type RotateInviteResponse = { inviteCode: string; inviteExpiresAt: string };

// ── Hangouts ─────────────────────────────────────────────────────────────────

export type FairnessMode = 'balanced' | 'fairest' | 'fastest' | 'weighted';

export type HangoutStatus = 'draft' | 'voting' | 'decided' | 'done' | 'cancelled';

/**
 * Canonical activity keys the suggest pipeline accepts. The API folds diacritics
 * but not multi-word labels — "Ăn uống" normalises to `an_uong`, which is NOT
 * supported, so the client sends these keys and renders its own labels.
 */
export const ACTIVITY_TYPES = ['food', 'cafe', 'drinks', 'movie', 'karaoke', 'bowling'] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type CreateHangoutRequest = {
  activityType: ActivityType;
  /** ISO 8601 with offset, e.g. 2026-08-29T19:00:00+07:00. */
  plannedAt: string;
  fairnessMode?: FairnessMode;
  /** VND per person. */
  budgetMax?: number;
  timeCapSeconds?: number;
  /** UUID the client generates so a retried create is idempotent. */
  idempotencyKey: string;
};

/**
 * `PATCH /v1/hangouts/:id` — every field optional, but the API rejects an empty
 * body. `budgetMax: null` clears the budget; omitting it leaves it untouched.
 * Only a kèo in `draft` or `voting` can be patched.
 */
export type UpdateHangoutRequest = {
  activityType?: ActivityType;
  plannedAt?: string;
  fairnessMode?: FairnessMode;
  budgetMax?: number | null;
  timeCapSeconds?: number;
};

export type Participant = {
  id: string;
  userId: string;
  displayName: string;
  origin: Coordinate;
  /** Human-readable address resolved for `origin`. */
  originAddress?: string;
  travelMode: TravelMode;
  weight: number;
  isFlexible: boolean;
};

export type HangoutSummary = {
  id: string;
  groupId: string;
  activityType: string;
  plannedAt: string;
  fairnessMode: FairnessMode;
  budgetMax: number | null;
  timeCapSeconds: number;
  status: HangoutStatus;
  createdBy: string;
  createdAt: string;
  participantCount: number;
};

/**
 * A suggestion as the API stored it, from `GET /v1/hangouts/:id/suggestions`
 * and from `outing.place`. Same place fields as `Suggestion`, but this one
 * survives closing the app — and reading it costs nothing, unlike `/suggest`.
 *
 * `images` is resolved fresh on every read because Google's photo URLs expire.
 */
/** One page of `GET /v1/hangouts/:id/suggestions`. */
export type StoredSuggestionPage = {
  suggestions: StoredSuggestion[];
  /** Every active option, not just this page — the cue for when to wrap around. */
  total: number;
  offset: number;
};

export type StoredSuggestion = {
  suggestionId: string;
  /** Provider place ID, not a mido identifier. */
  id: string;
  provider: string;
  name: string;
  address?: string;
  location: Coordinate;
  primaryType?: string;
  types: string[];
  primaryTypeLabel?: string;
  typeLabels: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  mapsUri?: string;
  images: string[];
  availability: string;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  travelTimes: TravelTime[];
  /** Group vote counts at read time; absent when nobody has voted. */
  tally?: { up: number; down: number; veto: number; total: number };
  /** When the API read this content from the provider. */
  fetchedAt: string;
};

export type HangoutDetail = Omit<HangoutSummary, 'participantCount'> & {
  groupName: string;
  role: GroupRole;
  participants: Participant[];
  /** Group members who haven't shared a starting point yet. */
  pendingMembers: { userId: string; displayName: string }[];
  outing: {
    id: string;
    chosenSuggestionId: string | null;
    decidedBy: string | null;
    decidedAt: string;
    happenedAt: string | null;
    /** Absent when the API couldn't reach the provider to fill the snapshot. */
    place?: StoredSuggestion;
  } | null;
};

export type UpsertParticipantRequest = {
  lat: number;
  lng: number;
  originAddress?: string;
  travelMode?: TravelMode;
  displayName?: string;
  weight?: number;
  isFlexible?: boolean;
};
