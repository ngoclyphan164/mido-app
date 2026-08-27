import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/lib/api/client';
import type {
  CompleteRequest,
  Coordinate,
  CreateHangoutRequest,
  HangoutDetail,
  StoredSuggestion,
  StoredSuggestionPage,
  SuggestRequest,
  UpdateHangoutRequest,
  UpsertParticipantRequest,
  VoteValue,
} from '@/lib/api/types';
import { getSupabase } from '@/lib/supabase';

/** How many options the design shows at once. */
export const SUGGESTION_PAGE_SIZE = 5;

/**
 * The whole pool `/suggest` is asked for. The pipeline already computes and
 * pays for routes on all of them, so taking fewer wastes what was bought — and
 * a bigger pool is what makes "tìm lại lựa chọn khác" show anything new.
 */
export const SUGGESTION_POOL_SIZE = 20;

export const queryKeys = {
  health: ['health'] as const,
  me: ['auth', 'me'] as const,
  groups: ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
  groupFairness: (groupId: string) => ['groups', groupId, 'fairness'] as const,
  groupHangouts: (groupId: string) => ['groups', groupId, 'hangouts'] as const,
  hangout: (hangoutId: string) => ['hangouts', hangoutId] as const,
  storedSuggestions: (hangoutId: string) => ['hangouts', hangoutId, 'suggestions'] as const,
  storedSuggestion: (hangoutId: string, suggestionId: string) =>
    ['hangouts', hangoutId, 'suggestions', suggestionId] as const,
  locationSearch: (query: string, center?: Coordinate) =>
    ['places', 'search', query, center?.lat, center?.lng] as const,
};

// ── Reads ────────────────────────────────────────────────────────────────────

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: ({ signal }) => api.health(signal) });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.me(signal),
    enabled,
  });
}

export function useGroups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: ({ signal }) => api.listGroups(signal),
    enabled,
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(groupId ?? 'none'),
    queryFn: ({ signal }) => api.getGroup(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

export function useGroupFairness(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupFairness(groupId ?? 'none'),
    queryFn: ({ signal }) => api.groupFairness(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

export function useGroupHangouts(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupHangouts(groupId ?? 'none'),
    queryFn: ({ signal }) => api.listGroupHangouts(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

export function useHangout(hangoutId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hangout(hangoutId ?? 'none'),
    queryFn: ({ signal }) => api.getHangout(hangoutId!, signal),
    enabled: Boolean(hangoutId),
  });
}

/**
 * Keep a mounted hangout detail in sync with participant inserts/updates.
 *
 * Realtime only acts as an invalidation signal: the Nest API remains the
 * canonical reader and applies the same membership/response-shaping rules as
 * the initial request. Refetching once the channel is subscribed also closes
 * the small gap between the first HTTP response and the websocket becoming
 * ready.
 */
export function useParticipantsRealtime(hangoutId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !hangoutId) return;

    const channel = supabase
      .channel(`hangout:${hangoutId}:participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `hangout_id=eq.${hangoutId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.hangout(hangoutId) });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.hangout(hangoutId) });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hangoutId, queryClient]);
}

export function useSearchLocations(query: string, center?: Coordinate) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.locationSearch(normalizedQuery, center),
    queryFn: ({ signal }) =>
      api.searchLocations(
        {
          q: normalizedQuery,
          ...(center ? { lat: center.lat, lng: center.lng, radiusMeters: 50_000 } : undefined),
          limit: 5,
        },
        signal,
      ),
    enabled: normalizedQuery.length >= 2,
    // This endpoint is rate-limited and calls the Places provider. A failed
    // search should only be retried when the user edits/submits it again.
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// ── Writes ───────────────────────────────────────────────────────────────────

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, inviteTtlHours }: { name: string; inviteTtlHours?: number }) =>
      api.createGroup(name, inviteTtlHours),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.joinGroup(inviteCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useUpdateGroup(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.updateGroup(groupId!, name),
    onSuccess: (group) => {
      if (groupId) queryClient.setQueryData(queryKeys.group(groupId), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

/**
 * Deleting a group takes its hangouts, votes and ledger with it, so the cached
 * entries are dropped outright rather than refetched into a 404.
 */
export function useDeleteGroup(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteGroup(groupId!),
    onSuccess: () => {
      if (groupId) {
        queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
        queryClient.removeQueries({ queryKey: queryKeys.groupHangouts(groupId) });
        queryClient.removeQueries({ queryKey: queryKeys.groupFairness(groupId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useRotateInvite(groupId: string | undefined) {
  return useMutation({
    mutationFn: (inviteTtlHours?: number) => api.rotateInvite(groupId!, inviteTtlHours),
  });
}

export function useCreateHangout(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHangoutRequest) => api.createHangout(groupId!, body),
    onSuccess: () => {
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupHangouts(groupId) });
      }
    },
  });
}

/** `groupId` is only needed to refresh the group's kèo list after the edit. */
export function useUpdateHangout(hangoutId: string | undefined, groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateHangoutRequest) => api.updateHangout(hangoutId!, body),
    onSuccess: (hangout) => {
      if (hangoutId) queryClient.setQueryData(queryKeys.hangout(hangoutId), hangout);
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupHangouts(groupId) });
      }
    },
  });
}

export function useDeleteHangout(hangoutId: string | undefined, groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteHangout(hangoutId!),
    onSuccess: () => {
      if (hangoutId) queryClient.removeQueries({ queryKey: queryKeys.hangout(hangoutId) });
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupHangouts(groupId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupFairness(groupId) });
      }
    },
  });
}

