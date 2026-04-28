// 설정 화면 — 앱 정보 + 로그아웃 + 회원탈퇴
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, LogOut, Info, Trash2, FileText, Shield } from 'lucide-react-native';

const TERMS_URL = 'https://whale-log.vercel.app/terms.html';
const PRIVACY_URL = 'https://whale-log.vercel.app/privacy.html';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

const SettingsScreen: React.FC = () => {
  const { logout } = useAuthStore();

  // 로그아웃
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  // 회원 탈퇴
  const handleWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 모든 데이터(일기, 기록)가 삭제돼요. 정말 탈퇴할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/me');
              await logout();
            } catch {
              Alert.alert('오류', '탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Info size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>버전</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Info size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>서비스 이름</Text>
              <Text style={styles.rowValue}>Whale Log</Text>
            </View>
          </View>
        </View>

        {/* 계정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <LogOut size={18} color={colors.error} />
              <Text style={[styles.rowLabel, { color: colors.error }]}>로그아웃</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleWithdraw}>
              <Trash2 size={18} color={colors.error} />
              <Text style={[styles.rowLabel, { color: colors.error }]}>회원 탈퇴</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 법적 고지 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>법적 고지</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(TERMS_URL)}>
              <FileText size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>이용약관</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Shield size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>개인정보처리방침</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg, marginTop: spacing.md },
  sectionTitle: { ...typography.caption, color: colors.textTertiary, fontWeight: '700',
    letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { flex: 1, ...typography.body1, color: colors.text },
  rowValue: { ...typography.body2, color: colors.textSecondary },
});

export default SettingsScreen;
