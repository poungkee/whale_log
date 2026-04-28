// 홈 화면 — 웹앱 Home.tsx와 1:1 동일 구현
// 스팟/소통 뷰 토글 + 오늘의 베스트 캐러셀 + 검색 + 2단계 지역 필터 + 즐겨찾기
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, ImageBackground,
  TextInput, FlatList, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Waves, Wind, Clock, Thermometer, Heart, X, Search, Star, RefreshCw, MessageCircle, MapPin } from 'lucide-react-native';
import Avatar from '../../components/common/Avatar';
import { api } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, typography } from '../../theme';
import { HomeStackParamList } from '../../navigation/types';
import KhoaBadge, { KhoaEnrichment } from '../../components/spot/KhoaBadge';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Home'>;
};

interface SpotForecast {
  spot: { id: string; name: string; region: string; difficulty: string };
  forecast: {
    waveHeight: string; wavePeriod: string; windSpeed: string;
    windDirection: string; waterTemperature: string; airTemperature: string;
  };
  surfRating: number;
  recommendationKo: string;
  simpleCondition: { waveStatus: string; windStatus: string; overall: string };
  // 레벨 적합도 (PASS/WARNING/BLOCKED)
  levelFit?: Record<string, string>;
  // 안전 경고 이유
  safetyReasons?: string[];
  // hints 메시지 + 태그
  hints?: { message: string; tags: string[] };
  // KHOA 정부 서핑지수
  khoaEnrichment?: KhoaEnrichment;
}

interface DashboardResponse {
  spots: SpotForecast[];
  totalSpots: number;
  fetchedAt: string;
}

// 국내 세부 지역 그룹 (웹앱 Header.tsx와 동일)
const DOMESTIC_GROUPS = [
  { key: '동해', label: '동해', regions: ['양양', '고성', '속초', '강릉'] },
  { key: '남해', label: '남해', regions: ['부산'] },
  { key: '제주', label: '제주', regions: ['제주'] },
  { key: '서해', label: '서해', regions: ['태안'] },
  { key: '기타', label: '기타', regions: ['포항', '고흥'] },
];

const BALI_GROUPS = [
  { key: 'bukit',    label: '부킷/울루와뚜', regions: ['Bali - Bukit'] },
  { key: 'canggu',   label: '짱구',          regions: ['Bali - Canggu'] },
  { key: 'kuta',     label: '꾸따/레기안',   regions: ['Bali - Kuta'] },
  { key: 'sanur',    label: '사누르',        regions: ['Bali - Sanur'] },
  { key: 'nusadua',  label: '누사두아',      regions: ['Bali - Nusa Dua'] },
  { key: 'airport',  label: '에어포트 리프', regions: ['Bali - Airport Reef'] },
  { key: 'jimbaran', label: '짐바란',        regions: ['Bali - Jimbaran'] },
  { key: 'lembongan',label: '렘봉안',        regions: ['Bali - Lembongan'] },
];

// 한글 검색어 → 영문 별칭 매핑 (웹앱과 동일)
const SEARCH_ALIASES: Record<string, string[]> = {
  '발리': ['bali'], '꾸따': ['kuta'], '쿠타': ['kuta'],
  '짱구': ['canggu'], '창구': ['canggu'], '사누르': ['sanur'],
  '짐바란': ['jimbaran'], '누사두아': ['nusa dua'],
  '울루와뚜': ['uluwatu', 'airport reef'], '부킷': ['bukit'],
  '렘봉안': ['lembongan'],
};

const MAJOR_TABS = [
  { key: '전체',    label: '전체' },
  { key: '국내',    label: '국내' },
  { key: '발리',    label: '발리' },
  { key: '즐겨찾기', label: '⭐ 즐겨찾기' },
] as const;

const SURF_LEVELS = [
  { label: '입문', value: 'BEGINNER' },
  { label: '초급', value: 'INTERMEDIATE' },
  { label: '중급', value: 'ADVANCED' },
  { label: '고급', value: 'EXPERT' },
];