export function useSetOwnParticipant(hangoutId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertParticipantRequest) => api.setOwnParticipant(hangoutId!, body),
    onSuccess: (participant) => {
      if (hangoutId) {
        queryClient.setQueryData<HangoutDetail>(queryKeys.hangout(hangoutId), (current) => {
          if (!current) return current;
          const alreadyJoined = current.participants.some((item) => item.id === participant.id);

          return {
            ...current,
            participants: alreadyJoined
              ? current.participants.map((item) =>
                  item.id === participant.id ? participant : item,
                )
              : [...current.participants, participant],
            pendingMembers: current.pendingMembers.filter(
              (member) => member.userId !== participant.userId,
            ),
          };
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.hangout(hangoutId) });
      }
    },
  });
}

/**
 * A mutation rather than a query on purpose: `POST /suggest` runs the Places +
 * Route Matrix pipeline, which is billed per call and has no durable
 * idempotency on the API yet. That also rules out retries — the API's README is
 * explicit that clients must not auto-retry it.
 */
/**
 * The whole stored pool for a kèo, in one free read. The screen holds it and
 * shows five at a time: `/suggest` is deterministic, so re-running it returns
 * the very same places and only spends money — rotating through what was
 * already paid for is what "tìm lại lựa chọn khác" means.
 */
export function useStoredSuggestions(hangoutId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storedSuggestions(hangoutId!),
    queryFn: ({ signal }) =>
      api.storedSuggestions(hangoutId!, { offset: 0, limit: SUGGESTION_POOL_SIZE }, signal),
    enabled: Boolean(hangoutId),
  });
}

/** One stored option, for the detail screen. */
export function useStoredSuggestion(hangoutId: string | undefined, suggestionId?: string) {
  return useQuery({
    queryKey: queryKeys.storedSuggestion(hangoutId!, suggestionId!),
    queryFn: ({ signal }) => api.storedSuggestion(hangoutId!, suggestionId!, signal),
    enabled: Boolean(hangoutId) && Boolean(suggestionId),
  });
}

/**
 * Keep one suggestion's tally in sync while its detail screen is mounted.
 *
 * The Realtime row is deliberately only an invalidation signal. The Nest API
 * remains the canonical tally reader, and refetching after SUBSCRIBED closes
 * the gap between the initial HTTP response and the websocket becoming ready.
 */
export function useSuggestionVotesRealtime(
  hangoutId: string | undefined,
  suggestionId: string | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !hangoutId || !suggestionId) return;

    const refreshTally = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storedSuggestion(hangoutId, suggestionId),
        exact: true,
      });
      // Mark the pool stale without refetching the previous stack screen; its
      // cards do not render tallies, and the detail request above is enough.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storedSuggestions(hangoutId),
        exact: true,
        refetchType: 'none',
      });
    };

    const channel = supabase
      .channel(`suggestion:${suggestionId}:votes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `suggestion_id=eq.${suggestionId}`,
        },
        refreshTally,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refreshTally();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hangoutId, queryClient, suggestionId]);
}

export function useSuggest(hangoutId: string | undefined) {
  return useMutation({
    retry: false,
    mutationFn: (body: SuggestRequest = {}) => api.suggest(hangoutId!, body),
  });
}

export function useCastVote(hangoutId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, value }: { suggestionId: string; value: VoteValue }) =>
      api.castVote(suggestionId, value),
    onSuccess: (result, { suggestionId }) => {
      if (!hangoutId) return;

      queryClient.setQueryData<StoredSuggestion>(
        queryKeys.storedSuggestion(hangoutId, suggestionId),
        (current) => (current ? { ...current, tally: result.tally } : current),
      );
      queryClient.setQueryData<StoredSuggestionPage>(
        queryKeys.storedSuggestions(hangoutId),
        (current) =>
          current
            ? {
                ...current,
                suggestions: current.suggestions.map((suggestion) =>
                  suggestion.suggestionId === suggestionId
                    ? { ...suggestion, tally: result.tally }
                    : suggestion,
                ),
              }
            : current,
      );
    },
  });
}

export function useDecideHangout(hangoutId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => api.decide(hangoutId!, suggestionId),
    onSuccess: () => {
      if (hangoutId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.hangout(hangoutId) });
      }
    },
  });
}

/** Completing a hangout rewrites the ledger, so group fairness goes stale. */
export function useCompleteHangout(hangoutId: string | undefined, groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompleteRequest) => api.complete(hangoutId!, body),
    onSuccess: () => {
      if (hangoutId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.hangout(hangoutId) });
      }
      if (groupId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupFairness(groupId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.groupHangouts(groupId) });
      }
    },
  });
}

/**
 * Hangout lists for several groups at once. The API has no cross-group feed, so
 * Home fans out over the caller's groups; a dedicated `/v1/me/home` endpoint
 * would collapse this into one request if group counts ever grow.
 */
export function useHangoutsForGroups(groupIds: string[]) {
  return useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: queryKeys.groupHangouts(groupId),
      queryFn: ({ signal }: { signal?: AbortSignal }) => api.listGroupHangouts(groupId, signal),
    })),
  });
}

/** Details for a bounded set of hangouts, to work out what needs the user. */
export function useHangoutDetails(hangoutIds: string[]) {
  return useQueries({
    queries: hangoutIds.map((hangoutId) => ({
      queryKey: queryKeys.hangout(hangoutId),
      queryFn: ({ signal }: { signal?: AbortSignal }) => api.getHangout(hangoutId, signal),
    })),
  });
}
