// KHOA 정부 서핑지수 뱃지 — 탭 시 레벨별 지수 팝업 표시
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Info, X } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

export interface KhoaEnrichment {
  khoaIndex: string | null;
  khoaWaveHeight: number | null;
  khoaWaterTemperature: number | null;
  khoaWindSpeed: number | null;
  khoaWavePeriod: number | null;
  waveHeightRatio: number | null;
  beginnerIndex: string | null;
  intermediateIndex: string | null;
  advancedIndex: string | null;
}

interface KhoaBadgeProps {
  enrichment: KhoaEnrichment;
  /** 현재 선택된 레벨 (초기 팝업 포커스용) */
  currentLevel?: string;
  /** 컴팩트 모드 (홈 카드용) */
  compact?: boolean;
}

// 서핑지수 → 색상
const getIndexColor = (index: string | null): string => {
  if (!index) return colors.textTertiary;
  if (index === '매우좋음') return '#10B981';
  if (index === '좋음') return '#2AAFC6';
  if (index === '보통') return '#F59E0B';
  if (index === '나쁨') return '#F97316';
  if (index === '매우나쁨') return '#d4183d';
  return colors.textTertiary;
};

// 서핑지수 → 이모지
const getIndexEmoji = (index: string | null): string => {
  if (!index) return '—';
  if (index === '매우좋음') return '🟢';
  if (index === '좋음') return '🔵';
  if (index === '보통') return '🟡';
  if (index === '나쁨') return '🟠';
  if (index === '매우나쁨') return '🔴';
  return '—';
};

export const KhoaBadge: React.FC<KhoaBadgeProps> = ({ enrichment, currentLevel, compact = false }) => {
  const [modalVisible, setModalVisible] = useState(false);

  // khoaIndex가 없으면 (발리 스팟 등) 표시 안 함
  if (!enrichment.khoaIndex) return null;

  const indexColor = getIndexColor(enrichment.khoaIndex);

  return (
    <>
      {/* 뱃지 버튼 */}
      <TouchableOpacity
        style={[styles.badge, compact && styles.badgeCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.govLabel}>🏛</Text>
        <Text style={[styles.indexText, { color: indexColor }]}>
          {enrichment.khoaIndex}
        </Text>
        <Info size={compact ? 10 : 12} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* 상세 팝업 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            {/* 팝업 헤더 */}
            <View style={styles.popupHeader}>
              <View style={styles.popupTitleRow}>
                <Text style={styles.popupTitle}>🏛 정부 서핑지수</Text>
                <Text style={styles.popupSubtitle}>해양수산부 국립해양조사원(KHOA)</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* 레벨별 서핑지수 */}
            <View style={styles.levelSection}>
              <Text style={styles.sectionLabel}>레벨별 서핑지수</Text>
              <View style={styles.levelGrid}>
                {[
                  { label: '초급', index: enrichment.beginnerIndex, level: 'BEGINNER' },
                  { label: '중급', index: enrichment.intermediateIndex, level: 'INTERMEDIATE' },
                  { label: '상급', index: enrichment.advancedIndex, level: 'ADVANCED' },
                ].map(({ label, index, level }) => {
                  const isCurrentLevel =
                    (currentLevel === 'BEGINNER' && level === 'BEGINNER') ||
                    (currentLevel === 'INTERMEDIATE' && level === 'INTERMEDIATE') ||
                    (['ADVANCED', 'EXPERT'].includes(currentLevel || '') && level === 'ADVANCED');

                  return (
                    <View
                      key={level}
                      style={[
                        styles.levelItem,
                        isCurrentLevel && { borderColor: getIndexColor(index), borderWidth: 1.5 },
                      ]}
                    >
                      {isCurrentLevel && (
                        <Text style={styles.currentTag}>내 레벨</Text>
                      )}
                      <Text style={styles.levelLabel}>{label}</Text>
                      <Text style={styles.levelEmoji}>{getIndexEmoji(index)}</Text>
                      <Text style={[styles.levelIndex, { color: getIndexColor(index) }]}>
                        {index || '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* KHOA 실측 파고 */}
            {enrichment.khoaWaveHeight !== null && (
              <View style={styles.dataSection}>
                <Text style={styles.sectionLabel}>KHOA 실측 데이터 (연안 기준)</Text>
                <View style={styles.dataRow}>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataValue}>{enrichment.khoaWaveHeight?.toFixed(1)}m</Text>
                    <Text style={styles.dataLabel}>파고</Text>
                  </View>
                  {enrichment.khoaWavePeriod !== null && (
                    <View style={styles.dataItem}>
                      <Text style={styles.dataValue}>{enrichment.khoaWavePeriod?.toFixed(0)}s</Text>
                      <Text style={styles.dataLabel}>주기</Text>
                    </View>
                  )}
                  {enrichment.khoaWindSpeed !== null && (
                    <View style={styles.dataItem}>
                      <Text style={styles.dataValue}>{enrichment.khoaWindSpeed?.toFixed(1)}m/s</Text>
                      <Text style={styles.dataLabel}>풍속</Text>
                    </View>
                  )}
                  {enrichment.khoaWaterTemperature !== null && (
                    <View style={styles.dataItem}>
                      <Text style={styles.dataValue}>{enrichment.khoaWaterTemperature?.toFixed(0)}°</Text>
                      <Text style={styles.dataLabel}>수온</Text>
                    </View>
                  )}
                </View>
                {/* Open-Meteo 대비 파고 비율 */}
                {enrichment.waveHeightRatio !== null && enrichment.waveHeightRatio > 0 && (
                  <View style={styles.ratioRow}>
                    <Text style={styles.ratioText}>
                      📊 예보 파고 대비 연안 실측 ×{enrichment.waveHeightRatio.toFixed(1)}
                      {enrichment.waveHeightRatio > 1 ? ' (연안이 더 큼)' : ' (연안이 더 작음)'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 안내 문구 */}
            <Text style={styles.note}>
              정부 실측 데이터 기반 · 한국 해수욕장 16곳 제공 · 1시간마다 갱신
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // 뱃지
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeCompact: {
    paddingHorizontal: 6, paddingVertical: 3,
  },
  govLabel: { fontSize: 11 },
  indexText: { fontSize: 12, fontWeight: '700' },

  // 모달 오버레이
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  popup: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: spacing.lg,
    width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },

  // 헤더
  popupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  popupTitleRow: { flex: 1 },
  popupTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  popupSubtitle: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },

  // 레벨별 지수
  levelSection: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  levelGrid: { flexDirection: 'row', gap: 8 },
  levelItem: {
    flex: 1, alignItems: 'center', gap: 3,
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: 4,
  },
  currentTag: { fontSize: 9, color: colors.primary, fontWeight: '700', backgroundColor: colors.primary + '15', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  levelLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  levelEmoji: { fontSize: 18 },
  levelIndex: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // 실측 데이터
  dataSection: { gap: 8 },
  dataRow: { flexDirection: 'row', gap: 8 },
  dataItem: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: colors.background, borderRadius: 10,
    paddingVertical: 8,
  },
  dataValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  dataLabel: { fontSize: 10, color: colors.textSecondary },

  // 파고 비율
  ratioRow: {
    backgroundColor: colors.primary + '10', borderRadius: 8,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
  },
  ratioText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  // 안내
  note: { fontSize: 10, color: colors.textTertiary, textAlign: 'center', lineHeight: 14 },
});

export default KhoaBadge;
