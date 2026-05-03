// 스팟 상세 화면 — 웹앱 SpotDetailModal과 1:1 동일 구현
// 파도 탭(적합도바+24h차트+스웰/바람) / 기록 탭 (Phase 2: 소통 탭 제거)
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
import { DiaryHelpfulButton } from '../../components/DiaryHelpfulButton';
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
    /** 날씨 (맑음/흐림 등) — 현재 요약 카드에서 표시 */
    weatherCondition?: string | null;
    /** 조석 상태 (RISING/FALLING/HIGH/LOW) */
    tideStatus?: string | null;
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
  user: { id: string; username: string | null; avatarUrl: string | null };
}

interface CommunityPost {
  id: string;
  author: { id: string; username: string | null; avatarUrl: string | null };
  content: string;
  images: { id: string; imageUrl: string }[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ── 유틸 ────────────────────────────────────────────────────

/** 풍향 도수 → 한국어 방위 (16방위) — 웹앱 degToCompass와 동일 */
function degToCompass(deg: number): string {
  if (isNaN(deg) || deg < 0 || deg > 360) return '?';
  const directions = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  return directions[Math.round(deg / 22.5) % 16];
}

/** 풍속 한국어 강도 라벨 */
function getWindStrength(kmh: number): string {
  if (kmh < 5) return '미풍';
  if (kmh < 15) return '약함';
  if (kmh < 25) return '보통';
  if (kmh < 40) return '강함';
  return '매우 강함';
}

/** KHOA 서핑지수 → 색상 (웹앱 SpotDetailModal과 동일) */
function getKhoaIndexColor(index: string): string {
  switch (index) {
    case '매우좋음': return '#10B981';
    case '좋음':     return '#2AAFC6';
    case '보통':     return '#F59E0B';
    case '나쁨':     return '#F97316';
    case '매우나쁨': return '#d4183d';
    default:         return '#95A5A6';
  }
}

/** 날씨 이모지 매핑 — 차트/카드에서 사용 */
function getWeatherEmoji(condition: string | null | undefined): string {
  if (!condition) return '';
  if (condition.includes('맑음')) return '☀️';
  if (condition.includes('비') || condition.includes('소나기')) return '🌧️';
  if (condition.includes('눈')) return '❄️';
  if (condition.includes('흐림')) return '☁️';
  if (condition.includes('구름')) return '⛅';
  return '🌤️';
}
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
const CHART_H = 130;
/** Y축 라벨 공간 — 좌측 38px (조석 "0.6m" 같은 라벨이 그래프와 겹치지 않게), 우측 36px (풍속 km/h용) */
const P = { top: 14, right: 36, bottom: 26, left: 38 };

/** 차트 공통 — X축 시간 라벨 인덱스 (4시간 간격) */
function getLabelIdxs(n: number): number[] {
  const acc: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 4 === 0 || i === n - 1) acc.push(i);
  }
  return acc;
}

/** 차트 공통 — 가로 그리드 Y 좌표 3줄 (0%/50%/100%) */
function getGridYs(top: number, height: number): number[] {
  return [top, top + height * 0.5, top + height];
}

/**
 * 기온/수온 24시간 차트
 * - 기온: 주황 라인
 * - 수온: 파랑 라인
 * - 같은 Y축 사용 (둘 다 °C)
 */