// 지역별 스팟 이미지
const getSpotImage = (region: string, name: string) => {
  const r = region.toLowerCase();
  const n = name.toLowerCase();
  if (r.includes('bali') || r.includes('indonesia') || n.includes('bali'))
    return require('../../../assets/images/spots/bali.jpg');
  if (r.includes('제주') || n.includes('jeju'))
    return require('../../../assets/images/spots/jeju.jpg');
  if (r.includes('동해') || r.includes('gangwon') || r.includes('강원'))
    return require('../../../assets/images/spots/donghai.jpg');
  if (r.includes('남해') || r.includes('busan') || r.includes('부산'))
    return require('../../../assets/images/spots/namhae.jpg');
  const waves = [
    require('../../../assets/images/spots/wave1.jpg'),
    require('../../../assets/images/spots/wave2.jpg'),
    require('../../../assets/images/spots/wave3.jpg'),
    require('../../../assets/images/spots/wave4.jpg'),
    require('../../../assets/images/spots/wave5.jpg'),
  ];
  return waves[name.charCodeAt(0) % 5];
};

const getRatingColor = (r: number) => {
  if (r >= 8) return colors.perfect;
  if (r >= 6) return colors.good;
  if (r >= 4) return colors.fair;
  return colors.poor;
};

const getRatingLabel = (r: number) => {
  if (r >= 8) return '최고';
  if (r >= 6) return '좋음';
  if (r >= 4) return '보통';
  return '나쁨';
};

// 레벨 적합도 색상
const getLevelFitColor = (fit: string) => {
  if (fit === 'BLOCKED') return colors.error;
  if (fit === 'WARNING') return colors.warning;
  return colors.success;
};

// 레벨 적합도 한국어 라벨
const getLevelFitLabel = (fit: string) => {
  if (fit === 'BLOCKED') return '⛔ 위험';
  if (fit === 'WARNING') return '⚠️ 주의';
  return '✅ 적합';
};

// hints 태그 색상
const getHintTagColor = (tag: string): string => {
  const dangerTags = ['SAFETY_WARNING', 'WAVE_TOO_BIG', 'STRONG_WIND', 'ONSHORE_WIND'];
  const goodTags = ['GOOD_SWELL', 'OFFSHORE_WIND', 'IDEAL_PERIOD', 'WARM_WATER'];
  const infoTags = ['LONGBOARD_DAY', 'FLAT_CONDITION', 'BEGINNER_FRIENDLY'];
  if (dangerTags.includes(tag)) return colors.error;
  if (goodTags.includes(tag)) return colors.success;
  if (infoTags.includes(tag)) return colors.primary;
  return colors.textSecondary;
};

// hints 태그 한국어 라벨
const getHintTagLabel = (tag: string): string => {
  const map: Record<string, string> = {
    SAFETY_WARNING: '안전주의',
    WAVE_TOO_BIG: '파도 큼',
    STRONG_WIND: '강풍',
    ONSHORE_WIND: '안쪽바람',
    OFFSHORE_WIND: '오프쇼어',
    GOOD_SWELL: '굿스웰',
    IDEAL_PERIOD: '좋은주기',
    WARM_WATER: '따뜻한수온',
    LONGBOARD_DAY: '롱보드데이',
    FLAT_CONDITION: '잔잔함',
    BEGINNER_FRIENDLY: '입문자OK',
    CHOPPY: '파도 불규칙',
    SIDE_WIND: '측풍',
  };
  return map[tag] || tag;
};

// KHOA 서핑지수 색상
const getKhoaColor = (index: string): string => {
  if (index === '매우좋음') return colors.perfect;
  if (index === '좋음') return colors.good;
  if (index === '보통') return colors.fair;
  return colors.poor;
};

// 지역 필터 매칭 함수 (웹앱 matchRegionFilter와 동일)
function matchRegionFilter(
  spotRegion: string,
  major: string,
  sub: string | null,
): boolean {
  if (major === '전체' || major === '즐겨찾기') return true;
  if (major === '국내') {
    if (!sub) return !spotRegion.startsWith('Bali');
    const group = DOMESTIC_GROUPS.find(g => g.key === sub);
    return group ? group.regions.includes(spotRegion) : false;
  }
  if (major === '발리') {
    if (!sub) return spotRegion.startsWith('Bali');
    const group = BALI_GROUPS.find(g => g.key === sub);
    return group ? group.regions.includes(spotRegion) : false;
  }
  return true;
}

