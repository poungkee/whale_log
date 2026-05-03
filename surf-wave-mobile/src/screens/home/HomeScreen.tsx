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
import {
  Waves, Wind, Clock, Thermometer, Heart, X, Search, Star, RefreshCw,
  MessageCircle, MapPin, ArrowUp, ArrowDown, Sun, Cloud, CloudRain, Droplets,
} from 'lucide-react-native';
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
    /** 날씨 상태 (맑음/흐림/비 등) — 카드 날씨 행에서 표시 */
    weatherCondition?: string | null;
    /** 조석 상태 (RISING/FALLING/HIGH/LOW) — 카드에 밀물/썰물 표시 */
    tideStatus?: string | null;
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
  /** 기상특보 — 풍랑/태풍/강풍 발령 시 카드 상단 배너 표시 */
  weatherAlert?: {
    alertName?: string | null;
    isDangerous?: boolean;
    level?: string | null;
  } | null;
}

interface DashboardResponse {
  spots: SpotForecast[];
  totalSpots: number;
  fetchedAt: string;
}

// 국내 세부 지역 그룹 (웹앱 Header.tsx와 동일)
// 한국 해역 4분류 — 부산은 메인 서핑 스팟이 동해 영향이라 동해로 분류
// 누락됐던 region(거제/완도/울산/동해시) 추가, "기타" 그룹 제거
const DOMESTIC_GROUPS = [
  { key: '동해', label: '동해', regions: ['양양', '고성', '속초', '강릉', '동해', '포항', '울산', '부산'] },
  { key: '남해', label: '남해', regions: ['거제', '완도', '고흥'] },
  { key: '서해', label: '서해', regions: ['태안'] },
  { key: '제주', label: '제주', regions: ['제주'] },
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
/** 레벨 적합도 라벨 — 웹앱 utils.ts와 동일 (PASS=안전, WARNING=주의, BLOCKED=위험) */
const getLevelFitLabel = (fit: string) => {
  if (fit === 'BLOCKED') return '위험';
  if (fit === 'WARNING') return '주의';
  return '안전';
};

/** 난이도 한국어 약칭 (웹앱 SpotCard와 동일) */
const getDifficultyShort = (difficulty?: string): string => {
  const d = (difficulty || '').toUpperCase();
  if (d === 'BEGINNER') return '초급';
  if (d === 'INTERMEDIATE') return '중급';
  if (d === 'ADVANCED') return '상급';
  if (d === 'EXPERT') return '전문가';
  return difficulty || '';
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
  author: { id: string; username: string | null; avatarUrl: string | null };
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
            <Avatar name={post.author.username || '?'} uri={post.author.avatarUrl || undefined} size="sm" />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={cfStyles.nick}>{post.author.username || '알 수 없음'}</Text>
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

  /**
   * 사용자 surfLevel 직접 사용 (이전엔 selectedLevel state로 임의 변경 가능했지만
   * 웹앱은 메인에 레벨 변경 UI 없음 — 마이페이지에서만 변경하는 흐름과 통일).
   */
  const selectedLevel = user?.surfLevel || 'BEGINNER';
  const [viewMode, setViewMode] = useState<'spots' | 'community'>('spots');
  const [majorTab, setMajorTab] = useState<'전체' | '국내' | '발리' | '즐겨찾기'>('전체');
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** 검색창 펼침 여부 — 기본은 돋보기 아이콘만 보이고 클릭 시 입력창 노출 */
  const [searchOpen, setSearchOpen] = useState(false);

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
      {/* ─── 헤더 — 돋보기/새로고침 우측 ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Whale Log</Text>
          <Text style={styles.subtitle}>🌊 서핑 예보</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              setSearchOpen(v => !v);
              if (searchOpen) setSearchQuery(''); // 닫을 때 입력 초기화
            }}
          >
            <Search size={18} color={searchOpen ? colors.primary : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw size={18} color={isRefetching ? colors.textTertiary : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 검색창 — 돋보기 클릭 시에만 펼쳐짐 ─── */}
      {searchOpen && (
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="스팟 또는 지역 검색"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* 레벨 탭 제거 — 사용자 surfLevel 직접 사용. 웹앱과 동일 (마이페이지에서만 변경) */}

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
              filteredSpots.map(item => {
                const ratingColor = getRatingColor(item.surfRating);
                const isFav = favoritedIds.has(item.spot.id);
                const isBlocked = item.levelFit?.[selectedLevel] === 'BLOCKED';
                /** 조석 정보 — 밀물/썰물 + 화살표 (웹앱과 동일) */
                const tideStatus = item.forecast.tideStatus;
                const tideInfo = tideStatus === 'RISING' || tideStatus === 'HIGH'
                  ? { label: tideStatus === 'HIGH' ? '만조' : '밀물', rising: true }
                  : tideStatus === 'FALLING' || tideStatus === 'LOW'
                    ? { label: tideStatus === 'LOW' ? '간조' : '썰물', rising: false }
                    : null;
                /** 날씨 아이콘 결정 — 맑음/비/구름 */
                const weather = item.forecast.weatherCondition || '';
                const WeatherIcon = weather.includes('맑음') ? Sun
                  : weather.includes('비') || weather.includes('소나기') ? CloudRain
                  : Cloud;
                const weatherColor = weather.includes('맑음') ? '#FBBF24'
                  : weather.includes('비') ? '#60A5FA'
                  : colors.textTertiary;
                return (
                  <TouchableOpacity
                    key={item.spot.id}
                    /** BLOCKED 카드는 dim + 채도 낮춤 (웹앱 opacity-50 grayscale 모방) */
                    style={[styles.spotCard, isBlocked && styles.spotCardBlocked]}
                    onPress={() => navigation.navigate('SpotDetail', { spotId: item.spot.id, spotName: item.spot.name })}
                    activeOpacity={0.85}
                  >
                    {/* ── 상단: 좌측(하트+스팟명+지역·난이도) + 우측(점수 원형) ── */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTopLeft}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            favMutation.mutate({ spotId: item.spot.id, isFav });
                          }}
                          hitSlop={8}
                        >
                          <Heart
                            size={16}
                            color={isFav ? colors.error : colors.textTertiary}
                            fill={isFav ? colors.error : 'transparent'}
                          />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.spotName} numberOfLines={1}>{item.spot.name}</Text>
                          <Text style={styles.spotMeta}>
                            {item.spot.region} · {getDifficultyShort(item.spot.difficulty)}
                          </Text>
                        </View>
                      </View>
                      {/* 점수 원형 — 등급 색상 배경 */}
                      <View style={[styles.scoreCircle, { backgroundColor: ratingColor + '20' }]}>
                        <Text style={[styles.scoreNum, { color: ratingColor }]}>{item.surfRating.toFixed(1)}</Text>
                        <Text style={[styles.scoreGrade, { color: ratingColor }]}>{getRatingLabel(item.surfRating)}</Text>
                      </View>
                    </View>

                    {/* ── 기상특보 배너 (풍랑/태풍/강풍 발령 시) ── */}
                    {item.weatherAlert?.alertName && (
                      <View style={[
                        styles.alertBanner,
                        item.weatherAlert.isDangerous ? styles.alertBannerDanger : styles.alertBannerWarn,
                      ]}>
                        <Text style={[
                          styles.alertText,
                          { color: item.weatherAlert.isDangerous ? colors.error : '#E67E22' },
                        ]}>
                          ⚠️ {item.weatherAlert.alertName} 발령 중
                          {item.weatherAlert.level === '경보' ? ' · 입수 금지' :
                            item.weatherAlert.isDangerous ? ' · 입수 위험' : ''}
                        </Text>
                      </View>
                    )}

                    {/* ── 적합도 배지 (PASS/WARNING) — BLOCKED는 하단 안전 경고에서 처리 ── */}
                    {item.levelFit?.[selectedLevel] && !isBlocked && (
                      <View style={styles.fitBadgeRow}>
                        <View style={[styles.fitBadge, { backgroundColor: getLevelFitColor(item.levelFit[selectedLevel]) + '20' }]}>
                          <Text style={[styles.fitBadgeText, { color: getLevelFitColor(item.levelFit[selectedLevel]) }]}>
                            {getLevelFitLabel(item.levelFit[selectedLevel])}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ── 파고 큰 숫자 + 주기/풍속/조석 인라인 ── */}
                    <View style={styles.statsRow}>
                      {/* 파고 — 큰 숫자 + 단위 baseline 정렬 (이 영역만 따로) */}
                      <View style={styles.waveHeightWrap}>
                        <Text style={styles.waveHeightNum}>
                          {parseFloat(item.forecast.waveHeight).toFixed(1)}
                        </Text>
                        <Text style={styles.waveHeightUnit}>m</Text>
                      </View>
                      <View style={styles.statsDivider} />
                      <View style={styles.inlineStat}>
                        <Clock size={13} color={colors.textTertiary} />
                        <Text style={styles.inlineStatText}>{parseFloat(item.forecast.wavePeriod).toFixed(0)}s</Text>
                      </View>
                      <View style={styles.inlineStat}>
                        <Wind size={13} color={colors.textTertiary} />
                        <Text style={styles.inlineStatText}>{parseFloat(item.forecast.windSpeed).toFixed(0)}km/h</Text>
                      </View>
                      {tideInfo && (
                        <View style={styles.inlineStat}>
                          {tideInfo.rising
                            ? <ArrowUp size={13} color={colors.textTertiary} />
                            : <ArrowDown size={13} color={colors.textTertiary} />
                          }
                          <Text style={styles.inlineStatText}>{tideInfo.label}</Text>
                        </View>
                      )}
                    </View>

                    {/* ── 날씨 + 기온 + 수온 별도 행 ── */}
                    {(item.forecast.weatherCondition || item.forecast.airTemperature || item.forecast.waterTemperature) && (
                      <View style={styles.weatherRow}>
                        {(item.forecast.weatherCondition || item.forecast.airTemperature) && (
                          <View style={styles.inlineStat}>
                            <WeatherIcon size={13} color={weatherColor} />
                            {item.forecast.weatherCondition && (
                              <Text style={styles.weatherText}>{item.forecast.weatherCondition}</Text>
                            )}
                            {item.forecast.airTemperature && (
                              <Text style={styles.weatherTemp}>{parseFloat(item.forecast.airTemperature).toFixed(0)}°C</Text>
                            )}
                          </View>
                        )}
                        {item.forecast.waterTemperature && (item.forecast.weatherCondition || item.forecast.airTemperature) && (
                          <View style={styles.weatherDivider} />
                        )}
                        {item.forecast.waterTemperature && (
                          <View style={styles.inlineStat}>
                            <Droplets size={13} color="#60A5FA" />
                            <Text style={styles.weatherLabel}>수온</Text>
                            <Text style={styles.weatherTemp}>{parseFloat(item.forecast.waterTemperature).toFixed(0)}°C</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* ── BLOCKED 안전 경고 ── */}
                    {item.levelFit?.[selectedLevel] === 'BLOCKED' && item.safetyReasons && item.safetyReasons.length > 0 && (
                      <View style={styles.safetyRow}>
                        <Text style={styles.safetyText}>⛔ {item.safetyReasons[0]}</Text>
                      </View>
                    )}

                    {/* ── hints 태그 (오프쇼어/짧은주기 등) ── */}
                    {item.hints?.tags && item.hints.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {item.hints.tags.slice(0, 3).map(tag => (
                          <View key={tag} style={[styles.tag, { backgroundColor: getHintTagColor(tag) + '18' }]}>
                            <Text style={[styles.tagText, { color: getHintTagColor(tag) }]}>
                              {getHintTagLabel(tag)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* ── KHOA 정부 서핑지수 (한국 스팟) ── */}
                    {item.khoaEnrichment?.khoaIndex && (
                      <View style={styles.khoaRow}>
                        <KhoaBadge enrichment={item.khoaEnrichment} currentLevel={selectedLevel} compact />
                      </View>
                    )}

                    {/* ── 추천 메시지 ── */}
                    <Text style={styles.recommendation} numberOfLines={2}>
                      {item.hints?.message || item.recommendationKo}
                    </Text>
                  </TouchableOpacity>
                );
              })
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
  // 뷰 토글 — 컴팩트(웹앱 py-1.5/text-xs와 매칭)
  viewToggleBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: colors.primary },
  viewToggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
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
  majorTab: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
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

  // ── 스팟 카드 (웹앱 SpotCard.tsx 디자인과 1:1) ──
  spotCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    /** 그림자 약하게 — 웹앱 shadow-sm과 유사 */
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  /** BLOCKED 카드 — 웹앱 opacity-50 grayscale 모방 (RN은 grayscale 직접 지원 X, opacity로 dim) */
  spotCardBlocked: { opacity: 0.5 },

  /** 기상특보 배너 — 풍랑/태풍은 빨강, 강풍은 주황 */
  alertBanner: {
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  alertBannerDanger: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error + '40',
  },
  alertBannerWarn: {
    backgroundColor: '#E67E2215',
    borderColor: '#E67E2240',
  },
  alertText: { fontSize: 11, fontWeight: '700' },

  /** 날씨/기온/수온 별도 행 (statsRow 아래) */
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  weatherDivider: {
    width: 1, height: 12, backgroundColor: colors.border,
  },
  weatherText: {
    fontSize: 11, fontWeight: '500', color: colors.text,
  },
  weatherLabel: {
    fontSize: 11, color: colors.textTertiary,
  },
  weatherTemp: {
    fontSize: 11, fontWeight: '700', color: colors.text,
  },
  /** 상단 — 좌측 정보 영역 + 우측 점수 원형 */
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTopLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  spotName: {
    ...typography.body1,
    fontWeight: '800',
    color: colors.text,
  },
  spotMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  /** 점수 원형 — 48x48, 등급 색상 배경 */
  scoreCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 16, fontWeight: '900', lineHeight: 18,
  },
  scoreGrade: {
    fontSize: 9, fontWeight: '700', marginTop: 1,
  },

  /** 적합도 배지 (PASS/WARNING) */
  fitBadgeRow: { flexDirection: 'row', marginBottom: spacing.sm },
  fitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fitBadgeText: { fontSize: 10, fontWeight: '700' },

  /**
   * 파고 큰 숫자 + 주기/풍속/조석 인라인 한 줄.
   * RN의 alignItems:'baseline'은 View 안의 아이콘+텍스트 조합에서 정렬이 어긋남
   * → 'center'로 변경하고 inlineStat 줄을 따로 둠 (큰 숫자와 작은 stats 사이 줄바꿈처럼 보이는 문제 해결).
   */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  /** 파고 영역 — 큰 숫자와 단위만 같이 baseline 정렬 */
  waveHeightWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  waveHeightNum: {
    fontSize: 24, fontWeight: '900',
    color: colors.text, lineHeight: 26,
  },
  waveHeightUnit: {
    fontSize: 12, fontWeight: '500',
    color: colors.textTertiary,
  },
  statsDivider: {
    width: 1, height: 16, backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  inlineStat: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  inlineStatText: {
    fontSize: 12, fontWeight: '600',
    color: colors.text,
  },

  /** 안전 경고 — BLOCKED 시에만 */
  safetyRow: {
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  safetyText: { fontSize: 11, color: colors.error, fontWeight: '600' },

  /** hints 태그 (오프쇼어/짧은주기 등) */
  tagRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: '600' },

  /** KHOA 뱃지 행 */
  khoaRow: { marginBottom: 6 },

  /** 추천 메시지 */
  recommendation: {
    fontSize: 12, color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default HomeScreen;