const TempChart: React.FC<{ data: HourlyForecast[] }> = ({ data }) => {
  const airs = data.map(d => Number(d.airTemperature));
  const waters = data.map(d => Number(d.waterTemperature));
  const valid = [...airs, ...waters].filter(v => !isNaN(v) && v !== 0);
  if (valid.length < 2) return null;

  const minT = Math.floor(Math.min(...valid) - 1);
  const maxT = Math.ceil(Math.max(...valid) + 1);
  const range = maxT - minT;
  const n = data.length;
  const iW = CHART_W - P.left - P.right;
  const iH = CHART_H - P.top - P.bottom;

  const xP = (i: number) => P.left + (i / (n - 1)) * iW;
  const yT = (v: number) => P.top + (1 - (v - minT) / range) * iH;

  const buildPath = (vals: number[]) => {
    let d = '';
    let started = false;
    vals.forEach((v, i) => {
      if (isNaN(v) || v === 0) return;
      d += `${started ? 'L' : 'M'}${xP(i).toFixed(1)},${yT(v).toFixed(1)} `;
      started = true;
    });
    return d.trim();
  };

  const airPath = buildPath(airs);
  const waterPath = buildPath(waters);
  const labelIdxs = getLabelIdxs(n);
  const gridYs = getGridYs(P.top, iH);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {gridYs.map((y, i) => (
        <Path key={`g${i}`} d={`M${P.left},${y} L${P.left + iW},${y}`}
          stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,3" />
      ))}
      {airPath && <Path d={airPath} stroke="#E67E22" strokeWidth="2" fill="none" />}
      {waterPath && <Path d={waterPath} stroke="#3498DB" strokeWidth="2" fill="none" />}
      <SvgText x={P.left - 4} y={P.top + 4} fontSize="9" fill={colors.textTertiary} textAnchor="end">
        {maxT}°
      </SvgText>
      <SvgText x={P.left - 4} y={P.top + iH + 3} fontSize="9" fill={colors.textTertiary} textAnchor="end">
        {minT}°
      </SvgText>
      {labelIdxs.map(i => (
        <SvgText key={i} x={xP(i)} y={CHART_H - 4} fontSize="10" fill={colors.textSecondary} textAnchor="middle">
          {new Date(data[i].forecastTime).getHours()}시
        </SvgText>
      ))}
    </Svg>
  );
};

/**
 * 조석 높이 24시간 차트 — 단일 라인 + 영역
 */
const TideChart: React.FC<{ data: HourlyForecast[] }> = ({ data }) => {
  const tides = data.map(d => Number(d.tideHeight));
  const valid = tides.filter(v => !isNaN(v));
  if (valid.length < 2) return null;

  const minT = Math.min(...valid);
  const maxT = Math.max(...valid);
  const range = Math.max(maxT - minT, 0.1);
  const n = data.length;
  const iW = CHART_W - P.left - P.right;
  const iH = CHART_H - P.top - P.bottom;

  const xP = (i: number) => P.left + (i / (n - 1)) * iW;
  const yT = (v: number) => P.top + (1 - (v - minT) / range) * iH;

  const tidePath = tides.map((v, i) =>
    isNaN(v) ? '' : `${i === 0 || isNaN(tides[i - 1]) ? 'M' : 'L'}${xP(i).toFixed(1)},${yT(v).toFixed(1)}`
  ).join(' ');
  const tideArea = tidePath + ` L${xP(n - 1).toFixed(1)},${(P.top + iH).toFixed(1)} L${P.left.toFixed(1)},${(P.top + iH).toFixed(1)} Z`;

  const labelIdxs = getLabelIdxs(n);
  const gridYs = getGridYs(P.top, iH);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {gridYs.map((y, i) => (
        <Path key={`g${i}`} d={`M${P.left},${y} L${P.left + iW},${y}`}
          stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,3" />
      ))}
      <Path d={tideArea} fill="url(#tg)" />
      <Path d={tidePath} stroke="#0EA5E9" strokeWidth="2" fill="none" />
      <SvgText x={P.left - 4} y={P.top + 4} fontSize="9" fill="#0EA5E9" fontWeight="700" textAnchor="end">
        {maxT.toFixed(1)}m
      </SvgText>
      <SvgText x={P.left - 4} y={P.top + iH + 3} fontSize="9" fill={colors.textTertiary} textAnchor="end">
        {minT.toFixed(1)}m
      </SvgText>
      {labelIdxs.map(i => (
        <SvgText key={i} x={xP(i)} y={CHART_H - 4} fontSize="10" fill={colors.textSecondary} textAnchor="middle">
          {new Date(data[i].forecastTime).getHours()}시
        </SvgText>
      ))}
    </Svg>
  );
};

/**
 * 24시간 시간별 예보 차트
 * - 파고: 영역 그래프 (primary 색상)
 * - 풍속: 점선 (초록)
 * - Y축 라벨 좌(파고 m) / 우(풍속 km/h) 표시
 * - X축에 4시간 간격 시간 + 0/12/24시 그리드 라인
 */