// ── 커뮤니티 피드 (홈 소통 탭 임베드용) ─────────────────────────
interface CommunityPost {
  id: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
  content: string;
  images: { id: string; imageUrl: string }[];
  spot: { id: string; name: string; region: string } | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

const relTime = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

const CommunityFeed: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery<{ data: CommunityPost[]; hasNextPage: boolean; page: number }>({
      queryKey: ['community-posts-home'],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await api.get(`/community/posts?page=${pageParam}&limit=10`);
        const raw = res.data;
        if (Array.isArray(raw)) return { data: raw, hasNextPage: raw.length === 10, page: pageParam as number };
        return {
          data: raw.data ?? [],
          hasNextPage: (raw.page ?? 1) * 10 < (raw.total ?? 0),
          page: pageParam as number,
        };
      },
      initialPageParam: 1,
      getNextPageParam: (last) => last.hasNextPage ? last.page + 1 : undefined,
    });

  const posts = data?.pages.flatMap(p => p.data) ?? [];

  const likeMut = useMutation({
    mutationFn: (id: string) => api.post(`/community/posts/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts-home'] }),
  });

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  if (posts.length === 0) return (
    <View style={cfStyles.empty}>
      <Text style={cfStyles.emptyIcon}>💬</Text>
      <Text style={cfStyles.emptyText}>아직 게시글이 없어요</Text>
      <Text style={cfStyles.emptySub}>첫 번째 서퍼가 되어보세요!</Text>
    </View>
  );

  return (
    <>
      <View style={cfStyles.listWrap}>
      {posts.map(post => (
        <View key={post.id} style={cfStyles.card}>
          <View style={cfStyles.authorRow}>
            <Avatar name={post.author.nickname} uri={post.author.avatarUrl || undefined} size="sm" />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={cfStyles.nick}>{post.author.nickname}</Text>
              <View style={cfStyles.metaRow}>
                {post.spot && <><MapPin size={10} color={colors.primary} /><Text style={cfStyles.spotTag}>{post.spot.name} · </Text></>}
                <Text style={cfStyles.ts}>{relTime(post.createdAt)}</Text>
              </View>
            </View>
          </View>
          <Text style={cfStyles.body}>{post.content}</Text>
          {post.images.length > 0 && (
            <Image source={{ uri: post.images[0].imageUrl }} style={cfStyles.img} />
          )}
          <View style={cfStyles.actions}>
            <TouchableOpacity
              style={cfStyles.actionBtn}
              onPress={() => {
                if (!isAuthenticated) { Alert.alert('로그인 필요'); return; }
                likeMut.mutate(post.id);
              }}
            >
              <Heart size={16} color={post.isLiked ? colors.error : colors.textSecondary} fill={post.isLiked ? colors.error : 'transparent'} />
              <Text style={cfStyles.cnt}>{post.likeCount}</Text>
            </TouchableOpacity>
            <View style={cfStyles.actionBtn}>
              <MessageCircle size={16} color={colors.textSecondary} />
              <Text style={cfStyles.cnt}>{post.commentCount}</Text>
            </View>
          </View>
        </View>
      ))}
      {hasNextPage && (
        <TouchableOpacity style={cfStyles.moreBtn} onPress={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={cfStyles.moreBtnText}>더보기</Text>
          }
        </TouchableOpacity>
      )}
      </View>
    </>
  );
};

const cfStyles = StyleSheet.create({
  listWrap: { paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...typography.body1, fontWeight: '700', color: colors.text },
  emptySub: { ...typography.body2, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  nick: { ...typography.body2, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  spotTag: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  ts: { ...typography.caption, color: colors.textTertiary },
  body: { ...typography.body2, color: colors.text, lineHeight: 20, marginBottom: spacing.sm },
  img: { width: '100%', height: 180, borderRadius: 10, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cnt: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  moreBtn: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  moreBtnText: { ...typography.body2, color: colors.primary, fontWeight: '700' },
});
// ─────────────────────────────────────────────────────────────────

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedLevel, setSelectedLevel] = useState(user?.surfLevel || 'BEGINNER');
  const [viewMode, setViewMode] = useState<'spots' | 'community'>('spots');
  const [majorTab, setMajorTab] = useState<'전체' | '국내' | '발리' | '즐겨찾기'>('전체');
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardResponse>({
    queryKey: ['dashboard', selectedLevel],
    queryFn: () =>
      api.get('/dashboard/forecasts', { params: { level: selectedLevel } }).then(r => r.data),
    staleTime: 15 * 60 * 1000,
  });

  const { data: favoritesData } = useQuery<{ id: string }[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get('/spots/favorites').then(r => r.data),
    retry: false,
  });
  const favoritedIds = useMemo(
    () => new Set((favoritesData ?? []).map(s => s.id)),
    [favoritesData],
  );

  const favMutation = useMutation({
    mutationFn: ({ spotId, isFav }: { spotId: string; isFav: boolean }) =>
      isFav ? api.delete(`/spots/${spotId}/favorite`) : api.post(`/spots/${spotId}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const spots = useMemo(() =>
    (data?.spots || []).slice().sort((a, b) => b.surfRating - a.surfRating),
    [data],
  );

  // 오늘의 베스트 — 상위 3개
  const bestSpots = useMemo(() => spots.slice(0, 3), [spots]);

  // 세부 지역 칩 목록
  const subGroups = useMemo(() => {
    if (majorTab === '국내') return DOMESTIC_GROUPS;
    if (majorTab === '발리') return BALI_GROUPS;
    return [];
  }, [majorTab]);

  // 필터 + 검색 적용
  const filteredSpots = useMemo(() => {
    let result = spots;
    if (majorTab === '즐겨찾기') {
      result = result.filter(s => favoritedIds.has(s.spot.id));
    } else {
      result = result.filter(s => matchRegionFilter(s.spot.region, majorTab, subFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const aliases: string[] = [];
      Object.entries(SEARCH_ALIASES).forEach(([ko, enList]) => {
        if (q.includes(ko)) aliases.push(...enList);
      });
      result = result.filter(s => {
        const name = s.spot.name.toLowerCase();
        const region = s.spot.region.toLowerCase();
        if (name.includes(q) || region.includes(q)) return true;
        return aliases.some(a => name.includes(a) || region.includes(a));
      });
    }
    return result;
  }, [spots, majorTab, subFilter, searchQuery, favoritedIds]);

  const handleMajorTab = (key: typeof majorTab) => {
    setMajorTab(key);
    setSubFilter(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── 헤더 ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Whale Log</Text>
          <Text style={styles.subtitle}>🌊 서핑 예보</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw size={18} color={isRefetching ? colors.textTertiary : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─── 검색창 ─── */}
      <View style={styles.searchBox}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="스팟 이름, 지역 검색... (짱구, 양양 등)"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* ─── 레벨 탭 ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelTabsWrap}>
          <View style={styles.levelTabs}>
            {SURF_LEVELS.map(lv => (
              <TouchableOpacity
                key={lv.value}
                style={[styles.levelTab, selectedLevel === lv.value && styles.levelTabActive]}
                onPress={() => setSelectedLevel(lv.value)}
              >
                <Text style={[styles.levelTabText, selectedLevel === lv.value && styles.levelTabTextActive]}>
                  {lv.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ─── 뷰 모드 토글: 스팟 🌊 / 소통 💬 — 로딩 완료 후 항상 표시 ─── */}
        {!isLoading && (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'spots' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('spots')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'spots' && styles.viewToggleTextActive]}>
                🌊 스팟
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'community' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('community')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'community' && styles.viewToggleTextActive]}>
                💬 소통
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 스팟 모드 전용 UI (베스트 캐러셀 + 지역 필터) ─── */}
        {!isLoading && spots.length > 0 && viewMode === 'spots' && (
          <>
            {/* ─── 오늘의 베스트 캐러셀 ─── */}
            {bestSpots.length > 0 && (
              <View style={styles.bestSection}>
                <View style={styles.bestHeader}>
                  <Star size={14} color="#F1C40F" fill="#F1C40F" />
                  <Text style={styles.bestTitle}>오늘의 베스트</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.bestRow}>
                    {bestSpots.map(sf => (
                      <TouchableOpacity
                        key={sf.spot.id}
                        style={styles.bestCard}
                        onPress={() => navigation.navigate('SpotDetail', { spotId: sf.spot.id, spotName: sf.spot.name })}
                        activeOpacity={0.85}
                      >
                        <ImageBackground
                          source={getSpotImage(sf.spot.region, sf.spot.name)}
                          style={styles.bestCardBg}
                          imageStyle={{ borderRadius: 12 }}
                        >
                          <View style={styles.bestCardOverlay} />
                          {/* 등급 뱃지 */}
                          <View style={styles.bestGrade}>
                            <View style={[styles.bestGradeDot, { backgroundColor: getRatingColor(sf.surfRating) }]} />
                            <Text style={styles.bestGradeText}>{getRatingLabel(sf.surfRating)}</Text>
                            <Text style={styles.bestGradeNum}>{sf.surfRating}</Text>
                          </View>
                          {/* 파고 + 스팟명 */}
                          <View style={styles.bestBottom}>
                            <Text style={styles.bestWaveHeight}>
                              {sf.forecast ? parseFloat(sf.forecast.waveHeight).toFixed(1) : '-'}
                              <Text style={styles.bestWaveUnit}>m</Text>
                            </Text>
                            <Text style={styles.bestSpotName} numberOfLines={1}>{sf.spot.name}</Text>
                            <Text style={styles.bestSpotRegion} numberOfLines={1}>{sf.spot.region}</Text>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* ─── 대분류 탭: 전체 | 국내 | 발리 | ⭐즐겨찾기 ─── */}
            <View style={styles.majorTabsWrap}>
              <View style={styles.majorTabs}>
                {MAJOR_TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.majorTab, majorTab === tab.key && styles.majorTabActive]}
                    onPress={() => handleMajorTab(tab.key)}
                  >
                    <Text style={[styles.majorTabText, majorTab === tab.key && styles.majorTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ─── 세부 지역 칩 (국내/발리 선택 시) ─── */}
            {subGroups.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subChipWrap}>
                <View style={styles.subChips}>
                  <TouchableOpacity
                    style={[styles.subChip, subFilter === null && styles.subChipActive]}
                    onPress={() => setSubFilter(null)}
                  >
                    <Text style={[styles.subChipText, subFilter === null && styles.subChipTextActive]}>전체</Text>
                  </TouchableOpacity>
                  {subGroups.map(group => {
                    const count = spots.filter(s => group.regions.includes(s.spot.region)).length;
                    if (count === 0) return null;
                    return (
                      <TouchableOpacity
                        key={group.key}
                        style={[styles.subChip, subFilter === group.key && styles.subChipActive]}
                        onPress={() => setSubFilter(group.key)}
                      >
                        <Text style={[styles.subChipText, subFilter === group.key && styles.subChipTextActive]}>
                          {group.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* ─── 로딩 ─── */}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>파도 정보 불러오는 중...</Text>
          </View>
        )}

        {/* ─── 스팟 목록 ─── */}
        {viewMode === 'spots' && !isLoading && (
          <View style={styles.spotList}>
            {filteredSpots.length === 0 && spots.length > 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery ? `"${searchQuery}"에 맞는 스팟이 없습니다` : '해당 지역에 스팟이 없습니다'}
                </Text>
                <TouchableOpacity onPress={() => { handleMajorTab('전체'); setSearchQuery(''); }}>
                  <Text style={styles.emptyReset}>전체 보기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredSpots.map(item => (
                <TouchableOpacity
                  key={item.spot.id}
                  style={styles.spotCard}
                  onPress={() => navigation.navigate('SpotDetail', { spotId: item.spot.id, spotName: item.spot.name })}
                  activeOpacity={0.8}
                >
                  {/* 스팟 이미지 헤더 */}
                  <ImageBackground
                    source={getSpotImage(item.spot.region, item.spot.name)}
                    style={styles.cardImage}
                    imageStyle={styles.cardImageStyle}
                  >
                    <View style={styles.cardImageOverlay} />
                    <View style={styles.cardImageContent}>
                      <View style={styles.cardLeft}>
                        <Text style={styles.spotNameOnImg}>{item.spot.name}</Text>
                        <Text style={styles.spotRegionOnImg}>{item.spot.region}</Text>
                      </View>
                      <View style={styles.cardRight}>
                        {/* 즐겨찾기 버튼 */}
                        <TouchableOpacity
                          style={styles.cardFavBtn}
                          onPress={() => favMutation.mutate({ spotId: item.spot.id, isFav: favoritedIds.has(item.spot.id) })}
                          activeOpacity={0.8}
                        >
                          <Heart
                            size={15}
                            color={favoritedIds.has(item.spot.id) ? colors.accent : '#fff'}
                            fill={favoritedIds.has(item.spot.id) ? colors.accent : 'transparent'}
                          />
                        </TouchableOpacity>
                        <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.surfRating) }]}>
                          <Text style={styles.ratingNumber}>{item.surfRating}</Text>
                          <Text style={styles.ratingLabel}>{getRatingLabel(item.surfRating)}</Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>

                  {/* 컨디션 칩 */}
                  <View style={styles.conditionRow}>
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>파도 {item.simpleCondition.waveStatus}</Text>
                    </View>
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionText}>바람 {item.simpleCondition.windStatus}</Text>
                    </View>
                    <View style={[styles.conditionBadge, styles.overallBadge]}>
                      <Text style={[styles.conditionText, { color: colors.primary, fontWeight: '600' }]}>
                        {item.simpleCondition.overall}
                      </Text>
                    </View>
                    {/* 레벨 적합도 배지 */}
                    {item.levelFit?.[selectedLevel] && (
                      <View style={[styles.levelFitBadge, { backgroundColor: getLevelFitColor(item.levelFit[selectedLevel]) + '20', borderColor: getLevelFitColor(item.levelFit[selectedLevel]) + '60' }]}>
                        <Text style={[styles.levelFitText, { color: getLevelFitColor(item.levelFit[selectedLevel]) }]}>
                          {getLevelFitLabel(item.levelFit[selectedLevel])}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 안전 경고 (BLOCKED 시) */}
                  {item.levelFit?.[selectedLevel] === 'BLOCKED' && item.safetyReasons && item.safetyReasons.length > 0 && (
                    <View style={styles.safetyRow}>
                      <Text style={styles.safetyText}>⛔ {item.safetyReasons[0]}</Text>
                    </View>
                  )}

                  {/* hints 태그 */}
                  {item.hints?.tags && item.hints.tags.length > 0 && (
                    <View style={styles.hintsRow}>
                      {item.hints.tags.slice(0, 4).map(tag => (
                        <View key={tag} style={[styles.hintTag, { borderColor: getHintTagColor(tag) + '50', backgroundColor: getHintTagColor(tag) + '15' }]}>
                          <Text style={[styles.hintTagText, { color: getHintTagColor(tag) }]}>
                            {getHintTagLabel(tag)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 데이터 행 */}
                  <View style={styles.dataRow}>
                    <View style={styles.dataItem}>
                      <Waves size={14} color={colors.primary} />
                      <Text style={styles.dataValue}>{parseFloat(item.forecast.waveHeight).toFixed(1)}m</Text>
                      <Text style={styles.dataLabel}>파고</Text>
                    </View>
                    <View style={styles.dataDivider} />
                    <View style={styles.dataItem}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={styles.dataValue}>{parseFloat(item.forecast.wavePeriod).toFixed(0)}s</Text>
                      <Text style={styles.dataLabel}>주기</Text>
                    </View>
                    <View style={styles.dataDivider} />
                    <View style={styles.dataItem}>
                      <Wind size={14} color={colors.textSecondary} />
                      <Text style={styles.dataValue}>{parseFloat(item.forecast.windSpeed).toFixed(0)}</Text>
                      <Text style={styles.dataLabel}>km/h</Text>
                    </View>
                    <View style={styles.dataDivider} />
                    <View style={styles.dataItem}>
                      <Thermometer size={14} color={colors.textSecondary} />
                      <Text style={styles.dataValue}>{parseFloat(item.forecast.waterTemperature).toFixed(0)}°</Text>
                      <Text style={styles.dataLabel}>수온</Text>
                    </View>
                  </View>

                  {/* KHOA 정부 서핑지수 (한국 스팟만) */}
                  {item.khoaEnrichment?.khoaIndex && (
                    <View style={styles.khoaRow}>
                      <KhoaBadge
                        enrichment={item.khoaEnrichment}
                        currentLevel={selectedLevel}
                        compact
                      />
                    </View>
                  )}

                  {/* 한줄 추천 (hints 메시지 우선) */}
                  <Text style={styles.recommendation} numberOfLines={2}>
                    💬 {item.hints?.message || item.recommendationKo}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ─── 소통 모드 (커뮤니티 피드) ─── */}
        {viewMode === 'community' && !isLoading && (
          <CommunityFeed />
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // 헤더
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  appName: { fontSize: 20, fontWeight: '800', color: colors.primary, fontStyle: 'italic' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  // 검색창
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, ...typography.body2, color: colors.text, padding: 0 },

  // 레벨 탭
  levelTabsWrap: { marginBottom: spacing.sm },
  levelTabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  levelTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  levelTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelTabText: { ...typography.body2, color: colors.textSecondary, fontWeight: '500' },
  levelTabTextActive: { color: '#fff' },

  // 뷰 모드 토글
  viewToggle: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 3,
  },
  viewToggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: colors.primary },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  viewToggleTextActive: { color: '#fff' },

  // 오늘의 베스트
  bestSection: { marginBottom: spacing.md },
  bestHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  bestTitle: { ...typography.body2, fontWeight: '700', color: colors.text },
  bestRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  bestCard: { width: 160, height: 120, borderRadius: 12, overflow: 'hidden' },
  bestCardBg: { width: 160, height: 120, justifyContent: 'space-between' },
  bestCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bestGrade: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: spacing.sm,
  },
  bestGradeDot: { width: 8, height: 8, borderRadius: 4 },
  bestGradeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bestGradeNum: { fontSize: 11, fontWeight: '900', color: '#fff' },
  bestBottom: { padding: spacing.sm },
  bestWaveHeight: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  bestWaveUnit: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  bestSpotName: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bestSpotRegion: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },

  // 대분류 탭
  majorTabsWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  majorTabs: {
    flexDirection: 'row', backgroundColor: colors.surfaceSecondary,
    borderRadius: 10, padding: 3,
  },
  majorTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  majorTabActive: { backgroundColor: colors.primary },
  majorTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  majorTabTextActive: { color: '#fff' },

  // 세부 지역 칩
  subChipWrap: { marginBottom: spacing.sm },
  subChips: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  subChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  subChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  subChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  subChipTextActive: { color: '#fff', fontWeight: '600' },

  // 로딩
  loading: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  loadingText: { ...typography.body2, color: colors.textSecondary },

  // 스팟 목록
  spotList: { paddingHorizontal: spacing.lg, gap: spacing.md },

  // 빈 상태
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  emptyDesc: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },
  emptyReset: { ...typography.body2, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },

  // 소통 모드
  communityBox: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  communityIcon: { fontSize: 48 },
  communityTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  communityDesc: { ...typography.body2, color: colors.textSecondary },

  // 스팟 카드
  spotCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    marginBottom: spacing.sm,
  },
  cardImage: { height: 100, overflow: 'hidden' },
  cardImageStyle: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  cardImageContent: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', padding: spacing.sm,
  },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardFavBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  spotNameOnImg: { ...typography.body1, fontWeight: '700', color: '#fff' },
  spotRegionOnImg: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ratingBadge: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
  },
  ratingNumber: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ratingLabel: { fontSize: 9, color: '#fff', fontWeight: '600' },

  conditionRow: { flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, paddingBottom: 0 },
  conditionBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    backgroundColor: colors.gray100, borderRadius: 8,
  },
  overallBadge: { backgroundColor: colors.primary + '15' },
  conditionText: { ...typography.caption, color: colors.textSecondary },

  dataRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 12,
    margin: spacing.sm, padding: spacing.sm,
  },
  dataItem: { flex: 1, alignItems: 'center', gap: 2 },
  dataDivider: { width: 1, height: 30, backgroundColor: colors.border },
  dataValue: { ...typography.body2, fontWeight: '700', color: colors.text },
  dataLabel: { fontSize: 10, color: colors.textSecondary },

  recommendation: {
    ...typography.caption, color: colors.textSecondary,
    fontStyle: 'italic', paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },

  // 레벨 적합도 배지
  levelFitBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  levelFitText: { fontSize: 10, fontWeight: '700' },

  // 안전 경고
  safetyRow: {
    marginHorizontal: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: 8, borderWidth: 1, borderColor: colors.error + '30',
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  safetyText: { fontSize: 11, color: colors.error, fontWeight: '600' },

  // hints 태그
  hintsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    paddingHorizontal: spacing.sm, paddingBottom: 4,
  },
  hintTag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  hintTagText: { fontSize: 10, fontWeight: '600' },

  // KHOA 정부 서핑지수
  khoaRow: {
    paddingHorizontal: spacing.md, paddingBottom: 4,
  },
});

export default HomeScreen;
