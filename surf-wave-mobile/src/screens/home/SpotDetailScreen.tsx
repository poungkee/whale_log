// 스팟 상세 화면 — 웹앱 SpotDetailModal과 1:1 동일 구현
// 파도 탭(적합도바+24h차트+스웰/바람) / 소통 탭 / 기록 탭
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, ImageBackground, Alert, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft, Heart, ThumbsUp, ThumbsDown, Waves, Wind,
  BookOpen, MessageCircle, AlertTriangle, MapPin, Clock, Star,
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../../components/common/Avatar';
import KhoaBadge, { KhoaEnrichment } from '../../components/spot/KhoaBadge';

// HomeStack과 ExploreStack 둘 다 동일한 파라미터 구조 사용
type Props = NativeStackScreenProps<any, 'SpotDetail'>;

// ── 타입 ────────────────────────────────────────────────────
interface RatingDetail {
  waveFit: number; periodFit: number; swellFit: number;
  windSpeedFit: number; windDirFit: number;
}

interface SpotForecast {
  spot: { id: string; name: string; region: string; difficulty: string };
  forecast: {
    waveHeight: string; wavePeriod: string; windSpeed: string;
    windDirection: string; waterTemperature: string; airTemperature: string;
    swellHeight?: string; swellPeriod?: string; swellDirection?: string;
  };
  surfRating: number;
  recommendationKo: string;
  simpleCondition: { waveStatus: string; windStatus: string; overall: string };
  detail?: RatingDetail;
  safetyReasons?: string[];
  hints?: { message: string; tags: string[] }[];
  levelFit?: Record<string, string>;
  khoaEnrichment?: KhoaEnrichment;
}

interface HourlyForecast {
  forecastTime: string;
  waveHeight: string | number;
  windSpeed: string | number;
  tideHeight?: string | number;
  airTemperature?: string | number;
  waterTemperature?: string | number;
  weatherCondition?: string;
}

interface PublicDiary {
  id: string;
  surfDate: string;
  surfTime: string | null;
  boardType: string;
  durationMinutes?: number;
  satisfaction: number;
  memo: string | null;
  user: { id: string; nickname: string; avatarUrl: string | null };
}

