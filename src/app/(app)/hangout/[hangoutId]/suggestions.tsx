import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { OutlineButton, TextLink } from '@/components/ui/buttons';
import { PlaceCard } from '@/components/ui/place-card';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { activityLabel, formatTime, formatWeekday } from '@/lib/api/present';
import {
  SUGGESTION_PAGE_SIZE,
  SUGGESTION_POOL_SIZE,
  queryKeys,
  useHangout,
  useStoredSuggestions,
  useSuggest,
} from '@/lib/api/queries';

export default function Suggestions() {
  const router = useRouter();
  const { hangoutId } = useLocalSearchParams<{ hangoutId: string }>();

  const queryClient = useQueryClient();
  const hangout = useHangout(hangoutId);
  const stored = useStoredSuggestions(hangoutId);
  const suggest = useSuggest(hangoutId);

  const pool = stored.data?.suggestions ?? [];
  /**
   * `/suggest` là hàm thuần: cùng participant, `plannedAt`, `fairnessMode`,
   * `budgetMax` và `timeCapSeconds` thì luôn ra đúng danh sách cũ. Nên "tìm lại
   * lựa chọn khác" xoay vòng trong pool đã trả tiền rồi, không gọi lại API —
   * gọi lại chỉ tốn tiền mà hiện ra y hệt 5 quán vừa xem.
   */
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(pool.length / SUGGESTION_PAGE_SIZE));
  // Modulo chứ không phải state đồng bộ lại: pool co lại sau một lần suggest
  // mới thì trang đang xem tự quay về đầu, không kẹt ở trang rỗng.
  const currentPage = page % pageCount;
  const options = pool.slice(
    currentPage * SUGGESTION_PAGE_SIZE,
    (currentPage + 1) * SUGGESTION_PAGE_SIZE,
  );

  /**
   * Chỉ chạy pipeline khi API thật sự chưa có gì cho kèo này — nghĩa là phải
   * chờ đọc xong đã. Xin nguyên pool luôn: routes cho cả 20 candidate đã được
   * tính và trả tiền trong cùng một lần chạy, lấy 5 là vứt đi 15.
   */
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !hangoutId) return;
    if (!stored.isSuccess || (stored.data?.total ?? 0) > 0) return;
    fired.current = true;
    suggest.mutate({ topN: SUGGESTION_POOL_SIZE }, { onSuccess: () => void stored.refetch() });
  }, [hangoutId, stored, suggest]);

  // Chỉ có ở response `/suggest` vừa chạy, không phải thứ lưu trong DB: cả hai
  // đều nói về lần chạy pipeline đó chứ không về bản thân danh sách quán.
  const split =
    suggest.data?.status === 'split_recommended' ? suggest.data.splitSuggestion : undefined;
  const capRelaxed = suggest.data?.meta.capRelaxed ?? false;

  // Kéo để đọc lại — miễn phí, vì nó đọc DB chứ không chạy lại pipeline.
  const refreshControl = useRefreshControl([stored, hangout]);

  const subtitle = hangout.data
    ? `${activityLabel(hangout.data.activityType)} · ${formatWeekday(hangout.data.plannedAt)} ${formatTime(hangout.data.plannedAt)} · ${hangout.data.participants.length} người`
    : undefined;

  /** Trang kế tiếp trong pool, quay vòng khi hết. Không chạm tới mạng. */
  function showOtherOptions() {
    setPage((current) => (current + 1) % pageCount);
  }

  /**
   * Chạy lại pipeline thật. Chỉ đáng gọi khi input đã đổi — thêm/bớt người, đổi
   * giờ, ngân sách hay giới hạn di chuyển; cùng input thì kết quả không đổi.
   */
  function resuggest() {
    if (!hangoutId) return;
    suggest.mutate(
      { topN: SUGGESTION_POOL_SIZE },
      {
        onSuccess: () => {
          setPage(0);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.storedSuggestions(hangoutId),
          });
        },
      },
    );
  }

  return (
    <Screen>
      <ScreenHeader subtitle={subtitle} title="Gợi ý cho cả nhóm" titleSize={22} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-4"
        refreshControl={refreshControl}
      >
        {suggest.isPending ? (
          <LoadingState label="Đang tìm quán ở giữa cả nhóm…" />
        ) : suggest.isError ? (
          <ErrorState error={suggest.error} onRetry={resuggest} />
        ) : stored.isError ? (
          <ErrorState error={stored.error} onRetry={stored.refetch} />
        ) : split ? (
          <View className="gap-3 px-5 pt-6">
            <EmptyState
              hint="Nhóm đang ở quá xa nhau, Mido đề nghị tách thành hai điểm hẹn."
              title="Nên tách nhóm"
            />
            {split.clusters.map((cluster, index) => (
              <View className="rounded-card bg-card p-4" key={index}>
                <Text className="font-heading text-[14px] text-ink">Nhóm {index + 1}</Text>
                <Text className="mt-1 font-body text-[13px] text-ink-55">
                  {cluster.participants.map((p) => p.name).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        ) : options.length > 0 ? (
          <>
            <View className="gap-3.5 px-5 pt-5">
              {options.map((suggestion, index) => (
                <PlaceCard
                  featured={index === 0}
                  key={suggestion.suggestionId}
                  onPress={() =>
                    router.push(`/hangout/${hangoutId}/place/${suggestion.suggestionId}`)
                  }
                  suggestion={suggestion}
                />
              ))}
            </View>
            {capRelaxed ? (
              <Text className="px-5 pt-4 font-body text-[12px] leading-[18px] text-ink-45">
                Không có quán nào nằm trong giới hạn thời gian, nên Mido đã nới giới hạn để vẫn có
                lựa chọn.
              </Text>
            ) : null}
          </>
        ) : stored.isSuccess && suggest.isSuccess ? (
          // Đã chạy pipeline mà vẫn rỗng — khác hẳn với chưa chạy lần nào.
          <View className="gap-3 px-5 pt-6">
            <EmptyState
              hint="Thử nới ngân sách hoặc giới hạn thời gian di chuyển."
              title="Chưa tìm được quán nào"
            />
            <OutlineButton label="Tìm lại" onPress={resuggest} />
          </View>
        ) : (
          <LoadingState />
        )}
      </ScrollView>

      {pageCount > 1 ? (
        <View className="items-center gap-1 px-5 pb-8 pt-4">
          <TextLink label="Tìm lại lựa chọn khác" onPress={showOtherOptions} />
          <Text className="font-body text-[11.5px] text-ink-40">
            {`${currentPage + 1}/${pageCount} · ${pool.length} quán`}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
