// 다이어리 카드용 도움됐어요 버튼 (Phase 2C)
// 인스타식 좋아요 X — "✋ 도움됐어요" 정보 가치 평가
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ThumbsUp } from 'lucide-react-native';
import { api } from '../config/api';
import { colors, spacing } from '../theme';
import { useAuthStore } from '../stores/authStore';

interface DiaryHelpfulButtonProps {
  diaryId: string;
}

export const DiaryHelpfulButton: React.FC<DiaryHelpfulButtonProps> = ({ diaryId }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [count, setCount] = useState(0);
  const [helpful, setHelpful] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get(`/diaries/${diaryId}/helpful`)
      .then((r) => {
        setCount(r.data?.count ?? 0);
        setHelpful(!!r.data?.helpful);
      })
      .catch(() => {});
  }, [diaryId, isAuthenticated]);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요합니다');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post(`/diaries/${diaryId}/helpful/toggle`);
      setHelpful(!!r.data?.helpful);
      setCount(r.data?.count ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.row}>
      <TouchableOpacity
        style={s.btn}
        onPress={handleToggle}
        disabled={loading}
        activeOpacity={0.7}
      >
        <ThumbsUp
          size={14}
          color={helpful ? colors.primary : colors.textTertiary}
          fill={helpful ? colors.primary : 'transparent'}
        />
        <Text style={[s.txt, helpful && s.txtActive]}>
          도움됐어요 {count > 0 && count}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txt: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  txtActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