const HourlyChart: React.FC<{ data: HourlyForecast[] }> = ({ data }) => {
  if (data.length < 2) return null;

  const waves = data.map(d => Number(d.waveHeight) || 0);
  const winds = data.map(d => Number(d.windSpeed) || 0);
  /**
   * Y축 max를 데이터의 1.15배로 설정 — 위쪽 여백 + 변화 시각화 향상.
   * 이전엔 max(waves, 0.5)라서 작은 파고에서는 답답하게 0~0.5 범위로만 그려짐.
   */
  const maxWave = Math.max(...waves) * 1.15 || 1;
  const maxWind = Math.max(...winds) * 1.15 || 1;
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

  /** 가로 그리드 라인 — 0%, 50%, 100% (max 기준) */
  const gridYs = [P.top, P.top + iH * 0.5, P.top + iH];

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* 가로 그리드 (3줄) */}
      {gridYs.map((y, i) => (
        <Path
          key={`g${i}`}
          d={`M${P.left},${y} L${P.left + iW},${y}`}
          stroke={colors.border}
          strokeWidth="0.5"
          strokeDasharray="2,3"
        />
      ))}

      {/* 파고 영역 + 라인 */}
      <Path d={waveArea} fill="url(#wg2)" />
      <Path d={wavePath} stroke={colors.primary} strokeWidth="2.5" fill="none" />

      {/* 풍속 점선 */}
      <Path d={windPath} stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="4,3" />

      {/* Y축 라벨 좌측 (파고 max m) */}
      <SvgText x={P.left - 4} y={P.top + 4} fontSize="9" fill={colors.primary} fontWeight="700" textAnchor="end">
        {maxWave.toFixed(1)}m
      </SvgText>
      <SvgText x={P.left - 4} y={P.top + iH + 3} fontSize="9" fill={colors.textTertiary} textAnchor="end">
        0
      </SvgText>

      {/* Y축 라벨 우측 (풍속 max km/h) */}
      <SvgText x={CHART_W - P.right + 4} y={P.top + 4} fontSize="9" fill="#22c55e" fontWeight="700" textAnchor="start">
        {maxWind.toFixed(0)}km/h
      </SvgText>

      {/* X축 시간 라벨 */}
      {labelIdxs.map(i => (
        <SvgText key={i} x={xP(i)} y={CHART_H - 4} fontSize="10" fill={colors.textSecondary} textAnchor="middle">
          {new Date(data[i].forecastTime).getHours()}시
        </SvgText>
      ))}
    </Svg>
  );
};

// ── 메인 화면 ─────────────────────────────────────────────────
/** Phase 2: [소통](Posts) 탭 제거 — 다이어리 통합으로 대체 */
type DetailTab = 'wave' | 'diary';

const SpotDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { spotId, spotName } = route.params as { spotId: string; spotName: string };
  const { user, isAuthenticated } = useAuthStore();
  const level = user?.surfLevel || 'BEGINNER';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DetailTab>('wave');

  // ── 예보 데이터 ──────────────────────────────────────────────
  /**
   * level 파라미터 제거 — 사용자 레벨에 안 맞는 스팟(예: BEGINNER가 발리 고급 스팟)도
   * 상세 화면에서는 봐야 함. 레벨 필터는 홈 추천 리스트에만 적용.
   */
  const { data: dashData, isLoading } = useQuery<{ spots: SpotForecast[] }>({
    queryKey: ['dashboard', 'all'],
    queryFn: () => api.get('/dashboard/forecasts').then(r => r.data),
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

  /** Phase 2: 소통 탭 제거 — Posts 조회 비활성화 (코드는 유지, 호출 X) */

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
        {/*
         * 작은 히어로 배경 — 사진이 완전히 없으면 휑한 느낌이라 작은 배너로 분위기.
         * 점수는 아래 탭 헤더에만 표시 (이중 표시 방지).
         */}
        <ImageBackground
          source={getSpotImage(spot.region, spot.name)}
          style={s.heroBanner}
          imageStyle={{ opacity: 0.85 }}
        >
          <View style={s.heroBannerOverlay} />
          <View style={s.heroBannerContent}>
            <Text style={s.heroNameOnImg}>{spot.name}</Text>
            <View style={s.heroMetaRow}>
              <Text style={s.heroRegionOnImg}>{spot.region}</Text>
              <Text style={s.heroDotOnImg}>·</Text>
              <View style={s.diffBadgeOnImg}>
                <Text style={s.diffTextOnImg}>{DIFFICULTY_LABEL[spot.difficulty] || spot.difficulty}</Text>
              </View>
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

        {/* ─── 사용자 평균 평점 (1명 이상일 때만 표시) ─── */}
        {(() => {
          const userRating = Number((spot as any)?.rating ?? 0);
          const ratingCount = (spot as any)?.ratingCount ?? 0;
          if (ratingCount === 0) return null;
          return (
            <View style={s.userRatingBanner}>
              <Text style={s.userRatingStars}>
                {[1, 2, 3, 4, 5].map(i => (i <= Math.round(userRating) ? '★' : '☆')).join('')}
              </Text>
              <Text style={s.userRatingNum}>{userRating.toFixed(1)}</Text>
              <Text style={s.userRatingCount}>
                서퍼 {ratingCount}명 평가{ratingCount === 1 ? ' (참고용)' : ''}
              </Text>
            </View>
          );
        })()}

        {/* ─── 점수 + 3탭 전환 ─── */}
        <View style={s.tabHeader}>
          <View style={s.scoreArea}>
            <Text style={[s.scoreNum, { color: ratingColor }]}>{surfRating}</Text>
            <Text style={[s.scoreLbl, { color: ratingColor }]}>{getRatingLabel(surfRating)}</Text>
          </View>
          <View style={s.tabBar}>
            {([
              { id: 'wave' as DetailTab,  icon: Waves,    label: '파도' },
              { id: 'diary' as DetailTab, icon: BookOpen, label: '기록' },
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
              {/* ── 현재 요약 — 점수 바로 아래 핵심 정보 (웹앱 패턴) ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>📋 현재 요약</Text>
                <View style={{ gap: 8 }}>
                  <View style={s.summaryRow}>
                    <Waves size={15} color="#2ECC71" />
                    <Text style={s.summaryLabel}>스웰</Text>
                    <Text style={s.summaryValue}>
                      {forecast.swellHeight
                        ? `${parseFloat(forecast.swellHeight).toFixed(1)}m @${parseFloat(forecast.swellPeriod || '0').toFixed(0)}s → ${parseFloat(forecast.swellDirection || '0').toFixed(0)}°`
                        : '-'}
                    </Text>
                  </View>
                  <View style={s.summaryRow}>
                    <Wind size={15} color="#22c55e" />
                    <Text style={s.summaryLabel}>바람</Text>
                    <Text style={s.summaryValue}>
                      {parseFloat(forecast.windSpeed).toFixed(0)}km/h · {degToCompass(parseFloat(forecast.windDirection))} ({parseFloat(forecast.windDirection).toFixed(0)}°)
                    </Text>
                  </View>
                  <View style={s.summaryRow}>
                    <Text style={{ fontSize: 14 }}>🌡️</Text>
                    <Text style={s.summaryLabel}>온도</Text>
                    <Text style={s.summaryValue}>
                      기온 {parseFloat(forecast.airTemperature).toFixed(0)}°C · 수온 {parseFloat(forecast.waterTemperature).toFixed(0)}°C
                    </Text>
                  </View>
                  {forecast.weatherCondition && (
                    <View style={s.summaryRow}>
                      <Text style={{ fontSize: 14 }}>{getWeatherEmoji(forecast.weatherCondition)}</Text>
                      <Text style={s.summaryLabel}>날씨</Text>
                      <Text style={s.summaryValue}>{forecast.weatherCondition}</Text>
                    </View>
                  )}
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
                    {/** 풍속 — 점도 함께 표시 (이전엔 점선만 있어 점 없음 지적 반영) */}
                    <View style={[s.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={s.legendTxt}>풍속 (km/h)</Text>
                  </View>
                </View>
                {chartLoading
                  ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                  : hourlyData.length < 2
                    ? <Text style={s.emptyTxt}>차트 데이터 없음</Text>
                    : <HourlyChart data={hourlyData} />
                }
              </View>

              {/* ── 기온/수온 차트 (24h) — 두 라인 (주황=기온, 파랑=수온) ── */}
              {hourlyData.length > 1 && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>🌡️ 기온 / 수온 (24시간)</Text>
                  <View style={s.legend}>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: '#E67E22' }]} />
                      <Text style={s.legendTxt}>기온</Text>
                    </View>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: '#3498DB' }]} />
                      <Text style={s.legendTxt}>수온</Text>
                    </View>
                  </View>
                  <TempChart data={hourlyData} />
                </View>
              )}

              {/* ── 조석 차트 (24h) — tideHeight 있을 때만 ── */}
              {hourlyData.some(h => h.tideHeight != null && !isNaN(Number(h.tideHeight))) && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>🌊 조석 높이 (24시간)</Text>
                  <TideChart data={hourlyData} />
                </View>
              )}

              {/* ── 날씨 타임라인 (24h, 3시간 간격) — 웹앱과 동일 ── */}
              {hourlyData.length > 0 && (() => {
                const timeline = hourlyData
                  .filter((_, i) => i % 3 === 0)
                  .slice(0, 8)
                  .map(h => ({
                    hour: new Date(h.forecastTime).getHours(),
                    label: `${new Date(h.forecastTime).getHours()}시`,
                    emoji: getWeatherEmoji(h.weatherCondition),
                    condition: h.weatherCondition || '',
                  }));
                if (!timeline.some(t => t.emoji)) return null;
                return (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>☁️ 날씨 변화 (24시간)</Text>
                    <View style={s.weatherTimelineRow}>
                      {timeline.map((w, i) => {
                        /** 06~18시는 주간(따뜻한 배경), 그 외 야간(차분한 배경) */
                        const isDaytime = w.hour >= 6 && w.hour < 18;
                        return (
                          <View
                            key={i}
                            style={[
                              s.weatherTimelineItem,
                              { backgroundColor: isDaytime ? '#F59E0B15' : '#64748B15' },
                            ]}
                          >
                            <Text style={s.weatherTimelineEmoji}>{w.emoji || '—'}</Text>
                            <Text style={s.weatherTimelineLabel}>{w.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              {/* ── 예보 상세 — 한 줄씩 라벨+값 (웹앱 패턴, 스캔 빠름) ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>🌊 예보 상세</Text>
                <View style={{ gap: 10 }}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>파고</Text>
                    <Text style={s.detailValue}>{parseFloat(forecast.waveHeight).toFixed(1)}m</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>파도 주기</Text>
                    <Text style={s.detailValue}>{parseFloat(forecast.wavePeriod).toFixed(0)}s</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>풍속</Text>
                    <Text style={s.detailValue}>
                      {parseFloat(forecast.windSpeed).toFixed(0)}km/h
                      <Text style={s.detailSubInline}>  · {getWindStrength(parseFloat(forecast.windSpeed))}</Text>
                    </Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>풍향</Text>
                    <Text style={s.detailValue}>
                      {degToCompass(parseFloat(forecast.windDirection))}
                      <Text style={s.detailSubInline}>  ({parseFloat(forecast.windDirection).toFixed(0)}°)</Text>
                    </Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>수온</Text>
                    <Text style={s.detailValue}>{parseFloat(forecast.waterTemperature).toFixed(1)}°C</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>기온</Text>
                    <Text style={s.detailValue}>{parseFloat(forecast.airTemperature).toFixed(1)}°C</Text>
                  </View>
                  {/* 스웰 정보 — 같은 한 줄 형식으로 통합 */}
                  {forecast.swellHeight && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>스웰</Text>
                      <Text style={s.detailValue}>
                        {parseFloat(forecast.swellHeight).toFixed(1)}m @{parseFloat(forecast.swellPeriod || '0').toFixed(0)}s
                        <Text style={s.detailSubInline}> → {degToCompass(parseFloat(forecast.swellDirection || '0'))} {parseFloat(forecast.swellDirection || '0').toFixed(0)}°</Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── 국립해양조사원 실측 데이터 카드 (한국 스팟 전용, 웹앱 인라인 패턴) ── */}
              {khoaEnrichment?.khoaIndex && (
                <View style={s.card}>
                  {/* 헤더 + 레벨별 지수 배지 */}
                  <View style={s.khoaHeaderRow}>
                    <Text style={s.cardTitle}>🏛 국립해양조사원 실측</Text>
                    <View style={s.khoaLevelRow}>
                      {[
                        { label: '초급', value: khoaEnrichment.beginnerIndex },
                        { label: '중급', value: khoaEnrichment.intermediateIndex },
                        { label: '상급', value: khoaEnrichment.advancedIndex },
                      ].filter(l => l.value).map(l => {
                        const c = getKhoaIndexColor(l.value!);
                        return (
                          <View key={l.label} style={[s.khoaLevelBadge, { backgroundColor: c + '20' }]}>
                            <Text style={[s.khoaLevelText, { color: c }]}>{l.label} {l.value}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* 파고 비교 — Open-Meteo vs KHOA */}
                  {khoaEnrichment.khoaWaveHeight !== null && (
                    <View style={s.khoaCompareBox}>
                      <Text style={s.khoaCompareLabel}>파고 비교 (연안 보정)</Text>
                      <View style={s.khoaCompareRow}>
                        <View style={s.khoaCompareSide}>
                          <Text style={s.khoaCompareSubLbl}>Open-Meteo</Text>
                          <Text style={s.khoaCompareNumDim}>
                            {parseFloat(forecast.waveHeight).toFixed(1)}<Text style={s.khoaCompareUnit}>m</Text>
                          </Text>
                          <Text style={s.khoaCompareSubLbl}>외해 예보</Text>
                        </View>
                        <View style={s.khoaCompareArrow}>
                          <Text style={s.khoaCompareArrowText}>→</Text>
                          {khoaEnrichment.waveHeightRatio !== null && khoaEnrichment.waveHeightRatio > 0 && (
                            <Text style={s.khoaCompareRatio}>×{khoaEnrichment.waveHeightRatio.toFixed(2)}</Text>
                          )}
                        </View>
                        <View style={s.khoaCompareSide}>
                          <Text style={s.khoaCompareSubLbl}>KHOA 실측</Text>
                          <Text style={[s.khoaCompareNum, { color: '#10B981' }]}>
                            {khoaEnrichment.khoaWaveHeight.toFixed(1)}<Text style={s.khoaCompareUnit}>m</Text>
                          </Text>
                          <Text style={s.khoaCompareSubLbl}>연안 실측</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 기타 KHOA 수치 — 파주기/풍속/수온 */}
                  <View style={s.khoaStatsRow}>
                    {khoaEnrichment.khoaWavePeriod !== null && (
                      <View style={s.khoaStatItem}>
                        <Text style={s.khoaStatVal}>{khoaEnrichment.khoaWavePeriod.toFixed(1)}s</Text>
                        <Text style={s.khoaStatLbl}>파주기</Text>
                      </View>
                    )}
                    {khoaEnrichment.khoaWindSpeed !== null && (
                      <View style={s.khoaStatItem}>
                        <Text style={s.khoaStatVal}>{khoaEnrichment.khoaWindSpeed.toFixed(1)}m/s</Text>
                        <Text style={s.khoaStatLbl}>풍속</Text>
                      </View>
                    )}
                    {khoaEnrichment.khoaWaterTemperature !== null && (
                      <View style={s.khoaStatItem}>
                        <Text style={s.khoaStatVal}>{khoaEnrichment.khoaWaterTemperature.toFixed(1)}°C</Text>
                        <Text style={s.khoaStatLbl}>수온</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 현재 요약은 상단(점수 바로 아래)으로 이동됨 — 중복 제거 */}

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

              {/* AI 추천 코멘트는 제거 — 현재 요약/적합도 분석/hints에 이미 정보가 충분히 표시되어 중복 */}

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
                      <Avatar name={d.user.username || '?'} uri={d.user.avatarUrl || undefined} size="sm" />
                      <Text style={s.diaryNick}>{d.user.username || '알 수 없음'}</Text>
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

                  {/* 도움됐어요 + 댓글 토글 (Phase 2C) */}
                  <DiaryHelpfulButton diaryId={d.id} />
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

  // 안전 경고 — 탭 헤더와 간격 추가 (이전엔 붙어있어서 답답)
  safetyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm, borderRadius: 10, borderWidth: 1,
  },
  safetyText: { fontSize: 12, fontWeight: '600' },

  // 사용자 평균 평점 배너 — 1명 이상일 때만 표시
  userRatingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    backgroundColor: '#FFFBEB', // 노란 배경
    borderRadius: 10,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  userRatingStars: { fontSize: 16, color: '#FCD34D', letterSpacing: 1 },
  userRatingNum: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  userRatingCount: { fontSize: 11, color: colors.textSecondary, marginLeft: 'auto' },

  // 탭 헤더 — 이미지 배너 아래 점수 + 3탭. 점수는 여기에만 (이중 표시 방지)
  tabHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
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
  /** 점선 범례 — 차트의 풍속 점선과 일치 */
  legendDash: { width: 14, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  legendTxt: { fontSize: 11, color: colors.textSecondary },

  /** 현재 요약 행 — 아이콘 + 라벨 + 값 한 줄 */
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  summaryValue: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.text, fontWeight: '500' },

  /** 예보 상세 — 한 줄 라벨+값 (웹앱 패턴) */
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '700', textAlign: 'right' },
  detailSubInline: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },

  /** ── 히어로 배너 (작은 이미지) — 점수는 아래 탭 영역에만 표시 ── */
  heroBanner: { height: 120 },
  heroBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroBannerContent: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  heroNameOnImg: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroRegionOnImg: { fontSize: 12, color: '#fff', opacity: 0.9 },
  heroDotOnImg: { fontSize: 12, color: '#fff', opacity: 0.6 },
  diffBadgeOnImg: {
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4,
  },
  diffTextOnImg: { fontSize: 10, color: '#fff', fontWeight: '700' },

  /** ── KHOA 실측 카드 ── */
  khoaHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  khoaLevelRow: { flexDirection: 'row', gap: 4 },
  khoaLevelBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  khoaLevelText: { fontSize: 10, fontWeight: '700' },

  /** 파고 비교 박스 — Open-Meteo vs KHOA */
  khoaCompareBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  khoaCompareLabel: {
    fontSize: 11, color: colors.textSecondary, marginBottom: 8,
  },
  khoaCompareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  khoaCompareSide: { flex: 1, alignItems: 'center' },
  khoaCompareSubLbl: { fontSize: 10, color: colors.textTertiary },
  khoaCompareNumDim: {
    fontSize: 22, fontWeight: '900', color: colors.textSecondary,
    marginVertical: 2,
  },
  khoaCompareNum: {
    fontSize: 22, fontWeight: '900', marginVertical: 2,
  },
  khoaCompareUnit: { fontSize: 11, fontWeight: '500' },
  khoaCompareArrow: { alignItems: 'center', justifyContent: 'center' },
  khoaCompareArrowText: { fontSize: 18, color: colors.textSecondary },
  khoaCompareRatio: { fontSize: 10, fontWeight: '700', color: '#10B981', marginTop: 2 },

  /** KHOA 기타 수치 (파주기/풍속/수온) */
  khoaStatsRow: { flexDirection: 'row', gap: 6 },
  khoaStatItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.surfaceSecondary, borderRadius: 8,
    paddingVertical: 8,
  },
  khoaStatVal: { fontSize: 13, fontWeight: '700', color: colors.text },
  khoaStatLbl: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  /** 날씨 타임라인 — 8개 박스(3시간 간격) 가로 배열 */
  weatherTimelineRow: { flexDirection: 'row', gap: 4 },
  weatherTimelineItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8,
  },
  weatherTimelineEmoji: { fontSize: 18, marginBottom: 2 },
  weatherTimelineLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '500' },
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
  /** 보조 텍스트 — 풍향 도수("188°") / 스웰 방향 도수 등 dataVal 아래 작게 */
  dataSub: { fontSize: 10, color: colors.textTertiary, marginTop: 1 },
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
