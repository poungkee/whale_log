// 스팟 위성지도 + 풍향/스웰 화살표 오버레이 (Task #84, 모바일)
//
// 핵심 기능:
// 1. react-native-maps mapType="satellite" — Apple/Google Maps 위성사진 (무료)
// 2. Polyline 화살표 3종 (해변선/풍향/스웰)
// 3. 시간 슬라이더 (0~24h)
// 4. 갱신 시각 + 새로고침
//
// 방어 로직:
// - M-1: coastFacingDeg null → 해변선 생략
// - M-2/3: windDirection/swellDirection null → 화살표 생략
// - M-6: 슬라이더 인덱스 clamp(0, len-1)
// - M-7: 새로고침 1초 debounce

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { RefreshCw, MapPin } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import {
  arrowPolyline,
  coastLinePolyline,
  windArrowDirection,
} from '../../lib/geoArrow';
import {
  getWindType,
  getWindTypeColor,
  getWindTypeLabel,
} from '../../lib/wind';

interface HourlyForecast {
  forecastTime: string;
  windDirection: string | null;
  swellDirection: string | null;
  updatedAt?: string;
}

interface SpotSatelliteMapProps {
  spot: {
    name: string;
    latitude: number | string;
    longitude: number | string;
    coastFacingDeg: number | null;
  };
  hourlyData: HourlyForecast[];
  initialHourIndex?: number;
  lastUpdated?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** "n분 전" 라벨 */
function formatRelativeTime(iso?: string): string {
  if (!iso) return '갱신 시각 알 수 없음';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전 갱신됨';
  if (diffMin < 60) return `${diffMin}분 전 갱신됨`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전 갱신됨`;
  return new Date(iso).toLocaleString('ko-KR');
}

export const SpotSatelliteMap: React.FC<SpotSatelliteMapProps> = ({
  spot,
  hourlyData,
  initialHourIndex = 0,
  lastUpdated,
  onRefresh,
  refreshing = false,
}) => {
  const [hourIndex, setHourIndex] = useState(
    Math.max(0, Math.min(initialHourIndex, hourlyData.length - 1)),
  );

  useEffect(() => {
    setHourIndex(Math.max(0, Math.min(initialHourIndex, hourlyData.length - 1)));
  }, [initialHourIndex, hourlyData.length]);

  const refreshDebounceRef = useRef<number>(0);
  const handleRefreshPress = () => {
    if (refreshing) return;
    const now = Date.now();
    if (now - refreshDebounceRef.current < 1000) return;
    refreshDebounceRef.current = now;
    onRefresh?.();
  };

  const currentForecast = hourlyData[hourIndex];

  const lat = typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude;
  const lng = typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude;

  /** 화살표 데이터 메모이제이션 */
  const arrows = useMemo(() => {
    const result: {
      coast?: { latitude: number; longitude: number }[];
      wind?: { latitude: number; longitude: number }[];
      swell?: { latitude: number; longitude: number }[];
      windColor: string;
      windLabel: string;
    } = { windColor: '#95A5A6', windLabel: '' };

    if (spot.coastFacingDeg != null) {
      result.coast = coastLinePolyline(lat, lng, spot.coastFacingDeg, 200);
    }
    if (currentForecast?.windDirection) {
      const windFromDeg = parseFloat(currentForecast.windDirection);
      if (!isNaN(windFromDeg)) {
        const arrowDeg = windArrowDirection(windFromDeg);
        result.wind = arrowPolyline(lat, lng, arrowDeg, 250);
        const wt = getWindType(windFromDeg, spot.coastFacingDeg);
        result.windColor = getWindTypeColor(wt);
        result.windLabel = getWindTypeLabel(wt);
      }
    }
    if (currentForecast?.swellDirection) {
      const swellFromDeg = parseFloat(currentForecast.swellDirection);
      if (!isNaN(swellFromDeg)) {
        const arrowDeg = (swellFromDeg + 180) % 360;
        result.swell = arrowPolyline(lat, lng, arrowDeg, 300);
      }
    }
    return result;
  }, [lat, lng, spot.coastFacingDeg, currentForecast]);

  const hourLabel = currentForecast?.forecastTime
    ? new Date(currentForecast.forecastTime).getHours() + '시'
    : '';

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <MapPin size={16} color={colors.primary} />
        <Text style={s.title}>위성지도</Text>
        {arrows.windLabel ? (
          <View style={[s.windBadge, { backgroundColor: arrows.windColor + '20' }]}>
            <Text style={[s.windBadgeText, { color: arrows.windColor }]}>{arrows.windLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* 지도 */}
      <View style={s.mapWrap}>
        <MapView
          provider={PROVIDER_DEFAULT}
          mapType="satellite"
          style={s.map}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }}>
            <View style={s.marker} />
          </Marker>

          {arrows.coast && (
            <Polyline coordinates={arrows.coast} strokeColor="#1f2937" strokeWidth={3} />
          )}
          {arrows.swell && (
            <Polyline coordinates={arrows.swell} strokeColor="#3B82F6" strokeWidth={4} />
          )}
          {arrows.wind && (
            <Polyline coordinates={arrows.wind} strokeColor={arrows.windColor} strokeWidth={5} />
          )}
        </MapView>

        {/* 범례 */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: '#fff' }]} />
            <Text style={s.legendTxt}>해변선</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: arrows.windColor }]} />
            <Text style={s.legendTxt}>풍향</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: '#3B82F6' }]} />
            <Text style={s.legendTxt}>스웰</Text>
          </View>
        </View>
      </View>

      {/* 시간 슬라이더 */}
      {hourlyData.length > 1 && (
        <View style={s.sliderRow}>
          <View style={s.sliderHeader}>
            <Text style={s.sliderLabel}>시간대 예보</Text>
            <Text style={s.sliderHour}>{hourLabel}</Text>
          </View>
          <Slider
            style={s.slider}
            minimumValue={0}
            maximumValue={hourlyData.length - 1}
            step={1}
            value={hourIndex}
            onValueChange={(v) => setHourIndex(Math.round(v))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <View style={s.sliderRangeRow}>
            <Text style={s.sliderRangeTxt}>지금</Text>
            <Text style={s.sliderRangeTxt}>+{hourlyData.length - 1}시간 후</Text>
          </View>
        </View>
      )}

      {/* 갱신 시각 + 새로고침 */}
      <View style={s.footer}>
        <Text style={s.footerTxt}>{formatRelativeTime(lastUpdated)}</Text>
        {onRefresh && (
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={handleRefreshPress}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <RefreshCw size={12} color={colors.textSecondary} />
            )}
            <Text style={s.refreshBtnTxt}>{refreshing ? '갱신 중' : '새로고침'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.body2, fontWeight: '700', color: colors.text, flex: 1 },
  windBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  windBadgeText: { ...typography.caption, fontSize: 10, fontWeight: '700' },

  mapWrap: { width: '100%', height: 280, position: 'relative' },
  map: { width: '100%', height: '100%' },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },

  legend: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 10, height: 2 },
  legendTxt: { ...typography.caption, fontSize: 10, color: '#fff' },

  sliderRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  sliderHour: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  slider: { width: '100%', height: 30 },
  sliderRangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderRangeTxt: { ...typography.caption, fontSize: 10, color: colors.textTertiary },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTxt: { ...typography.caption, color: colors.textSecondary },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  refreshBtnTxt: { ...typography.caption, color: colors.textSecondary },
});
