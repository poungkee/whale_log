// 온보딩 화면 — 서핑 레벨(1단계) + 보드 타입(2단계) 선택
// 웹앱 LevelSelect.tsx 디자인 참고
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { storage } from '../../config/storage';
import { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
};

// 레벨 카드 데이터 — 웹앱과 동일
const LEVELS = [
  { value: 'BEGINNER',     emoji: '🌊', title: '초급',   subtitle: '처음 시작해요',      desc: '인스트럭터가 밀어주는 파도를 타고 있어요. 안전하고 잔잔한 비치가 좋아요.', color: '#32CD32' },
  { value: 'INTERMEDIATE', emoji: '🏄', title: '중급',   subtitle: '혼자 파도를 잡아요',  desc: '스스로 패들링해서 파도를 잡고 테이크오프할 수 있어요.',                   color: '#008CBA' },
  { value: 'ADVANCED',     emoji: '🏄‍♂️', title: '상급', subtitle: '자유롭게 타요',        desc: '원하는 파도를 골라 탈 수 있고 다양한 기술을 구사해요.',                   color: '#FF8C00' },
  { value: 'EXPERT',       emoji: '🔥', title: '전문가', subtitle: '프로 수준이에요',      desc: '오버헤드 이상 파도도 소화하며 모든 컨디션에서 서핑이 가능해요.',           color: '#FF4444' },
];

// 보드 타입 카드 데이터 — 웹앱과 동일
const BOARDS = [
  { value: 'LONGBOARD',  emoji: '🏄',  title: '롱보드',   subtitle: '9ft+',          desc: '안정적이고 작은 파도에서도 잘 타요. 여유로운 크루징.',       color: '#32CD32' },
  { value: 'FUNBOARD',   emoji: '🛹',  title: '펀보드',   subtitle: '7~8ft',         desc: '롱보드의 안정성 + 숏보드의 기동성. 입문자에게 인기.',         color: '#008CBA' },
  { value: 'MIDLENGTH',  emoji: '🏄‍♂️', title: '미드렝스', subtitle: '6.6~8ft',       desc: '범용적인 중간 사이즈. 다양한 파도에서 활용 가능.',             color: '#6366F1' },
  { value: 'FISH',       emoji: '🐟',  title: '피쉬',     subtitle: '5.2~6.2ft',     desc: '넓고 짧은 보드. 작은 파도에서 속도가 잘 나요.',               color: '#EC4899' },
  { value: 'SHORTBOARD', emoji: '🏄‍♀️', title: '숏보드',  subtitle: '~6.4ft',        desc: '날카로운 턴과 에어. 파워풀한 파도에서 진가 발휘.',             color: '#FF8C00' },
  { value: 'SUP',        emoji: '🚣',  title: 'SUP',      subtitle: '스탠드업 패들', desc: '패들로 서서 타는 보드. 평수에서도 즐길 수 있어요.',            color: '#14B8A6' },
  { value: 'BODYBOARD',  emoji: '🤸',  title: '바디보드', subtitle: '엎드려 타기',   desc: '엎드려서 파도를 타요. 입문이 쉽고 재미있어요.',               color: '#8B5CF6' },
  { value: 'FOILBOARD',  emoji: '🪁',  title: '포일',     subtitle: '수중익 보드',   desc: '수중익으로 물 위를 나는 듯이. 상급자용.',                      color: '#0EA5E9' },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<'level' | 'board'>('level');
  const [selectedLevel, setSelectedLevel] = useState('BEGINNER');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuthStore();

  // 레벨 선택 → 보드 선택 단계로
  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    setStep('board');
  };

  // 보드 선택 → API 저장 → 메인 이동
  const handleBoardSelect = async (boardType: string) => {
    setLoading(true);
    try {
      const res = await api.patch('/users/me', { surfLevel: selectedLevel, boardType });
      const token = await storage.getToken();
      if (token) await login(token, res.data);
      // 온보딩 완료 — RootNavigator가 isAuthenticated 보고 MainTab으로 자동 이동
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '저장에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  // 건너뛰기
  const handleSkip = async () => {
    setLoading(true);
    try {
      const res = await api.patch('/users/me', { surfLevel: 'BEGINNER', boardType: 'LONGBOARD' });
      const token = await storage.getToken();
      if (token) await login(token, res.data);
    } catch {
      // 실패해도 그냥 메인으로
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 진행 표시 */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, step === 'board' && styles.progressDotActive]} />
      </View>

      {/* 타이틀 */}
      <View style={styles.titleBox}>
        <Text style={styles.title}>
          {step === 'level' ? '서핑 레벨을 알려주세요' : '어떤 보드를 타세요?'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'level'
            ? '레벨에 맞는 스팟과 정보를 추천해드려요'
            : '보드에 맞는 파도 컨디션을 추천해드려요'}
        </Text>
      </View>

      {/* 카드 목록 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {(step === 'level' ? LEVELS : BOARDS).map(item => (
          <TouchableOpacity
            key={item.value}
            style={styles.card}
            onPress={() => step === 'level' ? handleLevelSelect(item.value) : handleBoardSelect(item.value)}
            activeOpacity={0.8}
            disabled={loading}
          >
            {/* 이모지 아이콘 */}
            <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>

            {/* 텍스트 */}
            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>

            {/* 화살표 */}
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomRow}>
        {step === 'board' && (
          <TouchableOpacity onPress={() => setStep('level')} disabled={loading}>
            <Text style={styles.linkText}>이전으로</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSkip} disabled={loading}>
          {loading
            ? <ActivityIndicator color={colors.textTertiary} />
            : <Text style={styles.linkText}>나중에 선택할게요</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  progressRow: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  progressDot: {
    width: 32, height: 6, borderRadius: 3,
    backgroundColor: colors.gray200,
  },
  progressDotActive: { backgroundColor: colors.primary },

  titleBox: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' },
  title: { ...typography.h2, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body2, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { ...typography.body1, fontWeight: '700' },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary },
  cardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

  bottomRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.xl,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  linkText: { ...typography.body2, color: colors.textTertiary },
});

export default OnboardingScreen;
