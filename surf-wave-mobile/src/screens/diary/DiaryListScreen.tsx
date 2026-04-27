// 서핑 다이어리 목록 화면 — 리스트/캘린더 뷰 토글 (웹앱 Diary.tsx 1:1 대응)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus, BookOpen, Clock, MapPin, List, CalendarDays,
  ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { DiaryStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<DiaryStackParamList, 'DiaryList'>;
};

// ── 타입 정의 ────────────────────────────────────────────────────────
interface DiaryItem {
  id: string;
  surfDate: string;
  surfTime?: string;
  durationMinutes: number;
  satisfaction: number;
  boardType: string | null;
  memo: string | null;
  imageUrl: string | null;
  waveHeight?: string;
  windSpeed?: string;
  images?: { url: string }[];
  spot: { id: string; name: string; region: string } | null;
}

interface CalendarDay {
  date: string;
  count: number;
  spotNames: string[];
}

// ── 보드 타입 설정 (이모지 + 색상) ───────────────────────────────────
const BOARD_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  LONGBOARD:  { label: '롱보드',  emoji: '🏄',    color: '#32CD32' },
  FUNBOARD:   { label: '펀보드',  emoji: '🛹',    color: '#008CBA' },
  MIDLENGTH:  { label: '미드렝스', emoji: '🏄‍♂️', color: '#6366F1' },
  FISH:       { label: '피쉬',    emoji: '🐟',    color: '#EC4899' },
  SHORTBOARD: { label: '숏보드',  emoji: '🏄‍♀️', color: '#FF8C00' },
  SUP:        { label: 'SUP',     emoji: '🚣',    color: '#14B8A6' },
  BODYBOARD:  { label: '바디보드', emoji: '🤸',   color: '#8B5CF6' },
  FOILBOARD:  { label: '포일보드', emoji: '🪁',   color: '#0EA5E9' },
  SOFTBOARD:  { label: '소프트보드', emoji: '🏖️', color: '#F97316' },
};

// ── 만족도 설정 (이모지 + 색상) ───────────────────────────────────────
const SAT_CONFIG: Record<number, { emoji: string; color: string; label: string }> = {
  1: { emoji: '😞', color: '#ef4444', label: '별로' },
  2: { emoji: '😕', color: '#f97316', label: '아쉬움' },
  3: { emoji: '😊', color: '#eab308', label: '보통' },
  4: { emoji: '😄', color: '#22c55e', label: '좋음' },
  5: { emoji: '🤩', color: '#3b82f6', label: '최고' },
};

