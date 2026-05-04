// 탐색 화면 — 전체 화면 지도 + 스팟 마커 + 하단 카드 (웹앱 Explore와 동일)
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Animated, Dimensions, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X, Waves, Wind, Clock, Thermometer } from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { ExploreStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { kmhToMs } from '../../lib/units';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 예보 데이터 타입 (대시보드 API 응답)
interface SpotForecast {
  spot: {
    id: string; name: string; region: string; difficulty: string;
    latitude: string | number; longitude: string | number;
  };
  forecast: {
    waveHeight: string; wavePeriod: string; windSpeed: string;
    windDirection: string; waterTemperature: string; airTemperature: string;
  };
  surfRating: number;
  recommendationKo: string;
  simpleCondition: { waveStatus: string; windStatus: string; overall: string };
}

// 지역 퀵 이동 버튼
const REGION_BUTTONS = [
  { key: 'all',   label: '전체', lat: 20.0,  lng: 127.5, delta: 40 },
  { key: 'korea', label: '국내', lat: 36.5,  lng: 128.5, delta: 8  },
  { key: 'bali',  label: '발리', lat: -8.65, lng: 115.16, delta: 2 },
];

// 파도 점수 → 색상
const getRatingColor = (r: number) => {
  if (r >= 8) return '#9B59B6'; // 최고 (보라)
  if (r >= 6) return '#2ECC71'; // 좋음 (초록)
  if (r >= 4) return '#F39C12'; // 보통 (주황)
  return '#E74C3C';              // 나쁨 (빨강)
};

// 파도 점수 → 레이블
const getRatingLabel = (r: number) => {
  if (r >= 8) return '최고';
  if (r >= 6) return '좋음';
  if (r >= 4) return '보통';
  return '나쁨';
};

// 난이도 한국어
const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: '입문', INTERMEDIATE: '초급', ADVANCED: '중급', EXPERT: '고급',
};

// 범례 데이터
const LEGEND = [
  { color: '#E74C3C', label: '나쁨' },
  { color: '#F39C12', label: '보통' },
  { color: '#2ECC71', label: '좋음' },
  { color: '#9B59B6', label: '최고' },
];

