import { API_URL } from '@/lib/env';
import type {
  AuthUser,
  CompleteRequest,
  CompleteResponse,
  CreateGroupResponse,
  CreateHangoutRequest,
  DecideResponse,
  Group,
  GroupDetail,
  GroupFairness,
  HangoutDetail,
  HangoutSummary,
  HealthResponse,
  JoinGroupResponse,
  MidpointParticipantInput,
  MidpointPreview,
  Participant,
  RotateInviteResponse,
  SearchLocationsRequest,
  SearchLocationsResponse,
  SuggestRequest,
  StoredSuggestion,
  StoredSuggestionPage,
  SuggestResponse,
  UpdateHangoutRequest,
  UpsertParticipantRequest,
  VoteResponse,
  VoteValue,
} from '@/lib/api/types';

/**
 * The API's error envelope, produced by its AllExceptionsFilter:
 * `{ statusCode, message, error?, details?, path, timestamp }`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly kind?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, kind?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.details = details;
  }

  /** Missing or rejected Supabase access token. */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** Provider quota tripped — the API throws 429 rather than retrying. */
  get isRateLimited() {
    return this.status === 429;
  }
}

/**
 * Every `/v1` route requires `Authorization: Bearer <supabase-access-token>`.
 * Auth lives in the client (Supabase anonymous sign-in), so whatever owns the
 * session registers a getter here instead of this module reaching for it.
 */
type TokenProvider = () => string | null | Promise<string | null>;

let tokenProvider: TokenProvider = () => null;

export function setAccessTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

/** `GET /health` sits outside the `/v1` prefix, deliberately. */
const UNVERSIONED = new Set(['/health']);

