import { useState } from 'react';
import { RefreshControl } from 'react-native';

/** Coral spinner on the canvas cream, matching the rest of the design. */
const SPINNER_COLOR = '#F0564F';
const SPINNER_BACKGROUND = '#FFF8F4';

type Refetchable = { refetch: () => Promise<unknown> };

/**
 * Pull-to-refresh wired to TanStack Query. Pass every query the screen shows;
 * the spinner stays up until all of them settle, so a pull never looks done
 * while half the screen is still stale.
 *
 * Spread the result into a scroller's `refreshControl` prop:
 *
 * ```tsx
 * <ScrollView refreshControl={useRefreshControl([groups, hangouts])}>
 * ```
 */
export function useRefreshControl(queries: Refetchable[]) {
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      // `refetch` never rejects for a query error — it resolves with the error
      // in the result — so this only settles early if a query is unmounted.
      await Promise.all(queries.map((query) => query.refetch()));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <RefreshControl
      colors={[SPINNER_COLOR]}
      onRefresh={refresh}
      progressBackgroundColor={SPINNER_BACKGROUND}
      refreshing={refreshing}
      tintColor={SPINNER_COLOR}
    />
  );
}