const ExploreScreen: React.FC = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const mapRef = useRef<MapView>(null);
  const [selectedSpot, setSelectedSpot] = useState<SpotForecast | null>(null);
  const [activeRegion, setActiveRegion] = useState('all');
  const [showLegend, setShowLegend] = useState(true);

  // 대시보드 API에서 스팟 예보 데이터 가져오기
  const { data, isLoading } = useQuery<{ spots: SpotForecast[] }>({
    queryKey: ['dashboard', 'all'],
    queryFn: () =>
      api.get('/dashboard/forecasts').then(r => r.data),
    staleTime: 15 * 60 * 1000,
  });

  const spots = data?.spots ?? [];

  // 지역 퀵 이동
  const handleRegionMove = useCallback((btn: typeof REGION_BUTTONS[0]) => {
    setActiveRegion(btn.key);
    setSelectedSpot(null);
    mapRef.current?.animateToRegion({
      latitude: btn.lat,
      longitude: btn.lng,
      latitudeDelta: btn.delta,
      longitudeDelta: btn.delta,
    }, 800);
  }, []);

  // 마커 클릭 → 지도 중심 이동 + 하단 카드
  const handleMarkerPress = useCallback((sf: SpotForecast) => {
    setSelectedSpot(sf);
    mapRef.current?.animateToRegion({
      latitude: Number(sf.spot.latitude),
      longitude: Number(sf.spot.longitude),
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      {/* 전체 화면 지도 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 20.0,
          longitude: 127.5,
          latitudeDelta: 40,
          longitudeDelta: 40,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {spots.map(sf => {
          const lat = Number(sf.spot.latitude);
          const lng = Number(sf.spot.longitude);
          if (!lat || !lng) return null;
          const color = getRatingColor(sf.surfRating);
          const isSelected = selectedSpot?.spot.id === sf.spot.id;

          return (
            <Marker
              key={sf.spot.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(sf)}
              tracksViewChanges={isSelected}
            >
              {/* iOS에서 Marker onPress 미동작 버그 — TouchableOpacity로 이중 처리 */}
              <TouchableOpacity
                onPress={() => handleMarkerPress(sf)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.marker,
                    { backgroundColor: color, borderColor: '#fff' },
                    isSelected && styles.markerSelected,
                  ]}
                >
                  <Text style={styles.markerText}>{sf.surfRating}</Text>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {/* 상단 헤더 오버레이 */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.headerContent} pointerEvents="box-none">
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>🗺️ 스팟 탐색</Text>
            <Text style={styles.headerSub}>
              {isLoading ? '로딩 중...' : `${spots.length}개 스팟 · 마커를 눌러 상세 확인`}
            </Text>
          </View>
        </View>

        {/* 지역 퀵 이동 버튼 */}
        <View style={styles.regionRow}>
          {REGION_BUTTONS.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.regionBtn, activeRegion === btn.key && styles.regionBtnActive]}
              onPress={() => handleRegionMove(btn)}
            >
              <Text style={[styles.regionBtnText, activeRegion === btn.key && styles.regionBtnTextActive]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* 범례 - 좌하단 */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendHeader}>
            <Text style={styles.legendTitle}>컨디션</Text>
            <TouchableOpacity onPress={() => setShowLegend(false)}>
              <Text style={styles.legendClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.legendItems}>
            {LEGEND.map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {!showLegend && (
        <TouchableOpacity style={styles.legendShowBtn} onPress={() => setShowLegend(true)}>
          <Text style={styles.legendShowText}>범례</Text>
        </TouchableOpacity>
      )}

      {/* 로딩 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>지도 로딩 중...</Text>
        </View>
      )}

      {/* 하단 스팟 카드 */}
      {selectedSpot && (
        <View style={styles.bottomCard}>
          {/* 드래그 핸들 */}
          <View style={styles.dragHandle} />

          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedSpot(null)}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 스팟 이름 + 점수 — 탭하면 바로 상세로 이동 */}
          <TouchableOpacity
            style={styles.cardHeader}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedSpot(null);
              navigation.navigate('SpotDetail', {
                spotId: selectedSpot.spot.id,
                spotName: selectedSpot.spot.name,
              });
            }}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardName}>{selectedSpot.spot.name}</Text>
              <Text style={styles.cardRegion}>
                {selectedSpot.spot.region} · {DIFFICULTY_LABEL[selectedSpot.spot.difficulty] || selectedSpot.spot.difficulty}
              </Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(selectedSpot.surfRating) }]}>
              <Text style={styles.ratingNum}>{selectedSpot.surfRating}</Text>
              <Text style={styles.ratingLbl}>{getRatingLabel(selectedSpot.surfRating)}</Text>
            </View>
          </TouchableOpacity>

          {/* 컨디션 칩 */}
          <View style={styles.condRow}>
            <View style={styles.condChip}>
              <Text style={styles.condText}>파도 {selectedSpot.simpleCondition.waveStatus}</Text>
            </View>
            <View style={styles.condChip}>
              <Text style={styles.condText}>바람 {selectedSpot.simpleCondition.windStatus}</Text>
            </View>
            <View style={[styles.condChip, styles.condChipHighlight]}>
              <Text style={[styles.condText, { color: colors.primary, fontWeight: '700' }]}>
                {selectedSpot.simpleCondition.overall}
              </Text>
            </View>
          </View>

          {/* 데이터 행 */}
          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Waves size={14} color={colors.primary} />
              <Text style={styles.dataVal}>{parseFloat(selectedSpot.forecast.waveHeight).toFixed(1)}m</Text>
              <Text style={styles.dataLbl}>파고</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={styles.dataVal}>{parseFloat(selectedSpot.forecast.wavePeriod).toFixed(0)}s</Text>
              <Text style={styles.dataLbl}>주기</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Wind size={14} color={colors.textSecondary} />
              <Text style={styles.dataVal}>{kmhToMs(selectedSpot.forecast.windSpeed)}</Text>
              <Text style={styles.dataLbl}>m/s</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Thermometer size={14} color={colors.accent} />
              <Text style={styles.dataVal}>{parseFloat(selectedSpot.forecast.waterTemperature).toFixed(0)}°</Text>
              <Text style={styles.dataLbl}>수온</Text>
            </View>
          </View>

          {/* 추천 문구 */}
          <Text style={styles.recommend} numberOfLines={2}>
            💬 {selectedSpot.recommendationKo}
          </Text>

          {/* 자세히 보기 버튼 */}
          <TouchableOpacity
            style={[styles.detailBtn, { backgroundColor: getRatingColor(selectedSpot.surfRating) }]}
            onPress={() => {
              setSelectedSpot(null);
              navigation.navigate('SpotDetail', {
                spotId: selectedSpot.spot.id,
                spotName: selectedSpot.spot.name,
              });
            }}
          >
            <Text style={styles.detailBtnText}>자세히 보기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // 상단 헤더 오버레이
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 20,
  },
  headerContent: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40,
    backgroundColor: 'rgba(245,239,227,0.88)',
  },
  headerText: {},
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // 지역 퀵 이동 버튼
  regionRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  regionBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  regionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  regionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  regionBtnTextActive: { color: '#fff' },

  // 범례
  legend: {
    position: 'absolute', bottom: 24, left: 12, zIndex: 10,
    backgroundColor: 'rgba(255,253,249,0.95)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  legendHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  legendTitle: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, flex: 1 },
  legendClose: { fontSize: 10, color: colors.textTertiary },
  legendItems: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: colors.textSecondary },
  legendShowBtn: {
    position: 'absolute', bottom: 24, left: 12, zIndex: 10,
    backgroundColor: 'rgba(255,253,249,0.95)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  legendShowText: { fontSize: 10, color: colors.textSecondary },

  // 로딩
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 50,
    backgroundColor: 'rgba(245,239,227,0.7)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  loadingText: { ...typography.body2, color: colors.textSecondary },

  // 커스텀 마커
  marker: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  markerSelected: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 3,
    borderColor: '#fff',
  },
  markerText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // 하단 카드
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.gray300, alignSelf: 'center', marginBottom: spacing.sm,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gray100,
    justifyContent: 'center', alignItems: 'center',
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  cardName: { ...typography.body1, fontWeight: '700', color: colors.text },
  cardRegion: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  ratingBadge: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  ratingNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  ratingLbl: { fontSize: 9, fontWeight: '700', color: '#fff' },

  condRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  condChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    backgroundColor: colors.gray100, borderRadius: 8,
  },
  condChipHighlight: { backgroundColor: colors.primary + '15' },
  condText: { fontSize: 11, color: colors.textSecondary },

  dataRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 12,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  dataItem: { flex: 1, alignItems: 'center', gap: 2 },
  dataDivider: { width: 1, height: 32, backgroundColor: colors.border },
  dataVal: { ...typography.body2, fontWeight: '700', color: colors.text },
  dataLbl: { fontSize: 10, color: colors.textSecondary },

  recommend: {
    ...typography.caption, color: colors.textSecondary,
    fontStyle: 'italic', marginBottom: spacing.md,
  },

  detailBtn: {
    borderRadius: 14, paddingVertical: 13,
    alignItems: 'center',
  },
  detailBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ExploreScreen;
