// 뱃지 획득 알림 토스트 — 화면 상단에 슬라이드 인 형태로 표시
//
// 동작:
//  - badgeNotificationStore의 queue가 비지 않으면 첫 번째 뱃지 토스트 표시
//  - 3초 후 자동 사라짐 (또는 사용자 탭으로 즉시 사라짐)
//  - 다음 뱃지가 있으면 0.3초 후 다시 표시 (큐 순차 소비)
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Image,
} from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useBadgeNotificationStore, type NewBadge } from '../stores/badgeNotificationStore';
import { colors, spacing, typography } from '../theme';

/** 뱃지 PNG 매핑 — MyPageScreen의 BADGE_IMAGES와 같은 키 사용 (lazy 모듈 분리) */
const BADGE_IMAGES: Record<string, any> = {
  ANNIVERSARY_2026: require('../../assets/images/badges/ANNIVERSARY_2026.png'),
  ANNIVERSARY_2027: require('../../assets/images/badges/ANNIVERSARY_2027.png'),
  BALI_SURFER: require('../../assets/images/badges/BALI_SURFER.png'),
  BOARD_3: require('../../assets/images/badges/BOARD_3.png'),
  BOARD_5: require('../../assets/images/badges/BOARD_5.png'),
  BOARD_7: require('../../assets/images/badges/BOARD_7.png'),
  BOARD_ALL: require('../../assets/images/badges/BOARD_ALL.png'),
  CURSED_SURFER: require('../../assets/images/badges/CURSED_SURFER.png'),
  DAWN_SURFER: require('../../assets/images/badges/DAWN_SURFER.png'),
  DAY_ONE_DIARY: require('../../assets/images/badges/DAY_ONE_DIARY.png'),
  DEEP_FISH: require('../../assets/images/badges/DEEP_FISH.png'),
  DIARY_10: require('../../assets/images/badges/DIARY_10.png'),
  DIARY_100: require('../../assets/images/badges/DIARY_100.png'),
  DOUBLE_SESSION: require('../../assets/images/badges/DOUBLE_SESSION.png'),
  EARLY_BIRD: require('../../assets/images/badges/EARLY_BIRD.png'),
  FAVORITE_10: require('../../assets/images/badges/FAVORITE_10.png'),
  FAVORITE_20: require('../../assets/images/badges/FAVORITE_20.png'),
  FIRST_DIARY: require('../../assets/images/badges/FIRST_DIARY.png'),
  FIRST_FAVORITE: require('../../assets/images/badges/FIRST_FAVORITE.png'),
  FIRST_PHOTO_DIARY: require('../../assets/images/badges/FIRST_PHOTO_DIARY.png'),
  FIRST_VOTE: require('../../assets/images/badges/FIRST_VOTE.png'),
  FIRST_WAVER: require('../../assets/images/badges/FIRST_WAVER.png'),
  FLAT_DAY: require('../../assets/images/badges/FLAT_DAY.png'),
  FOUNDER: require('../../assets/images/badges/FOUNDER.png'),
  FOUR_SEASONS: require('../../assets/images/badges/FOUR_SEASONS.png'),
  GUIDE_5: require('../../assets/images/badges/GUIDE_5.png'),
  GUIDE_ALL: require('../../assets/images/badges/GUIDE_ALL.png'),
  KOREAN_SURFER: require('../../assets/images/badges/KOREAN_SURFER.png'),
  NIGHT_OWL: require('../../assets/images/badges/NIGHT_OWL.png'),
  OCEAN_CRUSH: require('../../assets/images/badges/OCEAN_CRUSH.png'),
  PERFECT_DAY: require('../../assets/images/badges/PERFECT_DAY.png'),
  PHOTO_DIARY_100: require('../../assets/images/badges/PHOTO_DIARY_100.png'),
  PHOTO_DIARY_20: require('../../assets/images/badges/PHOTO_DIARY_20.png'),
  PHOTO_DIARY_50: require('../../assets/images/badges/PHOTO_DIARY_50.png'),
  PRO_SURFER: require('../../assets/images/badges/PRO_SURFER.png'),
  PROFILE_COMPLETE: require('../../assets/images/badges/PROFILE_COMPLETE.png'),
  REBEL_SURFER: require('../../assets/images/badges/REBEL_SURFER.png'),
  REVENGE_WAVE: require('../../assets/images/badges/REVENGE_WAVE.png'),
  ROLLERCOASTER: require('../../assets/images/badges/ROLLERCOASTER.png'),
  SECRET_SPOT: require('../../assets/images/badges/SECRET_SPOT.png'),
  SOMMELIER: require('../../assets/images/badges/SOMMELIER.png'),
  STREAK_30: require('../../assets/images/badges/STREAK_30.png'),
  STREAK_7: require('../../assets/images/badges/STREAK_7.png'),
  STUBBORN: require('../../assets/images/badges/STUBBORN.png'),
  SUNSET_SURFER: require('../../assets/images/badges/SUNSET_SURFER.png'),
  SURF_BUDDY: require('../../assets/images/badges/SURF_BUDDY.png'),
  SURF_CLASSMATE: require('../../assets/images/badges/SURF_CLASSMATE.png'),
  TEARS_OF_WAVE: require('../../assets/images/badges/TEARS_OF_WAVE.png'),
  THREE_COUNTRIES: require('../../assets/images/badges/THREE_COUNTRIES.png'),
  TIME_CAPSULE: require('../../assets/images/badges/TIME_CAPSULE.png'),
  TWO_COUNTRIES: require('../../assets/images/badges/TWO_COUNTRIES.png'),
  VOTE_30: require('../../assets/images/badges/VOTE_30.png'),
  WAVE_MASTER: require('../../assets/images/badges/WAVE_MASTER.png'),
  WAVE_WITH_WHALE: require('../../assets/images/badges/WAVE_WITH_WHALE.png'),
  WELCOME: require('../../assets/images/badges/WELCOME.png'),
  WILDCARD: require('../../assets/images/badges/WILDCARD.png'),
  WINTER_SURFER: require('../../assets/images/badges/WINTER_SURFER.png'),
  WINTER_WARRIOR: require('../../assets/images/badges/WINTER_WARRIOR.png'),
  WIPEOUT_DAY: require('../../assets/images/badges/WIPEOUT_DAY.png'),
};

