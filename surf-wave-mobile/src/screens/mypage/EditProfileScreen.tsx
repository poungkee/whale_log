// 프로필 편집 화면 — 닉네임/레벨/보드 수정 → PATCH /users/me
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../config/storage';

// 레벨 선택지
const SURF_LEVELS = [
  { value: 'BEGINNER',     label: '입문', desc: '아직 서핑을 배우는 단계' },
  { value: 'INTERMEDIATE', label: '초급', desc: '기본 팝업은 할 수 있어요' },
  { value: 'ADVANCED',     label: '중급', desc: '파도를 고르고 조종해요' },
  { value: 'EXPERT',       label: '고급', desc: '어려운 파도도 공략해요' },
];

// 보드 타입 선택지
const BOARD_TYPES = [
  { value: 'LONGBOARD',  label: '롱보드',   desc: '9ft+, 안정적' },
  { value: 'MIDLENGTH',  label: '미드렝스', desc: '7~9ft, 범용' },
  { value: 'FUNBOARD',   label: '펀보드',   desc: '7~8ft, 입문 추천' },
  { value: 'FISH',       label: '피시',     desc: '작고 넓은 쌍꼬리' },
  { value: 'SHORTBOARD', label: '숏보드',   desc: '5~7ft, 고급용' },
  { value: 'SUP',        label: 'SUP',      desc: '스탠드업 패들' },
  { value: 'BODYBOARD',  label: '바디보드', desc: '엎드려 타기' },
  { value: 'FOILBOARD',  label: '포일보드', desc: '수면 위 비행' },
  { value: 'SOFTBOARD',  label: '소프트보드', desc: '폼 재질, 안전' },
];

const EditProfileScreen: React.FC = () => {
  const { user, login } = useAuthStore();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [surfLevel, setSurfLevel] = useState(user?.surfLevel || 'BEGINNER');
  const [boardType, setBoardType] = useState(user?.boardType || 'LONGBOARD');
  const [loading, setLoading] = useState(false);

  // 저장 처리
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.patch('/users/me', { nickname: nickname.trim(), surfLevel, boardType });
      // 저장된 사용자 정보로 store 업데이트
      const updatedUser = res.data;
      const token = await storage.getToken();
      if (token) await login(token, updatedUser);
      queryClient.invalidateQueries({ queryKey: ['surfStats'] });
      Alert.alert('완료', '프로필이 수정되었어요!');
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '저장에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 닉네임 */}
        <View style={styles.field}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="서퍼 닉네임"
            placeholderTextColor={colors.textTertiary}
            maxLength={20}
          />
        </View>

        {/* 서핑 레벨 선택 */}
        <View style={styles.field}>
          <Text style={styles.label}>서핑 레벨</Text>
          <View style={styles.optionGrid}>
            {SURF_LEVELS.map(l => (
              <TouchableOpacity
                key={l.value}
                style={[styles.optionCard, surfLevel === l.value && styles.optionCardActive]}
                onPress={() => setSurfLevel(l.value)}
              >
                <Text style={[styles.optionLabel, surfLevel === l.value && styles.optionLabelActive]}>
                  {l.label}
                </Text>
                <Text style={styles.optionDesc}>{l.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 보드 타입 선택 */}
        <View style={styles.field}>
          <Text style={styles.label}>주력 보드</Text>
          <View style={styles.optionGrid}>
            {BOARD_TYPES.map(b => (
              <TouchableOpacity
                key={b.value}
                style={[styles.optionCard, boardType === b.value && styles.optionCardActive]}
                onPress={() => setBoardType(b.value)}
              >
                <Text style={[styles.optionLabel, boardType === b.value && styles.optionLabelActive]}>
                  {b.label}
                </Text>
                <Text style={styles.optionDesc}>{b.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>저장하기</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },

  field: { marginBottom: spacing.xl },
  label: { ...typography.body1, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body1, color: colors.text,
  },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    width: '47%', padding: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  optionLabel: { ...typography.body2, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 },
  optionLabelActive: { color: colors.primary },
  optionDesc: { fontSize: 11, color: colors.textTertiary },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default EditProfileScreen;