interface CommunityPost {
  id: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
  content: string;
  images: { id: string; imageUrl: string }[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ── 유틸 ────────────────────────────────────────────────────
const getSpotImage = (region: string, name: string) => {
  const r = region.toLowerCase();
  const n = name.toLowerCase();
  if (r.includes('bali')) return require('../../../assets/images/spots/bali.jpg');
  if (r.includes('제주')) return require('../../../assets/images/spots/jeju.jpg');
  if (r.includes('동해') || r.includes('gangwon') || r.includes('강원'))
    return require('../../../assets/images/spots/donghai.jpg');
  if (r.includes('남해') || r.includes('busan') || r.includes('부산'))
    return require('../../../assets/images/spots/namhae.jpg');
  const w = [
    require('../../../assets/images/spots/wave1.jpg'),
    require('../../../assets/images/spots/wave2.jpg'),
    require('../../../assets/images/spots/wave3.jpg'),
    require('../../../assets/images/spots/wave4.jpg'),
    require('../../../assets/images/spots/wave5.jpg'),
  ];
  return w[name.charCodeAt(0) % 5];
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

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: '입문', INTERMEDIATE: '초급', ADVANCED: '중급', EXPERT: '고급',
};

const BOARD_EMOJI: Record<string, string> = {
  LONGBOARD: '🏄', FUNBOARD: '🛹', MIDLENGTH: '🏄‍♂️', FISH: '🐟',
  SHORTBOARD: '🏄‍♀️', SUP: '🚣', BODYBOARD: '🤸', FOILBOARD: '🪁', SOFTBOARD: '🏖️',
};

const SAT_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😊', 4: '😄', 5: '🤩' };

const relTime = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

// 5개 적합도 바 항목 — 웹앱 FIT_LABELS와 동일
const FIT_LABELS: { key: keyof RatingDetail; label: string; color: string }[] = [
  { key: 'waveFit',      label: '파고 적합도', color: '#2ECC71' },
  { key: 'periodFit',    label: '주기 적합도', color: '#82E0AA' },
  { key: 'swellFit',     label: '스웰 방향',   color: '#9B59B6' },
  { key: 'windSpeedFit', label: '바람 세기',   color: '#F1C40F' },
  { key: 'windDirFit',   label: '바람 방향',   color: '#E67E22' },
];

// ── 24h SVG 차트 ─────────────────────────────────────────────
const SCR_W = Dimensions.get('window').width;
const CHART_W = SCR_W - spacing.lg * 2 - spacing.md * 2; // 카드 안쪽 여백 반영
const CHART_H = 110;
const P = { top: 14, right: 6, bottom: 24, left: 30 };

const HourlyChart: React.FC<{ data: HourlyForecast[] }> = ({ data }) => {
  if (data.length < 2) return null;

  const waves = data.map(d => Number(d.waveHeight) || 0);
  const winds = data.map(d => Number(d.windSpeed) || 0);
  const maxWave = Math.max(...waves, 0.5);
  const maxWind = Math.max(...winds, 1);
  const n = data.length;
  const iW = CHART_W - P.left - P.right;
  const iH = CHART_H - P.top - P.bottom;

  const xP = (i: number) => P.left + (i / (n - 1)) * iW;
  const yW = (v: number) => P.top + (1 - v / maxWave) * iH;
  const yWi = (v: number) => P.top + (1 - v / maxWind) * iH;

  const wavePath = waves.map((v, i) => `${i === 0 ? 'M' : 'L'}${xP(i).toFixed(1)},${yW(v).toFixed(1)}`).join(' ');
  const waveArea = wavePath + ` L${xP(n - 1).toFixed(1)},${(P.top + iH).toFixed(1)} L${P.left.toFixed(1)},${(P.top + iH).toFixed(1)} Z`;
  const windPath = winds.map((v, i) => `${i === 0 ? 'M' : 'L'}${xP(i).toFixed(1)},${yWi(v).toFixed(1)}`).join(' ');

  const labelIdxs = data.reduce<number[]>((acc, _, i) => {
    if (i % 4 === 0 || i === n - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={waveArea} fill="url(#wg2)" />
      <Path d={wavePath} stroke={colors.primary} strokeWidth="2" fill="none" />
      <Path d={windPath} stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="4,3" />
      <SvgText x={P.left - 3} y={P.top + 4} fontSize="9" fill={colors.textSecondary} textAnchor="end">
        {maxWave.toFixed(1)}m
      </SvgText>
      {labelIdxs.map(i => (
        <SvgText key={i} x={xP(i)} y={CHART_H - 5} fontSize="9" fill={colors.textSecondary} textAnchor="middle">
          {new Date(data[i].forecastTime).getHours()}시
        </SvgText>
      ))}
    </Svg>
  );
};

// ── 메인 화면 ─────────────────────────────────────────────────
type DetailTab = 'wave' | 'community' | 'diary';

const SpotDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { spotId, spotName } = route.params as { spotId: string; spotName: string };
  const { user, isAuthenticated } = useAuthStore();
  const level = user?.surfLevel || 'BEGINNER';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DetailTab>('wave');

  // ── 예보 데이터 ──────────────────────────────────────────────
  const { data: dashData, isLoading } = useQuery<{ spots: SpotForecast[] }>({
    queryKey: ['dashboard', level],
    queryFn: () => api.get('/dashboard/forecasts', { params: { level } }).then(r => r.data),
    staleTime: 15 * 60 * 1000,
  });
  const spotData = dashData?.spots.find(s => s.spot.id === spotId);

  // ── 24h 시간별 예보 ────────────────────────────────────────
  const [hourlyData, setHourlyData] = useState<HourlyForecast[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    setChartLoading(true);
    api.get(`/spots/${spotId}/forecast?hours=24`)
      .then(r => setHourlyData(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [spotId]);

  // ── 즐겨찾기 ─────────────────────────────────────────────
  const { data: favStatus } = useQuery<{ isFavorited: boolean }>({
    queryKey: ['favorite', spotId],
    queryFn: () => api.get(`/spots/${spotId}/favorite`).then(r => r.data),
    retry: false, enabled: isAuthenticated,
  });
  const isFavorited = favStatus?.isFavorited ?? false;

  const favMutation = useMutation({
    mutationFn: (isFav: boolean) =>
      isFav ? api.delete(`/spots/${spotId}/favorite`) : api.post(`/spots/${spotId}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', spotId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // ── 투표 ─────────────────────────────────────────────────
  const { data: voteStatus } = useQuery<{ good: number; bad: number; myVote: 'GOOD' | 'BAD' | null }>({
    queryKey: ['vote', spotId],
    queryFn: () => api.get(`/spots/${spotId}/votes`).then(r => r.data),
    retry: false,
  });

  const voteMutation = useMutation({
    mutationFn: (type: 'GOOD' | 'BAD') =>
      api.post(`/spots/${spotId}/votes`, { voteType: type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vote', spotId] }),
  });

  // ── 공개 다이어리 (기록 탭) ───────────────────────────────
  const [diaries, setDiaries] = useState<PublicDiary[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryPage, setDiaryPage] = useState(1);
  const [diaryHasMore, setDiaryHasMore] = useState(false);
  const [diaryLoaded, setDiaryLoaded] = useState(false);

  const fetchDiaries = useCallback(async (page: number, append = false) => {
    setDiaryLoading(true);
    try {
      const r = await api.get(`/diary/public?spotId=${spotId}&page=${page}&limit=10`);
      const items: PublicDiary[] = r.data?.data ?? [];
      const meta = r.data?.meta ?? {};
      setDiaries(prev => append ? [...prev, ...items] : items);
      setDiaryHasMore(meta.hasNext ?? false);
      setDiaryPage(page);
      setDiaryLoaded(true);
    } catch { setDiaryLoaded(true); }
    finally { setDiaryLoading(false); }
  }, [spotId]);

  useEffect(() => {
    if (activeTab === 'diary' && !diaryLoaded) fetchDiaries(1);
  }, [activeTab, diaryLoaded, fetchDiaries]);

  // ── 커뮤니티 피드 (소통 탭) ───────────────────────────────
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postLoaded, setPostLoaded] = useState(false);

  const fetchPosts = useCallback(async () => {
    setPostLoading(true);
    try {
      const r = await api.get(`/community/posts?spotId=${spotId}&page=1&limit=15`);
      const raw = r.data;
      setPosts(Array.isArray(raw) ? raw : (raw.data ?? []));
      setPostLoaded(true);
    } catch { setPostLoaded(true); }
    finally { setPostLoading(false); }
  }, [spotId]);

  useEffect(() => {
    if (activeTab === 'community' && !postLoaded) fetchPosts();
  }, [activeTab, postLoaded, fetchPosts]);

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/community/posts/${id}/like`),
    onSuccess: () => fetchPosts(),
  });

  // ── 렌더링 ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.navHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>{spotName}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingTxt}>예보 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!spotData) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.navHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>{spotName}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}>
          <Text style={s.loadingTxt}>예보 데이터를 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { spot, forecast, surfRating, recommendationKo, simpleCondition, detail, safetyReasons, hints, levelFit, khoaEnrichment } = spotData;
  const ratingColor = getRatingColor(surfRating);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* ─── 헤더 ─── */}
      <View style={s.navHeader}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{spot.name}</Text>
        <TouchableOpacity
          style={s.favBtn}
          onPress={() => {
            if (!isAuthenticated) { Alert.alert('로그인 필요', '로그인 후 이용해주세요.'); return; }
            favMutation.mutate(isFavorited);
          }}
          disabled={favMutation.isPending}
        >
          <Heart size={20} color={isFavorited ? colors.accent : colors.textTertiary} fill={isFavorited ? colors.accent : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── 히어로 이미지 ─── */}
        <ImageBackground source={getSpotImage(spot.region, spot.name)} style={s.hero} imageStyle={{}}>
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <View style={s.heroLeft}>
              <Text style={s.heroName}>{spot.name}</Text>
              <Text style={s.heroRegion}>{spot.region}</Text>
              <View style={s.diffBadge}>
                <Text style={s.diffText}>{DIFFICULTY_LABEL[spot.difficulty] || spot.difficulty}</Text>
              </View>
            </View>
            <View style={[s.ratingCircle, { backgroundColor: ratingColor }]}>
              <Text style={s.ratingNum}>{surfRating}</Text>
              <Text style={s.ratingLbl}>{getRatingLabel(surfRating)}</Text>
            </View>
          </View>
        </ImageBackground>

        {/* ─── 안전 경고 배너 ─── */}
        {safetyReasons && safetyReasons.length > 0 && (
          <View style={[s.safetyBanner, { backgroundColor: '#E74C3C18', borderColor: '#E74C3C40' }]}>
            <AlertTriangle size={14} color="#E74C3C" />
            <View style={{ flex: 1 }}>
              {safetyReasons.map((r, i) => (
                <Text key={i} style={[s.safetyText, { color: '#E74C3C' }]}>{r}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ─── 점수 + 3탭 전환 ─── */}
        <View style={s.tabHeader}>
          <View style={s.scoreArea}>
            <Text style={[s.scoreNum, { color: ratingColor }]}>{surfRating}</Text>
            <Text style={[s.scoreLbl, { color: ratingColor }]}>{getRatingLabel(surfRating)}</Text>
          </View>
          <View style={s.tabBar}>
            {([
              { id: 'wave' as DetailTab,      icon: Waves,          label: '파도' },
              { id: 'community' as DetailTab, icon: MessageCircle,  label: '소통' },
              { id: 'diary' as DetailTab,     icon: BookOpen,       label: '기록' },
            ]).map(({ id, icon: Icon, label }) => (
              <TouchableOpacity
                key={id}
                style={[s.tabBtn, activeTab === id && s.tabBtnActive]}
                onPress={() => setActiveTab(id)}
              >
                <Icon size={13} color={activeTab === id ? '#fff' : colors.textSecondary} />
                <Text style={[s.tabBtnText, activeTab === id && s.tabBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.body}>
          {/* ═══════════════ 파도 탭 ═══════════════ */}
          {activeTab === 'wave' && (
            <>
              {/* 현재 컨디션 칩 */}
              <View style={s.condRow}>
                <View style={s.condChip}>
                  <Text style={s.condLbl}>파도</Text>
                  <Text style={s.condVal}>{simpleCondition.waveStatus}</Text>
                </View>
                <View style={s.condChip}>
                  <Text style={s.condLbl}>바람</Text>
                  <Text style={s.condVal}>{simpleCondition.windStatus}</Text>
                </View>
                <View style={[s.condChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                  <Text style={s.condLbl}>종합</Text>
                  <Text style={[s.condVal, { color: colors.primary }]}>{simpleCondition.overall}</Text>
                </View>
              </View>

              {/* 적합도 바 차트 (detail 있을 때만) */}
              {detail && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>🎯 적합도 분석</Text>
                  <View style={{ gap: 10 }}>
                    {FIT_LABELS.map(({ key, label, color }) => {
                      const val = detail[key] ?? 0;
                      return (
                        <View key={key}>
                          <View style={s.fitRow}>
                            <Text style={s.fitLabel}>{label}</Text>
                            <Text style={[s.fitVal, { color }]}>{val.toFixed(1)}</Text>
                          </View>
                          <View style={s.fitTrack}>
                            <View style={[s.fitBar, { width: `${(val / 10) * 100}%` as any, backgroundColor: color }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 24h 파도 차트 */}
              <View style={s.card}>
                <Text style={s.cardTitle}>📈 시간별 예보 (24h)</Text>
                <View style={s.legend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={s.legendTxt}>파고 (m)</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={s.legendTxt}>풍속 (m/s)</Text>
                  </View>
                </View>
                {chartLoading
                  ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                  : hourlyData.length < 2
                    ? <Text style={s.emptyTxt}>차트 데이터 없음</Text>
                    : <HourlyChart data={hourlyData} />
                }
              </View>

              {/* 예보 데이터 6개 그리드 */}
              <View style={s.card}>
                <Text style={s.cardTitle}>🌊 예보 상세</Text>
                <View style={s.dataGrid}>
                  {[
                    { label: '파고', value: `${parseFloat(forecast.waveHeight).toFixed(1)}m` },
                    { label: '파도 주기', value: `${parseFloat(forecast.wavePeriod).toFixed(0)}s` },
                    { label: '풍속', value: `${parseFloat(forecast.windSpeed).toFixed(0)}km/h` },
                    { label: '풍향', value: forecast.windDirection },
                    { label: '수온', value: `${parseFloat(forecast.waterTemperature).toFixed(0)}°C` },
                    { label: '기온', value: `${parseFloat(forecast.airTemperature).toFixed(0)}°C` },
                  ].map(({ label, value }) => (
                    <View key={label} style={s.dataItem}>
                      <Text style={s.dataVal}>{value}</Text>
                      <Text style={s.dataLbl}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* KHOA 정부 서핑지수 카드 (한국 스팟만) */}
              {khoaEnrichment?.khoaIndex && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>🏛 정부 서핑지수</Text>
                  <KhoaBadge enrichment={khoaEnrichment} currentLevel={undefined} />
                </View>
              )}

              {/* hints 태그 */}
              {hints && hints.length > 0 && (
                <View style={s.card}>
                  {hints.map((h, i) => (
                    <View key={i} style={s.hintRow}>
                      <Text style={s.hintMsg}>{h.message}</Text>
                      <View style={s.hintTags}>
                        {h.tags.map(tag => (
                          <View key={tag} style={s.hintTag}>
                            <Text style={s.hintTagTxt}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* AI 추천 코멘트 */}
              <View style={[s.card, { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }]}>
                <Text style={{ fontSize: 18 }}>💬</Text>
                <Text style={s.recommendTxt}>{recommendationKo}</Text>
              </View>

              {/* 투표 */}
              <View style={s.card}>
                <Text style={s.cardTitle}>오늘 컨디션 어때요?</Text>
                <View style={s.voteRow}>
                  <TouchableOpacity
                    style={[s.voteBtn, voteStatus?.myVote === 'GOOD' && s.voteBtnGood]}
                    onPress={() => {
                      if (!isAuthenticated) { Alert.alert('로그인 필요'); return; }
                      voteMutation.mutate('GOOD');
                    }}
                  >
                    <ThumbsUp size={18} color={voteStatus?.myVote === 'GOOD' ? colors.success : colors.textSecondary} />
                    <Text style={[s.voteTxt, voteStatus?.myVote === 'GOOD' && { color: colors.success }]}>
                      좋음 {voteStatus?.good ?? 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.voteBtn, voteStatus?.myVote === 'BAD' && s.voteBtnBad]}
                    onPress={() => {
                      if (!isAuthenticated) { Alert.alert('로그인 필요'); return; }
                      voteMutation.mutate('BAD');
                    }}
                  >
                    <ThumbsDown size={18} color={voteStatus?.myVote === 'BAD' ? colors.error : colors.textSecondary} />
                    <Text style={[s.voteTxt, voteStatus?.myVote === 'BAD' && { color: colors.error }]}>
                      별로 {voteStatus?.bad ?? 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ═══════════════ 소통 탭 ═══════════════ */}
          {activeTab === 'community' && (
            <>
              {postLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
              {!postLoading && posts.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>💬</Text>
                  <Text style={s.emptyTitle}>아직 게시글이 없어요</Text>
                  <Text style={s.emptySub}>이 스팟에 대한 첫 번째 이야기를 남겨보세요!</Text>
                </View>
              )}
              {posts.map(post => (
                <View key={post.id} style={s.feedCard}>
                  <View style={s.feedAuthorRow}>
                    <Avatar name={post.author.nickname} uri={post.author.avatarUrl || undefined} size="sm" />
                    <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                      <Text style={s.feedNick}>{post.author.nickname}</Text>
                      <Text style={s.feedTime}>{relTime(post.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={s.feedBody}>{post.content}</Text>
                  {post.images.length > 0 && (
                    <Image source={{ uri: post.images[0].imageUrl }} style={s.feedImg} />
                  )}
                  <View style={s.feedActions}>
                    <TouchableOpacity
                      style={s.feedAction}
                      onPress={() => {
                        if (!isAuthenticated) { Alert.alert('로그인 필요'); return; }
                        likeMutation.mutate(post.id);
                      }}
                    >
                      <Text style={[s.feedActionTxt, post.isLiked && { color: colors.error }]}>
                        {post.isLiked ? '❤️' : '🤍'} {post.likeCount}
                      </Text>
                    </TouchableOpacity>
                    <Text style={s.feedActionTxt}>💬 {post.commentCount}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ═══════════════ 기록 탭 ═══════════════ */}
          {activeTab === 'diary' && (
            <>
              {diaryLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
              {!diaryLoading && diaries.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>📖</Text>
                  <Text style={s.emptyTitle}>서핑 기록이 없어요</Text>
                  <Text style={s.emptySub}>이 스팟에서 서핑한 기록을 남겨보세요!</Text>
                </View>
              )}
              {diaries.map(d => (
                <View key={d.id} style={s.diaryCard}>
                  <View style={s.diaryHeader}>
                    <View style={s.diaryAuthorRow}>
                      <Avatar name={d.user.nickname} uri={d.user.avatarUrl || undefined} size="sm" />
                      <Text style={s.diaryNick}>{d.user.nickname}</Text>
                    </View>
                    <Text style={s.diarySat}>{SAT_EMOJI[d.satisfaction] ?? '😊'}</Text>
                  </View>
                  <View style={s.diaryMetaRow}>
                    <View style={s.boardChip}>
                      <Text style={s.boardChipTxt}>
                        {BOARD_EMOJI[d.boardType] ?? '🏄'} {d.boardType}
                      </Text>
                    </View>
                    {d.durationMinutes && (
                      <Text style={s.diaryMeta}>⏱ {d.durationMinutes}분</Text>
                    )}
                    {d.surfTime && (
                      <Text style={s.diaryMeta}>🕐 {d.surfTime}</Text>
                    )}
                    <Text style={s.diaryMeta}>
                      {new Date(d.surfDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  {d.memo && <Text style={s.diaryMemo} numberOfLines={3}>{d.memo}</Text>}
                </View>
              ))}
              {diaryHasMore && (
                <TouchableOpacity style={s.moreBtn} onPress={() => fetchDiaries(diaryPage + 1, true)}>
                  <Text style={s.moreBtnTxt}>더보기</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SpotDetailScreen;

// ── 스타일 ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingTxt: { ...typography.body2, color: colors.textSecondary },

  // 헤더
  navHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  navTitle: { flex: 1, textAlign: 'center', ...typography.body1, fontWeight: '700', color: colors.text },
  favBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // 히어로 이미지
  hero: { height: 180 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroContent: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', padding: spacing.lg,
  },
  heroLeft: { flex: 1, marginRight: spacing.sm },
  heroName: { ...typography.h2, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroRegion: { ...typography.body2, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.sm },
  diffBadge: {
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  diffText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  ratingCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  ratingNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  ratingLbl: { fontSize: 10, color: '#fff', fontWeight: '600' },

  // 안전 경고
  safetyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    padding: spacing.sm, borderRadius: 10, borderWidth: 1,
  },
  safetyText: { fontSize: 12, fontWeight: '600' },

  // 탭 헤더
  tabHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  scoreArea: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNum: { fontSize: 28, fontWeight: '900' },
  scoreLbl: { fontSize: 13, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surfaceSecondary,
    borderRadius: 10, padding: 3, gap: 2,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabBtnTextActive: { color: '#fff' },

  // 탭 본문
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },

  // 현재 컨디션
  condRow: { flexDirection: 'row', gap: spacing.sm },
  condChip: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  condLbl: { fontSize: 11, color: colors.textTertiary },
  condVal: { ...typography.body2, fontWeight: '700', color: colors.text },

  // 공통 카드
  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  cardTitle: { ...typography.body2, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  // 적합도 바
  fitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fitLabel: { fontSize: 12, color: colors.textSecondary },
  fitVal: { fontSize: 12, fontWeight: '700' },
  fitTrack: {
    height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden',
  },
  fitBar: { height: '100%', borderRadius: 4 },

  // 차트 범례
  legend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, color: colors.textSecondary },
  emptyTxt: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', paddingVertical: 16 },

  // 예보 그리드
  dataGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  dataItem: {
    width: '30%', alignItems: 'center', gap: 3,
    backgroundColor: colors.background, borderRadius: 10,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  dataVal: { ...typography.body1, fontWeight: '700', color: colors.text },
  dataLbl: { fontSize: 11, color: colors.textSecondary },

  // hints
  hintRow: { marginBottom: spacing.xs },
  hintMsg: { ...typography.body2, color: colors.text, marginBottom: 4 },
  hintTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  hintTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primary + '15', borderRadius: 10,
  },
  hintTagTxt: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  // AI 추천
  recommendTxt: { flex: 1, ...typography.body2, color: colors.textSecondary, lineHeight: 22 },

  // 투표
  voteRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  voteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 12,
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  voteBtnGood: { backgroundColor: colors.success + '15', borderColor: colors.success + '50' },
  voteBtnBad: { backgroundColor: colors.error + '15', borderColor: colors.error + '50' },
  voteTxt: { ...typography.body2, fontWeight: '600', color: colors.textSecondary },

  // 커뮤니티 피드 카드
  feedCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  feedAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  feedNick: { ...typography.body2, fontWeight: '700', color: colors.text },
  feedTime: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  feedBody: { ...typography.body2, color: colors.text, lineHeight: 20, marginBottom: spacing.sm },
  feedImg: { width: '100%', height: 160, borderRadius: 10, marginBottom: spacing.sm },
  feedActions: { flexDirection: 'row', gap: spacing.lg },
  feedAction: { flexDirection: 'row', alignItems: 'center' },
  feedActionTxt: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

  // 다이어리 카드
  diaryCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  diaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  diaryAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  diaryNick: { ...typography.body2, fontWeight: '700', color: colors.text },
  diarySat: { fontSize: 22 },
  diaryMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
  boardChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primary + '15', borderRadius: 8,
  },
  boardChipTxt: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  diaryMeta: { ...typography.caption, color: colors.textSecondary },
  diaryMemo: { ...typography.body2, color: colors.textSecondary, lineHeight: 20 },

  // 빈 상태
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  emptySub: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },

  // 더보기
  moreBtn: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs,
  },
  moreBtnTxt: { ...typography.body2, color: colors.primary, fontWeight: '700' },
});
