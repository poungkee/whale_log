// 다이어리 상세 화면 — 서핑 일기 내용 표시 + 24h 파도 차트 + 수정/삭제
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, Clock, Edit2, Trash2, Star, Wind } from 'lucide-react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { DiaryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'DiaryDetail'>;

const BOARD_LABEL: Record<string, string> = {
  LONGBOARD: '롱보드', SHORTBOARD: '숏보드', FISH: '피시',
  FUNBOARD: '펀보드', SUP: 'SUP', MIDLENGTH: '미드렝스',
  BODYBOARD: '바디보드', FOILBOARD: '포일보드', SOFTBOARD: '소프트보드',
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 24h 파도/바람 차트 (SVG 직접 그리기)
interface ForecastPoint {
  time: string;
  waveHeight: number | string;
  windSpeed: number | string;
}

interface WaveChartProps {
  data: ForecastPoint[];
}

const CHART_W = Dimensions.get('window').width - spacing.lg * 2 - 32;
const CHART_H = 120;
const PAD = { top: 16, right: 8, bottom: 28, left: 28 };

const WaveChart: React.FC<WaveChartProps> = ({ data }) => {
  // n<=1이면 xPos 계산에서 0/0 = NaN 발생 → 조기 반환
  if (!data || data.length < 2) return null;

  const waves = data.map(d => Number(d.waveHeight) || 0);
  const winds = data.map(d => Number(d.windSpeed) || 0);
  const maxWave = Math.max(...waves, 0.5);
  const maxWind = Math.max(...winds, 1);

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const n = data.length;

  // x 좌표 계산
  const xPos = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  // y 좌표 계산 (높을수록 위 = y 작음)
  const yWave = (v: number) => PAD.top + (1 - v / maxWave) * innerH;
  const yWind = (v: number) => PAD.top + (1 - v / maxWind) * innerH;

  // SVG 경로 생성 (spline 근사 → 단순 선분)
  const wavePath = waves.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yWave(v).toFixed(1)}`
  ).join(' ');

  // 파도 영역 채우기 경로
  const waveArea = wavePath
    + ` L${xPos(n - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`
    + ` L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  // 바람 점선 경로
  const windPath = winds.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yWind(v).toFixed(1)}`
  ).join(' ');

  // X축 라벨 (4시간 간격)
  const labelIndices = data.reduce<number[]>((acc, _, i) => {
    if (i % 4 === 0 || i === n - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>

      {/* 파도 영역 */}
      <Path d={waveArea} fill="url(#waveGrad)" />

      {/* 파도 선 */}
      <Path d={wavePath} stroke={colors.primary} strokeWidth="2" fill="none" />

      {/* 바람 점선 */}
      <Path d={windPath} stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="4,3" />

      {/* Y축 최대값 라벨 */}
      <SvgText x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill={colors.textSecondary} textAnchor="end">
        {maxWave.toFixed(1)}m
      </SvgText>

      {/* X축 시간 라벨 */}
      {labelIndices.map(i => {
        const label = new Date(data[i].time).getHours() + '시';
        return (
          <SvgText
            key={i}
            x={xPos(i)}
            y={CHART_H - 6}
            fontSize="9"
            fill={colors.textSecondary}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

const DiaryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { diaryId } = route.params;
  const queryClient = useQueryClient();

  // 다이어리 상세 조회
  const { data: diary, isLoading } = useQuery({
    queryKey: ['diary', diaryId],
    queryFn: () => api.get(`/diaries/${diaryId}`).then(r => r.data),
  });

  // 당일 24h 파도 예보 조회 (spotId와 surfDate 필요)
  const { data: forecastData } = useQuery({
    queryKey: ['diary-forecast', diaryId, diary?.spot?.id, diary?.surfDate],
    queryFn: async () => {
      if (!diary?.spot?.id || !diary?.surfDate) return null;
      const dateStr = diary.surfDate.slice(0, 10);
      const res = await api.get(`/spots/${diary.spot.id}/forecast?date=${dateStr}T00:00:00&hours=24`);
      return res.data;
    },
    enabled: !!diary?.spot?.id && !!diary?.surfDate,
  });

  // 삭제 처리
  const handleDelete = () => {
    Alert.alert('일기 삭제', '이 일기를 삭제할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await api.delete(`/diaries/${diaryId}`);
          queryClient.invalidateQueries({ queryKey: ['diaries'] });
          navigation.goBack();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!diary) return null;

  // 사진 목록 (images 배열 또는 imageUrl 단일)
  const photos: string[] = diary.images?.map((img: any) => img.imageUrl)
    ?? (diary.imageUrl ? [diary.imageUrl] : []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 편집/삭제 버튼 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CreateDiary', { editId: diaryId })}
        >
          <Edit2 size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <Trash2 size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 사진 (여러 장 수평 스크롤) */}
        {photos.length > 0 && (
          photos.length === 1
            ? <Image source={{ uri: photos[0] }} style={styles.heroImage} />
            : (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={[styles.heroImage, { width: Dimensions.get('window').width }]} />
                ))}
              </ScrollView>
            )
        )}

        <View style={styles.content}>
          <Text style={styles.dateText}>{formatDate(diary.surfDate)}</Text>
          {diary.surfTime && (
            <Text style={styles.timeText}>⏰ {diary.surfTime}</Text>
          )}

          {diary.spot && (
            <View style={styles.spotRow}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.spotName}>{diary.spot.name}</Text>
              <Text style={styles.spotRegion}>{diary.spot.region}</Text>
            </View>
          )}

          {/* 만족도 별점 */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                size={20}
                color={n <= diary.satisfaction ? colors.warning : colors.gray200}
                fill={n <= diary.satisfaction ? colors.warning : 'transparent'}
              />
            ))}
          </View>

          {/* 보드 + 서핑 시간 + 보드 사이즈 */}
          <View style={styles.metaCard}>
            {diary.boardType && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>보드</Text>
                <Text style={styles.metaValue}>
                  {BOARD_LABEL[diary.boardType] || diary.boardType}
                  {diary.boardSizeFt ? ` ${diary.boardSizeFt}ft` : ''}
                </Text>
              </View>
            )}
            {diary.durationMinutes && (
              <View style={styles.metaItem}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={styles.metaValue}>{diary.durationMinutes}분</Text>
              </View>
            )}
            {diary.visibility && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>공개</Text>
                <Text style={styles.metaValue}>{diary.visibility === 'PUBLIC' ? '공개' : '비공개'}</Text>
              </View>
            )}
          </View>

          {/* 메모 */}
          {diary.memo && (
            <View style={styles.memoBox}>
              <Text style={styles.memoText}>{diary.memo}</Text>
            </View>
          )}

          {/* 24h 파도 예보 차트 */}
          {forecastData && Array.isArray(forecastData) && forecastData.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Wind size={14} color={colors.primary} />
                <Text style={styles.chartTitle}>당일 파도 예보 (24h)</Text>
              </View>
              {/* 범례 */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>파고 (m)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>풍속 (m/s)</Text>
                </View>
              </View>
              <WaveChart data={forecastData} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },

  heroImage: { width: '100%', height: 220 },
  content: { padding: spacing.lg },
  dateText: { ...typography.h2, fontWeight: '700', color: colors.text, marginBottom: 2 },
  timeText: { ...typography.body2, color: colors.textSecondary, marginBottom: spacing.sm },

  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.md },
  spotName: { ...typography.body1, fontWeight: '600', color: colors.primary },
  spotRegion: { ...typography.caption, color: colors.textSecondary },

  starsRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.md },

  metaCard: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { ...typography.caption, color: colors.textSecondary },
  metaValue: { ...typography.body2, fontWeight: '600', color: colors.text },

  memoBox: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  memoText: { ...typography.body2, color: colors.text, lineHeight: 22 },

  // 24h 차트
  chartCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  chartTitle: { ...typography.body2, fontWeight: '700', color: colors.text },
  legend: { flexDirection: 'row', gap: spacing.md, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.textSecondary },
});

export default DiaryDetailScreen;