// 요일 헤더
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜 포맷 "YYYY-MM-DD" → "M월 D일 요일"
const WEEKDAY_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const formatDateKo = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_FULL[d.getDay()]}`;
};

// 오늘/어제/그저께 상대 날짜
const getRelativeDate = (dateStr: string): string | null => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff === 2) return '그저께';
  return null;
};

// 분 → "N시간 M분" or "N분"
const formatDuration = (min: number): string => {
  if (min >= 60) {
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${min}분`;
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
const DiaryListScreen: React.FC<Props> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [page, setPage] = useState(1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  // ── API: 다이어리 목록 ────────────────────────────────────────────
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    data: DiaryItem[];
    meta: { page: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
  }>({
    queryKey: ['diaries', page],
    queryFn: () => api.get('/diaries', { params: { page, limit: 10 } }).then(r => r.data),
    enabled: viewMode === 'list',
  });

  // ── API: 캘린더 데이터 ────────────────────────────────────────────
  const { data: calData = [], isLoading: calLoading } = useQuery<CalendarDay[]>({
    queryKey: ['diaryCalendar', calYear, calMonth],
    queryFn: () => api.get('/diaries/calendar', { params: { year: calYear, month: calMonth } }).then(r => r.data),
    enabled: viewMode === 'calendar',
  });

  // ── API: 다이어리 삭제 ────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/diaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      queryClient.invalidateQueries({ queryKey: ['diaryCalendar'] });
    },
  });

  const diaries = data?.data || [];
  const meta = data?.meta;

  // 캘린더 월 이동
  const moveMonth = (delta: number) => {
    let m = calMonth + delta, y = calYear;
    if (m < 1) { m = 12; y--; }
    else if (m > 12) { m = 1; y++; }
    setCalMonth(m); setCalYear(y);
  };

  // 캘린더 그리드 빌드
  const buildCalendarGrid = useCallback(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const dataMap = new Map(calData.map(d => [d.date, d]));

    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`e-${i}`} style={cal.cell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dataMap.get(dateStr);
      const isToday = dateStr === todayStr;
      const intensity = dayData ? Math.min(dayData.count * 15 + 5, 50) : 0;

      const emoji = dayData
        ? (dayData.count >= 3 ? '🔥' : dayData.count >= 2 ? '🏄' : '🌊')
        : null;

      cells.push(
        <View
          key={dateStr}
          style={[
            cal.cell,
            dayData ? { backgroundColor: `rgba(59,130,246,${intensity / 100})` } : null,
            isToday ? cal.todayCell : null,
          ]}
        >
          <Text style={[cal.dayNum, isToday && cal.todayNum, dayData && cal.dayNumActive]}>
            {day}
          </Text>
          {emoji ? <Text style={cal.emoji}>{emoji}</Text> : null}
        </View>
      );
    }
    return cells;
  }, [calYear, calMonth, calData]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── 헤더 ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>📖 서핑 다이어리</Text>
          {viewMode === 'list' && meta?.totalItems !== undefined && (
            <Text style={s.subtitle}>총 {meta.totalItems}개의 서핑 기록</Text>
          )}
        </View>
        {/* 뷰 모드 토글 */}
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === 'list' && s.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={16} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === 'calendar' && s.toggleBtnActive]}
            onPress={() => setViewMode('calendar')}
          >
            <CalendarDays size={16} color={viewMode === 'calendar' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════ 리스트 뷰 ══════════ */}
      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <View style={s.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : diaries.length === 0 ? (
            <View style={s.empty}>
              <BookOpen size={48} color={colors.gray300} />
              <Text style={s.emptyTitle}>아직 서핑 일기가 없어요</Text>
              <Text style={s.emptyDesc}>첫 번째 서핑 기록을 남겨보세요!</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => navigation.navigate('CreateDiary', {})}
              >
                <Text style={s.emptyBtnText}>일기 작성하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={diaries}
              keyExtractor={item => item.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
              }
              ListFooterComponent={
                meta && meta.totalPages > 1 ? (
                  <View style={s.pagination}>
                    <TouchableOpacity
                      style={[s.pageBtn, !meta.hasPrevious && s.pageBtnDisabled]}
                      disabled={!meta.hasPrevious}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} color={colors.text} />
                      <Text style={s.pageBtnText}>이전</Text>
                    </TouchableOpacity>
                    <Text style={s.pageNum}>{meta.page} / {meta.totalPages}</Text>
                    <TouchableOpacity
                      style={[s.pageBtn, !meta.hasNext && s.pageBtnDisabled]}
                      disabled={!meta.hasNext}
                      onPress={() => setPage(p => p + 1)}
                    >
                      <Text style={s.pageBtnText}>다음</Text>
                      <ChevronRight size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const sat = SAT_CONFIG[item.satisfaction] || SAT_CONFIG[3];
                const board = BOARD_CONFIG[item.boardType ?? ''];
                const relDate = getRelativeDate(item.surfDate);

                return (
                  <TouchableOpacity
                    style={s.card}
                    onPress={() => navigation.navigate('DiaryDetail', { diaryId: item.id })}
                    activeOpacity={0.8}
                  >
                    {/* 1행: 날짜 + 만족도 이모지 */}
                    <View style={s.cardRow}>
                      <View style={{ flex: 1 }}>
                        <View style={s.dateRow}>
                          <Text style={s.dateText}>{formatDateKo(item.surfDate)}</Text>
                          {relDate && (
                            <View style={s.relDateBadge}>
                              <Text style={s.relDateText}>{relDate}</Text>
                            </View>
                          )}
                        </View>
                        {item.spot && (
                          <View style={s.spotRow}>
                            <MapPin size={11} color={colors.primary} />
                            <Text style={s.spotName}>{item.spot.name}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.satEmoji}>{sat.emoji}</Text>
                    </View>

                    {/* 2행: 칩들 */}
                    <View style={s.chipsRow}>
                      {board && (
                        <View style={[s.chip, { backgroundColor: board.color + '18' }]}>
                          <Text style={[s.chipText, { color: board.color }]}>
                            {board.emoji} {board.label}
                          </Text>
                        </View>
                      )}
                      {item.durationMinutes > 0 && (
                        <View style={s.chip}>
                          <Clock size={10} color={colors.textSecondary} />
                          <Text style={s.chipText}>{formatDuration(item.durationMinutes)}</Text>
                        </View>
                      )}
                      {item.waveHeight && (
                        <View style={[s.chip, { backgroundColor: 'rgba(6,182,212,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#06B6D4' }]}>
                            {Number(item.waveHeight).toFixed(1)}m
                          </Text>
                        </View>
                      )}
                      {item.windSpeed && (
                        <View style={[s.chip, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#22C55E' }]}>
                            {Number(item.windSpeed).toFixed(0)}km/h
                          </Text>
                        </View>
                      )}
                      {(item.images?.length ?? 0) > 0 && (
                        <View style={s.chip}>
                          <Text style={s.chipText}>📷 {item.images!.length}</Text>
                        </View>
                      )}
                    </View>

                    {/* 메모 미리보기 */}
                    {item.memo ? (
                      <Text style={s.memo} numberOfLines={2}>{item.memo}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}

      {/* ══════════ 캘린더 뷰 ══════════ */}
      {viewMode === 'calendar' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 월 네비게이션 */}
          <View style={cal.navRow}>
            <TouchableOpacity onPress={() => moveMonth(-1)} style={cal.navBtn}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={cal.navTitle}>{calYear}년 {calMonth}월</Text>
            <TouchableOpacity onPress={() => moveMonth(1)} style={cal.navBtn}>
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View style={cal.weekHeader}>
            {WEEKDAY_LABELS.map(d => (
              <Text key={d} style={cal.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {calLoading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={cal.grid}>
              {buildCalendarGrid()}
            </View>
          )}

          {/* 범례 */}
          <View style={cal.legend}>
            <Text style={cal.legendText}>🌊 1회  🏄 2회  🔥 3회+</Text>
          </View>

          {/* 이번 달 서핑 횟수 */}
          {calData.length > 0 && (
            <View style={cal.summaryCard}>
              <Text style={cal.summaryText}>
                {calMonth}월 서핑 <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {calData.reduce((s, d) => s + d.count, 0)}회
                </Text>
              </Text>
              <Text style={cal.summaryDesc}>
                {calData.length}일 입수 · {[...new Set(calData.flatMap(d => d.spotNames))].length}개 스팟
              </Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB — 새 일기 작성 */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreateDiary', {})}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ── 스타일 ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h2, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  viewToggle: {
    flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 3, gap: 2,
  },
  toggleBtn: { padding: 7, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: colors.primary },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: 60 },
  emptyTitle: { ...typography.h3, color: colors.text, fontWeight: '700', marginTop: spacing.md },
  emptyDesc: { ...typography.body2, color: colors.textSecondary },
  emptyBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 80 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    gap: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dateText: { ...typography.body2, fontWeight: '700', color: colors.text },
  relDateBadge: { backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  relDateText: { fontSize: 9, color: colors.primary, fontWeight: '600' },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  spotName: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  satEmoji: { fontSize: 22 },

  chipsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: colors.gray100, borderRadius: 6,
  },
  chipText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },

  memo: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  pageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  pageNum: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});

// 캘린더 전용 스타일
const cal = StyleSheet.create({
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  navBtn: { padding: 8 },
  navTitle: { ...typography.h3, fontWeight: '700', color: colors.text },

  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg, marginBottom: 4,
  },
  weekLabel: {
    flex: 1, textAlign: 'center', fontSize: 11,
    fontWeight: '600', color: colors.textTertiary,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.lg, gap: 2,
  },
  cell: {
    width: '13.5%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, gap: 1,
  },
  todayCell: {
    borderWidth: 2, borderColor: colors.primary,
  },
  dayNum: { fontSize: 12, fontWeight: '500', color: colors.text },
  dayNumActive: { color: '#fff', fontWeight: '700' },
  todayNum: { color: colors.primary, fontWeight: '800' },
  emoji: { fontSize: 8, lineHeight: 10 },

  legend: {
    alignItems: 'center', paddingVertical: 12,
  },
  legendText: { fontSize: 12, color: colors.textSecondary },

  summaryCard: {
    marginHorizontal: spacing.lg, marginTop: 8,
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    gap: 4,
  },
  summaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryDesc: { fontSize: 12, color: colors.textSecondary },
});

export default DiaryListScreen;
