// 프로필 편집 화면 — 아이디(중복확인 필수)/레벨/보드 수정 → PATCH /users/me
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../config/api';
import { usersApi } from '../../api/users.api';
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

/** 아이디 정규식 검증 — 백엔드 DTO와 동일 (2~15자, 한글/영문/숫자/언더스코어) */
const validateUsername = (val: string): string | null => {
  if (val.length < 2) return '아이디는 최소 2자 이상이어야 합니다';
  if (val.length > 15) return '아이디는 최대 15자까지 가능합니다';
  if (!/^[a-zA-Z0-9_가-힣]+$/.test(val)) return '한글, 영문, 숫자, 언더스코어(_)만 사용 가능합니다';
  return null;
};

const EditProfileScreen: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [username, setUsernameField] = useState(user?.username || '');
  const [surfLevel, setSurfLevel] = useState(user?.surfLevel || 'BEGINNER');
  const [boardType, setBoardType] = useState(user?.boardType || 'LONGBOARD');
  const [loading, setLoading] = useState(false);

  /** 아이디 중복 확인 결과 - null=미확인, true=가능, false=중복 */
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  /** 입력 변경 - 검증 + 중복 확인 결과 초기화 */
  const handleUsernameChange = (val: string) => {
    setUsernameField(val);
    setUsernameAvailable(null);
    setUsernameError(val ? validateUsername(val) : null);
  };

  /** 아이디 중복 확인 - 변경 시도 시 필수 */
  const handleCheckUsername = async () => {
    const err = validateUsername(username);
    if (err) { setUsernameError(err); return; }
    if (username === user?.username) {
      setUsernameError('현재 아이디와 동일합니다');
      return;
    }
    setUsernameChecking(true);
    setUsernameError(null);
    try {
      const res = await usersApi.checkUsername(username);
      setUsernameAvailable(res.data.available);
      if (!res.data.available) setUsernameError('이미 사용 중인 아이디입니다');
    } catch {
      setUsernameError('중복 확인 중 오류가 발생했습니다');
    } finally {
      setUsernameChecking(false);
    }
  };

  /** 아이디 변경 여부 - 변경 안 했으면 username 필드는 PATCH에서 제외 */
  const usernameChanged = username !== user?.username;

  // 저장 처리
  const handleSave = async () => {
    /** 아이디 변경했는데 중복 확인 안 했으면 차단 */
    if (usernameChanged && usernameAvailable !== true) {
      Alert.alert('알림', '아이디를 변경하려면 중복 확인이 필요해요.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { surfLevel, boardType };
      if (usernameChanged) payload.username = username.trim();
      const res = await api.patch('/users/me', payload);
      /** 저장된 사용자 정보로 store 업데이트 (provider 등 기존 필드 유지) */
      updateUser(res.data);
      queryClient.invalidateQueries({ queryKey: ['surfStats'] });
      setUsernameAvailable(null);
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

        {/* 아이디(userId) — 변경 시 중복 확인 필수 */}
        <View style={styles.field}>
          <Text style={styles.label}>아이디</Text>
          <Text style={styles.hint}>2~15자 한글/영문/숫자/언더스코어(_)만 사용 가능해요.</Text>
          <View style={styles.usernameRow}>
            <TextInput
              style={[styles.input, styles.usernameInput]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="새 아이디"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              maxLength={15}
            />
            <TouchableOpacity
              style={[
                styles.checkButton,
                (!usernameChanged || !!validateUsername(username) || usernameChecking) && styles.checkButtonDisabled,
              ]}
              onPress={handleCheckUsername}
              disabled={!usernameChanged || !!validateUsername(username) || usernameChecking}
            >
              <Text style={styles.checkButtonText}>
                {usernameChecking ? '확인중' : '중복확인'}
              </Text>
            </TouchableOpacity>
          </View>
          {/* 검증 결과 메시지 */}
          {usernameError && (
            <View style={styles.messageRow}>
              <AlertCircle size={14} color={colors.error} />
              <Text style={[styles.messageText, { color: colors.error }]}>{usernameError}</Text>
            </View>
          )}
          {usernameAvailable === true && (
            <View style={styles.messageRow}>
              <CheckCircle2 size={14} color={colors.success} />
              <Text style={[styles.messageText, { color: colors.success }]}>사용 가능한 아이디예요</Text>
            </View>
          )}
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
  hint: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm },

  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body1, color: colors.text,
  },

  /** 아이디 입력 + 중복 확인 가로 배치 */
  usernameRow: { flexDirection: 'row', gap: spacing.sm },
  usernameInput: { flex: 1 },
  checkButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
  },
  checkButtonDisabled: { opacity: 0.4 },
  checkButtonText: { ...typography.buttonSmall, color: '#fff', fontWeight: '700' },

  /** 검증 결과 메시지 (성공/에러) */
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  messageText: { ...typography.caption },

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
