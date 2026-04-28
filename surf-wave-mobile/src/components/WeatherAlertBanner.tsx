// 기상청 기상특보 컴포넌트 — 웹앱 WeatherAlertBanner.tsx 1:1 React Native 포팅
// GlobalAlertBanner: 앱 상단 고정 배너 (빨강/주황)
// AlertEntryModal: 풍랑/태풍 경보 진입 시 1회 경고 모달
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';

export interface SurfAlertSummary {
  hasSurfAlert: boolean;
  isDangerous: boolean;
  alerts: Array<{
    alertName: string;
    areaNm: string;
    level: string;
    isDangerous: boolean;
  }>;
  lastUpdated: string | null;
}

// ── 1. 앱 상단 고정 배너 ─────────────────────────────────────────────
interface GlobalAlertBannerProps {
  summary: SurfAlertSummary;
  onDetailClick: () => void;
}

export const GlobalAlertBanner: React.FC<GlobalAlertBannerProps> = ({ summary, onDetailClick }) => {
  if (!summary.hasSurfAlert) return null;

  const { isDangerous, alerts } = summary;
  const topAlert = alerts.find(a => a.isDangerous) ?? alerts[0];
  const bgColor = isDangerous ? '#DC2626' : '#EA580C';

  return (
    <TouchableOpacity
      onPress={onDetailClick}
      style={[b.banner, { backgroundColor: bgColor }]}
      activeOpacity={0.85}
    >
      {isDangerous
        ? <ShieldAlert size={14} color="#fff" />
        : <AlertTriangle size={14} color="#fff" />
      }
      <Text style={b.bannerText} numberOfLines={1}>
        <Text style={b.bannerBold}>{topAlert.alertName} 발령 중 </Text>
        {topAlert.areaNm}
        {alerts.length > 1 ? ` 외 ${alerts.length - 1}건` : ''}
      </Text>
      <Text style={b.bannerMore}>자세히 ›</Text>
    </TouchableOpacity>
  );
};

const b = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 9,
  },
  bannerText: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  bannerBold: { fontWeight: '700', color: '#fff' },
  bannerMore: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
});

// ── 2. 진입 경고 모달 ────────────────────────────────────────────────
interface AlertEntryModalProps {
  summary: SurfAlertSummary;
  onClose: () => void;
}

export const AlertEntryModal: React.FC<AlertEntryModalProps> = ({ summary, onClose }) => {
  const [expanded, setExpanded] = useState(false);

  if (!summary.hasSurfAlert) return null;

  const dangerousAlerts = summary.alerts.filter(a => a.isDangerous);
  if (!dangerousAlerts.length) return null;

  const topAlert = dangerousAlerts[0];
  const isWave = topAlert.alertName.includes('풍랑');
  const isTyphoon = topAlert.alertName.includes('태풍');
  const emoji = isTyphoon ? '🌀' : isWave ? '🌊' : '⚠️';
  const today = new Date().toLocaleDateString('ko-KR');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>

          {/* 빨간 헤더 */}
          <View style={m.header}>
            <Text style={m.emoji}>{emoji}</Text>
            <Text style={m.headerTitle}>{topAlert.alertName} 발령 중</Text>
            <Text style={m.headerSub}>
              {topAlert.areaNm}
              {dangerousAlerts.length > 1 ? ` 외 ${dangerousAlerts.length - 1}곳` : ''}
            </Text>
          </View>

          {/* 본문 */}
          <View style={m.body}>
            {/* 핵심 경고 */}
            <View style={m.warningBox}>
              <Text style={m.warningText}>
                {topAlert.level === '경보'
                  ? '⛔ 입수 절대 금지 구역입니다'
                  : '⚠️ 입수 위험 — 각별히 주의하세요'}
              </Text>
            </View>

            {/* 특보 정보 날짜 */}
            <Text style={m.dateText}>기상청 기상특보 ({today} 기준)</Text>

            {/* 여러 건 펼치기 */}
            {dangerousAlerts.length > 1 && (
              <TouchableOpacity
                style={m.expandBtn}
                onPress={() => setExpanded(e => !e)}
              >
                {expanded
                  ? <ChevronUp size={12} color={colors.textSecondary} />
                  : <ChevronDown size={12} color={colors.textSecondary} />
                }
                <Text style={m.expandText}>전체 {dangerousAlerts.length}건 보기</Text>
              </TouchableOpacity>
            )}

            {expanded && (
              <ScrollView style={m.alertList} showsVerticalScrollIndicator={false}>
                {dangerousAlerts.map((a, i) => (
                  <View key={i} style={m.alertRow}>
                    <Text style={m.alertArea}>{a.areaNm}</Text>
                    <Text style={m.alertName}>{a.alertName}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 확인 버튼 */}
          <View style={m.footer}>
            <TouchableOpacity style={m.confirmBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={m.confirmText}>확인했어요</Text>
            </TouchableOpacity>
            <Text style={m.footnote}>서핑 전 반드시 해양경찰서에 신고하세요</Text>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#1A2332', borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    alignItems: 'center', gap: 6,
  },
  emoji: { fontSize: 36 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,200,200,0.9)', fontSize: 13 },

  body: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 10 },
  warningBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 12, padding: 12,
  },
  warningText: { color: '#F87171', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  dateText: { fontSize: 11, color: '#8899AA' },

  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandText: { fontSize: 12, color: '#8899AA' },

  alertList: { maxHeight: 100 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  alertArea: { fontSize: 12, color: '#8899AA' },
  alertName: { fontSize: 12, color: '#F87171', fontWeight: '600' },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 8 },
  confirmBtn: {
    backgroundColor: '#DC2626', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footnote: { fontSize: 11, color: '#8899AA', textAlign: 'center' },
});