const DISPLAY_DURATION = 3000;
const SLIDE_DURATION = 250;

const BadgeEarnedToast: React.FC = () => {
  const { queue, dismissFirst } = useBadgeNotificationStore();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  /** 큐의 첫 번째 뱃지가 현재 표시 대상 */
  const current: NewBadge | undefined = queue[0];

  useEffect(() => {
    if (!current) return;

    /** 슬라이드 인 애니메이션 */
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: SLIDE_DURATION, useNativeDriver: true }),
    ]).start();

    /** 자동 사라짐 타이머 */
    const timer = setTimeout(() => hide(), DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [current?.key]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: SLIDE_DURATION, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }),
    ]).start(() => {
      dismissFirst();
    });
  };

  if (!current) return null;

  const imgSrc = BADGE_IMAGES[current.key];

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={hide} style={styles.toast}>
        <View style={styles.iconWrap}>
          {imgSrc ? (
            <Image source={imgSrc} style={styles.icon} resizeMode="contain" />
          ) : (
            <Trophy size={28} color={colors.warning} />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>🏆 뱃지 획득!</Text>
          <Text style={styles.name} numberOfLines={1}>{current.nameKo}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
    /** 그림자 — iOS + Android */
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  icon: { width: '100%', height: '100%' },
  textWrap: { flex: 1 },
  title: { ...typography.caption, color: colors.warning, fontWeight: '700', marginBottom: 2 },
  name: { ...typography.body1, color: colors.text, fontWeight: '700' },
});

export default BadgeEarnedToast;