async function request<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const url = `${API_URL}${UNVERSIONED.has(path) ? path : `/v1${path}`}`;
  const token = await tokenProvider();

  const response = await fetch(url, {
    method: init.method ?? 'GET',
    signal: init.signal,
    headers: {
      Accept: 'application/json',
      ...(init.body === undefined ? null : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const raw = await response.text();
  const payload: unknown = raw ? safeParse(raw) : null;

  if (!response.ok) {
    const envelope = (payload ?? {}) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      typeof envelope.message === 'string' ? envelope.message : `HTTP ${response.status}`,
      typeof envelope.error === 'string' ? envelope.error : undefined,
      envelope.details,
    );
  }

  return payload as T;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

export const api = {
  /** Liveness check. The only route that needs no token. */
  health: (signal?: AbortSignal) => request<HealthResponse>('/health', { signal }),

  me: (signal?: AbortSignal) => request<{ user: AuthUser }>('/auth/me', { signal }),

  /** Permanently removes the current Supabase user and all associated Mido data. 204. */
  deleteAccount: (signal?: AbortSignal) => request<null>('/auth/me', { method: 'DELETE', signal }),

  // ── Groups ────────────────────────────────────────────────────────────────

  /** The raw invite code comes back only here — the DB keeps just its hash. */
  createGroup: (name: string, inviteTtlHours?: number, signal?: AbortSignal) =>
    request<CreateGroupResponse>('/groups', {
      method: 'POST',
      body: { name, ...(inviteTtlHours === undefined ? null : { inviteTtlHours }) },
      signal,
    }),

  listGroups: (signal?: AbortSignal) => request<Group[]>('/groups', { signal }),

  getGroup: (groupId: string, signal?: AbortSignal) =>
    request<GroupDetail>(`/groups/${groupId}`, { signal }),

  /** Owner/admin only. Renaming is the only editable field. */
  updateGroup: (groupId: string, name: string, signal?: AbortSignal) =>
    request<GroupDetail>(`/groups/${groupId}`, { method: 'PATCH', body: { name }, signal }),

  /** Owner only. Cascades to the group's hangouts, votes and ledger. 204. */
  deleteGroup: (groupId: string, signal?: AbortSignal) =>
    request<null>(`/groups/${groupId}`, { method: 'DELETE', signal }),

  /** Idempotent — joining a group you're already in succeeds. */
  joinGroup: (inviteCode: string, signal?: AbortSignal) =>
    request<JoinGroupResponse>('/groups/join', {
      method: 'POST',
      body: { inviteCode },
      signal,
    }),

  /** Owner/admin only. Invalidates the previous code. */
  rotateInvite: (groupId: string, inviteTtlHours?: number, signal?: AbortSignal) =>
    request<RotateInviteResponse>(`/groups/${groupId}/invite`, {
      method: 'POST',
      body: inviteTtlHours === undefined ? {} : { inviteTtlHours },
      signal,
    }),

  // ── Hangouts ──────────────────────────────────────────────────────────────

  createHangout: (groupId: string, body: CreateHangoutRequest, signal?: AbortSignal) =>
    request<HangoutDetail>(`/groups/${groupId}/hangouts`, { method: 'POST', body, signal }),

  listGroupHangouts: (groupId: string, signal?: AbortSignal) =>
    request<HangoutSummary[]>(`/groups/${groupId}/hangouts`, { signal }),

  getHangout: (hangoutId: string, signal?: AbortSignal) =>
    request<HangoutDetail>(`/hangouts/${hangoutId}`, { signal }),

  /**
   * Creator or group owner/admin, and only while the kèo is `draft`/`voting` —
   * the API answers 409 once it has been decided.
   */
  updateHangout: (hangoutId: string, body: UpdateHangoutRequest, signal?: AbortSignal) =>
    request<HangoutDetail>(`/hangouts/${hangoutId}`, { method: 'PATCH', body, signal }),

  /** Creator or owner/admin; refused once the kèo is `decided`/`done`. 204. */
  deleteHangout: (hangoutId: string, signal?: AbortSignal) =>
    request<null>(`/hangouts/${hangoutId}`, { method: 'DELETE', signal }),

  /** Upserts the caller's own starting point and travel mode. */
  setOwnParticipant: (hangoutId: string, body: UpsertParticipantRequest, signal?: AbortSignal) =>
    request<Participant>(`/hangouts/${hangoutId}/participants/me`, {
      method: 'PUT',
      body,
      signal,
    }),

  /** Pure geometric median — no Places/Routes billing. Handy for a live map preview. */
  midpointPreview: (participants: MidpointParticipantInput[], signal?: AbortSignal) =>
    request<MidpointPreview>('/midpoint/preview', {
      method: 'POST',
      body: { participants },
      signal,
    }),

  /** Search names/addresses near the optional location bias. */
  searchLocations: (query: SearchLocationsRequest, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    params.set('q', query.q);
    if (query.lat !== undefined) params.set('lat', String(query.lat));
    if (query.lng !== undefined) params.set('lng', String(query.lng));
    if (query.radiusMeters !== undefined) {
      params.set('radiusMeters', String(query.radiusMeters));
    }
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    return request<SearchLocationsResponse>(`/places/search?${params.toString()}`, { signal });
  },

  /**
   * One page of the stored result of a previous `/suggest`, straight from the
   * API's database. No Places/Routes call, so paging through the pool is what
   * "tìm lại lựa chọn khác" should do. `total: 0` means the kèo has never been
   * suggested — only then is the billed `suggest` right.
   */
  storedSuggestions: (
    hangoutId: string,
    page: { offset?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams();
    if (page.offset !== undefined) params.set('offset', String(page.offset));
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    const query = params.toString();
    return request<StoredSuggestionPage>(
      `/hangouts/${hangoutId}/suggestions${query ? `?${query}` : ''}`,
      { signal },
    );
  },

  /**
   * Runs the full pipeline (Places + Route Matrix), so it costs money and is
   * NOT safe to auto-retry — the API has no durable idempotency yet.
   */
  suggest: (hangoutId: string, body: SuggestRequest = {}, signal?: AbortSignal) =>
    request<SuggestResponse>(`/hangouts/${hangoutId}/suggest`, {
      method: 'POST',
      body,
      signal,
    }),

  /** One stored option — the detail screen doesn't have to guess a page. */
  storedSuggestion: (hangoutId: string, suggestionId: string, signal?: AbortSignal) =>
    request<StoredSuggestion>(`/hangouts/${hangoutId}/suggestions/${suggestionId}`, { signal }),

  /** Upsert of the caller's vote; returns the fresh tally. */
  castVote: (suggestionId: string, value: VoteValue, signal?: AbortSignal) =>
    request<VoteResponse>(`/suggestions/${suggestionId}/votes`, {
      method: 'POST',
      body: { value },
      signal,
    }),

  /** Owner/admin only. */
  decide: (hangoutId: string, suggestionId: string, signal?: AbortSignal) =>
    request<DecideResponse>(`/hangouts/${hangoutId}/decide`, {
      method: 'POST',
      body: { suggestionId },
      signal,
    }),

  /** Owner/admin only; must cover every participant. Idempotent for equal input. */
  complete: (hangoutId: string, body: CompleteRequest, signal?: AbortSignal) =>
    request<CompleteResponse>(`/hangouts/${hangoutId}/complete`, {
      method: 'POST',
      body,
      signal,
    }),

  groupFairness: (groupId: string, signal?: AbortSignal) =>
    request<GroupFairness>(`/groups/${groupId}/fairness`, { signal }),
};
