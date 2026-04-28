// 마이페이지 화면 — 프로필/통계/뱃지 3탭 + 설정 시트 (웹앱 MyPage.tsx 1:1 대응)
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Modal, Alert, Switch, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Settings, ChevronRight, Waves, Clock, MapPin, Star, BookOpen,
  Trophy, Bell, X, Shield, Award,
} from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { MyPageStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'MyPage'>;
};

// ── 탭 타입 ──────────────────────────────────────────────────────────
type MyInfoTab = 'profile' | 'stats' | 'badges';

// ── 레벨 설정 (웹앱 동일) ────────────────────────────────────────────
const ALL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
type SurfLevel = typeof ALL_LEVELS[number];
const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '상급', EXPERT: '전문가',
};
const LEVEL_COLORS: Record<SurfLevel, string> = {
  BEGINNER: '#32CD32', INTERMEDIATE: '#008CBA', ADVANCED: '#FF8C00', EXPERT: '#FF4444',
};

// ── 보드 타입 설정 (웹앱 동일) ────────────────────────────────────────
const ALL_BOARDS = ['LONGBOARD', 'FUNBOARD', 'MIDLENGTH', 'FISH', 'SHORTBOARD', 'SUP', 'BODYBOARD', 'FOILBOARD', 'SOFTBOARD'] as const;
type BoardType = typeof ALL_BOARDS[number];
const BOARD_LABELS: Record<BoardType, string> = {
  LONGBOARD: '롱보드', FUNBOARD: '펀보드', MIDLENGTH: '미드렝스', FISH: '피쉬',
  SHORTBOARD: '숏보드', SUP: 'SUP', BODYBOARD: '바디보드', FOILBOARD: '포일보드', SOFTBOARD: '소프트보드',
};
const BOARD_COLORS: Record<BoardType, string> = {
  LONGBOARD: '#32CD32', FUNBOARD: '#008CBA', MIDLENGTH: '#6366F1', FISH: '#EC4899',
  SHORTBOARD: '#FF8C00', SUP: '#14B8A6', BODYBOARD: '#8B5CF6', FOILBOARD: '#0EA5E9', SOFTBOARD: '#F97316',
};

// ── 뱃지 카테고리 (웹앱 동일 12개) ───────────────────────────────────
const BADGE_CATEGORIES = [
  { key: 'ALL', label: '전체' },
  { key: 'PROFILE', label: '프로필' },
  { key: 'DIARY', label: '다이어리' },
  { key: 'RECORD', label: '기록' },
  { key: 'BOARD', label: '보드' },
  { key: 'SPOT', label: '스팟' },
  { key: 'TIME', label: '시간대' },
  { key: 'SATISFACTION', label: '만족도' },
  { key: 'STREAK', label: '연속' },
  { key: 'COMMUNITY', label: '커뮤니티' },
  { key: 'STORY', label: '스토리' },
  { key: 'LIMITED', label: '한정' },
];

// ── 뱃지 이미지 맵 (59개 전체 — require 정적 분석 필요) ──────────────
const BADGE_IMAGES: Record<string, any> = {
  ANNIVERSARY_2026: require('../../../assets/images/badges/ANNIVERSARY_2026.png'),
  ANNIVERSARY_2027: require('../../../assets/images/badges/ANNIVERSARY_2027.png'),
  BALI_SURFER: require('../../../assets/images/badges/BALI_SURFER.png'),
  BOARD_3: require('../../../assets/images/badges/BOARD_3.png'),
  BOARD_5: require('../../../assets/images/badges/BOARD_5.png'),
  BOARD_7: require('../../../assets/images/badges/BOARD_7.png'),
  BOARD_ALL: require('../../../assets/images/badges/BOARD_ALL.png'),
  CURSED_SURFER: require('../../../assets/images/badges/CURSED_SURFER.png'),
  DAWN_SURFER: require('../../../assets/images/badges/DAWN_SURFER.png'),
  DAY_ONE_DIARY: require('../../../assets/images/badges/DAY_ONE_DIARY.png'),
  DEEP_FISH: require('../../../assets/images/badges/DEEP_FISH.png'),
  DIARY_10: require('../../../assets/images/badges/DIARY_10.png'),
  DIARY_100: require('../../../assets/images/badges/DIARY_100.png'),
  DOUBLE_SESSION: require('../../../assets/images/badges/DOUBLE_SESSION.png'),
  EARLY_BIRD: require('../../../assets/images/badges/EARLY_BIRD.png'),
  FAVORITE_10: require('../../../assets/images/badges/FAVORITE_10.png'),
  FAVORITE_20: require('../../../assets/images/badges/FAVORITE_20.png'),
  FIRST_DIARY: require('../../../assets/images/badges/FIRST_DIARY.png'),
  FIRST_FAVORITE: require('../../../assets/images/badges/FIRST_FAVORITE.png'),
  FIRST_PHOTO_DIARY: require('../../../assets/images/badges/FIRST_PHOTO_DIARY.png'),
  FIRST_VOTE: require('../../../assets/images/badges/FIRST_VOTE.png'),
  FIRST_WAVER: require('../../../assets/images/badges/FIRST_WAVER.png'),
  FLAT_DAY: require('../../../assets/images/badges/FLAT_DAY.png'),
  FOUNDER: require('../../../assets/images/badges/FOUNDER.png'),
  FOUR_SEASONS: require('../../../assets/images/badges/FOUR_SEASONS.png'),
  GUIDE_5: require('../../../assets/images/badges/GUIDE_5.png'),
  GUIDE_ALL: require('../../../assets/images/badges/GUIDE_ALL.png'),
  KOREAN_SURFER: require('../../../assets/images/badges/KOREAN_SURFER.png'),
  NIGHT_OWL: require('../../../assets/images/badges/NIGHT_OWL.png'),
  OCEAN_CRUSH: require('../../../assets/images/badges/OCEAN_CRUSH.png'),
  PERFECT_DAY: require('../../../assets/images/badges/PERFECT_DAY.png'),
  PHOTO_DIARY_100: require('../../../assets/images/badges/PHOTO_DIARY_100.png'),
  PHOTO_DIARY_20: require('../../../assets/images/badges/PHOTO_DIARY_20.png'),
  PHOTO_DIARY_50: require('../../../assets/images/badges/PHOTO_DIARY_50.png'),
  PRO_SURFER: require('../../../assets/images/badges/PRO_SURFER.png'),
  PROFILE_COMPLETE: require('../../../assets/images/badges/PROFILE_COMPLETE.png'),
  REBEL_SURFER: require('../../../assets/images/badges/REBEL_SURFER.png'),
  REVENGE_WAVE: require('../../../assets/images/badges/REVENGE_WAVE.png'),
  ROLLERCOASTER: require('../../../assets/images/badges/ROLLERCOASTER.png'),
  SECRET_SPOT: require('../../../assets/images/badges/SECRET_SPOT.png'),
  SOMMELIER: require('../../../assets/images/badges/SOMMELIER.png'),
  STREAK_30: require('../../../assets/images/badges/STREAK_30.png'),
  STREAK_7: require('../../../assets/images/badges/STREAK_7.png'),
  STUBBORN: require('../../../assets/images/badges/STUBBORN.png'),
  SUNSET_SURFER: require('../../../assets/images/badges/SUNSET_SURFER.png'),
  SURF_BUDDY: require('../../../assets/images/badges/SURF_BUDDY.png'),
  SURF_CLASSMATE: require('../../../assets/images/badges/SURF_CLASSMATE.png'),
  TEARS_OF_WAVE: require('../../../assets/images/badges/TEARS_OF_WAVE.png'),
  THREE_COUNTRIES: require('../../../assets/images/badges/THREE_COUNTRIES.png'),
  TIME_CAPSULE: require('../../../assets/images/badges/TIME_CAPSULE.png'),
  TWO_COUNTRIES: require('../../../assets/images/badges/TWO_COUNTRIES.png'),
  VOTE_30: require('../../../assets/images/badges/VOTE_30.png'),
  WAVE_MASTER: require('../../../assets/images/badges/WAVE_MASTER.png'),
  WAVE_WITH_WHALE: require('../../../assets/images/badges/WAVE_WITH_WHALE.png'),
  WELCOME: require('../../../assets/images/badges/WELCOME.png'),
  WILDCARD: require('../../../assets/images/badges/WILDCARD.png'),
  WINTER_SURFER: require('../../../assets/images/badges/WINTER_SURFER.png'),
  WINTER_WARRIOR: require('../../../assets/images/badges/WINTER_WARRIOR.png'),
  WIPEOUT_DAY: require('../../../assets/images/badges/WIPEOUT_DAY.png'),
};

// 뱃지 타입 (웹앱 /badges/me — 획득+미획득 전체 반환)
interface BadgeItem {
  key: string;
  nameKo: string;
  descriptionKo: string;
  icon: string;
  category: string;
  isHidden: boolean;
  isEarned: boolean;
  earnedAt: string | null;
}

// 서핑 통계 타입
interface SurfStats {
  totalSessions: number;
  totalHours: number;
  uniqueSpots: number;
  avgSatisfaction: number;
  thisMonthSessions: number;
  topSpotName: string | null;
  topSpotCount?: number;
}

// 획득일 포맷 "YYYY.MM.DD"
function formatBadgeDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const MyPageScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<MyInfoTab>('profile');
  const [showSettings, setShowSettings] = useState(false);

  // 레벨/보드 아코디언
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [boardFtInput, setBoardFtInput] = useState('');

  // 뱃지 상세 팝업
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState('ALL');

  // ── API: 서핑 통계 ────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<SurfStats>({
    queryKey: ['surfStats'],
    queryFn: () => api.get('/diaries/stats').then(r => r.data),
    retry: false,
  });

  // ── API: 전체 뱃지 목록 (획득+미획득) ────────────────────────────
  const { data: badges = [], isLoading: badgesLoading } = useQuery<BadgeItem[]>({
    queryKey: ['allBadges'],
    queryFn: () => api.get('/badges/me').then(r => r.data),
    retry: false,
  });

  // 카테고리 필터링된 뱃지
  const filteredBadges = useMemo(() => {
    if (selectedBadgeCategory === 'ALL') return badges;
    return badges.filter(b => b.category === selectedBadgeCategory);
  }, [badges, selectedBadgeCategory]);

  const earnedCount = useMemo(() => badges.filter(b => b.isEarned).length, [badges]);

  // ── API: 레벨 변경 ────────────────────────────────────────────────
  const levelMutation = useMutation({
    mutationFn: (surfLevel: string) => api.patch('/users/me', { surfLevel }),
    onSuccess: (res) => {
      updateUser({ surfLevel: res.data.surfLevel });
      setShowLevelPicker(false);
    },
    onError: () => Alert.alert('오류', '레벨 변경에 실패했어요.'),
  });

  // ── API: 보드 타입 변경 ───────────────────────────────────────────
  const boardMutation = useMutation({
    mutationFn: (boardType: string) => api.patch('/users/me', { boardType }),
    onSuccess: (res) => {
      updateUser({ boardType: res.data.boardType });
      setShowBoardPicker(false);
    },
    onError: () => Alert.alert('오류', '보드 타입 변경에 실패했어요.'),
  });

  // ── API: 보드 사이즈(ft) 저장 ─────────────────────────────────────
  const boardFtMutation = useMutation({
    mutationFn: (boardSizeFt: number | null) => api.patch('/users/me', { boardSizeFt }),
    onSuccess: () => Alert.alert('저장됨', '보드 길이가 저장됐어요.'),
    onError: () => Alert.alert('오류', '저장에 실패했어요.'),
  });

  const currentLevel = (user?.surfLevel as SurfLevel) ?? 'BEGINNER';
  const currentBoard = (user?.boardType as BoardType) ?? 'LONGBOARD';

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { setShowSettings(false); logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── 헤더 ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>마이인포</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={s.settingsBtn}>
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── 내부 탭 바 ── */}
      <View style={s.tabBar}>
        {(['profile', 'stats', 'badges'] as MyInfoTab[]).map(tab => {
          const labels: Record<MyInfoTab, string> = { profile: '프로필', stats: '통계', badges: '뱃지' };
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[s.tabItem, active && s.tabItemActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{labels[tab]}</Text>
              {tab === 'badges' && earnedCount > 0 && (
                <View style={s.badgeCountBubble}>
                  <Text style={s.badgeCountText}>{earnedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════════════ 프로필 탭 ══════════════ */}
        {activeTab === 'profile' && (
          <View style={s.tabContent}>

            {/* 그라데이션 프로필 카드 */}
            <View style={s.profileGradient}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarEmoji}>🏄‍♂️</Text>
              </View>
              <View style={s.profileTextArea}>
                <Text style={s.profileName}>{user?.nickname || '서퍼'}</Text>
                {user?.email ? <Text style={s.profileEmail}>{user.email}</Text> : null}
                <View style={s.badgeRow}>
                  <View style={[s.levelBadge, { backgroundColor: LEVEL_COLORS[currentLevel] + '25' }]}>
                    <Text style={[s.levelBadgeText, { color: LEVEL_COLORS[currentLevel] }]}>
                      {LEVEL_LABELS[currentLevel]}
                    </Text>
                  </View>
                  <View style={[s.boardBadge, { backgroundColor: (BOARD_COLORS[currentBoard] ?? '#999') + '25' }]}>
                    <Text style={[s.boardBadgeText, { color: BOARD_COLORS[currentBoard] ?? '#999' }]}>
                      {BOARD_LABELS[currentBoard] ?? currentBoard}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 레벨 · 보드 변경 아코디언 */}
            <View style={s.pickerCard}>

              {/* 레벨 변경 행 */}
              <TouchableOpacity
                style={s.pickerRow}
                onPress={() => { setShowLevelPicker(!showLevelPicker); setShowBoardPicker(false); }}
              >
                <Text style={s.pickerLabel}>서핑 레벨</Text>
                <View style={s.pickerRight}>
                  <Text style={[s.pickerValue, { color: LEVEL_COLORS[currentLevel] }]}>
                    {LEVEL_LABELS[currentLevel]}
                  </Text>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>

              {showLevelPicker && (
                <View style={s.pickerExpand}>
                  {ALL_LEVELS.map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[s.pickerOption, currentLevel === level && s.pickerOptionActive]}
                      onPress={() => levelMutation.mutate(level)}
                    >
                      <Text style={[s.pickerOptionText, { color: LEVEL_COLORS[level] }]}>
                        {LEVEL_LABELS[level]}
                      </Text>
                      {currentLevel === level && <Text style={s.pickerCurrent}>현재</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={s.pickerDivider} />

              {/* 보드 변경 행 */}
              <TouchableOpacity
                style={s.pickerRow}
                onPress={() => { setShowBoardPicker(!showBoardPicker); setShowLevelPicker(false); }}
              >
                <Text style={s.pickerLabel}>보드 타입</Text>
                <View style={s.pickerRight}>
                  <Text style={[s.pickerValue, { color: BOARD_COLORS[currentBoard] ?? '#999' }]}>
                    {BOARD_LABELS[currentBoard] ?? currentBoard}
                  </Text>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>

              {showBoardPicker && (
                <View style={s.pickerExpand}>
                  {ALL_BOARDS.map(board => (
                    <TouchableOpacity
                      key={board}
                      style={[s.pickerOption, currentBoard === board && s.pickerOptionActive]}
                      onPress={() => boardMutation.mutate(board)}
                    >
                      <Text style={[s.pickerOptionText, { color: BOARD_COLORS[board] }]}>
                        {BOARD_LABELS[board]}
                      </Text>
                      {currentBoard === board && <Text style={s.pickerCurrent}>현재</Text>}
                    </TouchableOpacity>
                  ))}

                  {/* 보드 길이 입력 */}
                  <View style={s.boardFtRow}>
                    <Text style={s.boardFtLabel}>보드 길이 (선택)</Text>
                    <View style={s.boardFtInputRow}>
                      <TextInput
                        style={s.boardFtInput}
                        value={boardFtInput}
                        onChangeText={setBoardFtInput}
                        placeholder="예: 6.2"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <Text style={s.boardFtUnit}>ft</Text>
                      <TouchableOpacity
                        style={s.boardFtSave}
                        onPress={() => {
                          const ft = boardFtInput.trim() ? parseFloat(boardFtInput) : null;
                          boardFtMutation.mutate(ft);
                        }}
                      >
                        <Text style={s.boardFtSaveText}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 즐겨찾기 바로가기 */}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Text style={s.menuItemLabel}>⭐ 즐겨찾기 스팟</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* 프로필 편집 */}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={s.menuItemLabel}>✏️ 프로필 편집</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>

          </View>
        )}

        {/* ══════════════ 통계 탭 ══════════════ */}
        {activeTab === 'stats' && (
          <View style={s.tabContent}>

            {statsLoading && (
              <View style={s.statsCard}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {!statsLoading && (stats?.totalSessions ?? 0) > 0 && (
              <>
                {/* 핵심 수치 4개 */}
                <View style={s.statsCard}>
                  <View style={s.statsGrid}>
                    <View style={s.statCell}>
                      <Waves size={16} color="#60A5FA" />
                      <Text style={s.statNum}>{stats!.totalSessions}</Text>
                      <Text style={s.statLbl}>세션</Text>
                    </View>
                    <View style={s.statCell}>
                      <Clock size={16} color="#4ADE80" />
                      <Text style={s.statNum}>{stats!.totalHours}</Text>
                      <Text style={s.statLbl}>시간</Text>
                    </View>
                    <View style={s.statCell}>
                      <MapPin size={16} color="#FB923C" />
                      <Text style={s.statNum}>{stats!.uniqueSpots}</Text>
                      <Text style={s.statLbl}>스팟</Text>
                    </View>
                    <View style={s.statCell}>
                      <Star size={16} color="#FACC15" />
                      <Text style={s.statNum}>{stats!.avgSatisfaction ? stats!.avgSatisfaction.toFixed(1) : '-'}</Text>
                      <Text style={s.statLbl}>만족도</Text>
                    </View>
                  </View>

                  {/* 이번 달 + 최다 방문 스팟 */}
                  <View style={s.statsSub}>
                    <View style={s.statsSubRow}>
                      <Text style={s.statsSubLabel}>이번 달 서핑</Text>
                      <Text style={s.statsSubValue}>
                        {(stats!.thisMonthSessions ?? 0) > 0 ? `${stats!.thisMonthSessions}회` : '아직 없어요'}
                      </Text>
                    </View>
                    {stats!.topSpotName && (
                      <View style={s.statsSubRow}>
                        <Text style={s.statsSubLabel}>최다 방문 스팟</Text>
                        <Text style={s.statsSubValue}>
                          {stats!.topSpotName}{stats!.topSpotCount ? ` (${stats!.topSpotCount}회)` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 다이어리 바로가기 */}
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => navigation.navigate('DiaryList')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={16} color={colors.primary} />
                    <Text style={s.menuItemLabel}>서핑 다이어리 전체 보기</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </>
            )}

            {!statsLoading && (stats?.totalSessions ?? 0) === 0 && (
              <View style={s.emptyState}>
                <Waves size={40} color={colors.textTertiary} style={{ opacity: 0.3 }} />
                <Text style={s.emptyTitle}>아직 서핑 기록이 없어요</Text>
                <Text style={s.emptyDesc}>다이어리에 기록을 남기면 통계가 표시돼요</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('DiaryList')}
                >
                  <BookOpen size={14} color="#fff" />
                  <Text style={s.emptyBtnText}>다이어리 열기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ══════════════ 뱃지 탭 ══════════════ */}
        {activeTab === 'badges' && (
          <View style={s.tabContent}>

            {/* 획득 수 헤더 */}
            {!badgesLoading && badges.length > 0 && (
              <View style={s.badgesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Trophy size={16} color="#EAB308" />
                  <Text style={s.badgesHeaderTitle}>내 뱃지</Text>
                </View>
                <Text style={s.badgesHeaderCount}>{earnedCount}/{badges.length}개 획득</Text>
              </View>
            )}

            {/* 카테고리 필터 칩 (가로 스크롤) */}
            {!badgesLoading && badges.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
                {BADGE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[s.catChip, selectedBadgeCategory === cat.key && s.catChipActive]}
                    onPress={() => setSelectedBadgeCategory(cat.key)}
                  >
                    <Text style={[s.catChipText, selectedBadgeCategory === cat.key && s.catChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 로딩 */}
            {badgesLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            )}

            {/* 뱃지 그리드 (4열) */}
            {!badgesLoading && filteredBadges.length > 0 && (
              <View style={s.badgeGrid}>
                {filteredBadges.map(badge => (
                  <TouchableOpacity
                    key={badge.key}
                    style={s.badgeCell}
                    onPress={() => setSelectedBadge(badge)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      s.badgeImgWrap,
                      badge.isEarned ? s.badgeEarned : s.badgeUnearned,
                    ]}>
                      {BADGE_IMAGES[badge.key] ? (
                        <Image
                          source={BADGE_IMAGES[badge.key]}
                          style={s.badgeImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={{ fontSize: 22 }}>{badge.icon || '🏅'}</Text>
                      )}
                    </View>
                    <Text style={[s.badgeName, !badge.isEarned && { color: colors.textTertiary }]} numberOfLines={2}>
                      {badge.nameKo}
                    </Text>
                    {badge.isEarned && badge.earnedAt && (
                      <Text style={s.badgeDate}>{formatBadgeDate(badge.earnedAt)}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!badgesLoading && badges.length === 0 && (
              <View style={s.emptyState}>
                <Trophy size={40} color={colors.textTertiary} style={{ opacity: 0.3 }} />
                <Text style={s.emptyTitle}>뱃지 정보를 불러올 수 없어요</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ══════════════ 뱃지 상세 모달 ══════════════ */}
      <Modal visible={!!selectedBadge} transparent animationType="slide" onRequestClose={() => setSelectedBadge(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSelectedBadge(null)}>
          <TouchableOpacity style={s.modalSheet} activeOpacity={1} onPress={() => {}}>
            {selectedBadge && (
              <>
                <View style={s.modalBadgeWrap}>
                  <View style={[
                    s.modalBadgeCircle,
                    selectedBadge.isEarned ? s.badgeEarned : s.badgeUnearned,
                  ]}>
                    {BADGE_IMAGES[selectedBadge.key] ? (
                      <Image source={BADGE_IMAGES[selectedBadge.key]} style={s.modalBadgeImg} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{selectedBadge.icon || '🏅'}</Text>
                    )}
                  </View>
                  <Text style={s.modalBadgeTitle}>{selectedBadge.nameKo}</Text>
                  <Text style={s.modalBadgeCat}>{selectedBadge.category}</Text>
                </View>
                <Text style={s.modalBadgeDesc}>{selectedBadge.descriptionKo}</Text>
                {selectedBadge.isEarned && selectedBadge.earnedAt && (
                  <Text style={s.modalBadgeEarned}>🏆 {formatBadgeDate(selectedBadge.earnedAt)} 획득</Text>
                )}
                {!selectedBadge.isEarned && (
                  <Text style={s.modalBadgeUnearned}>아직 획득하지 못한 뱃지예요</Text>
                )}
                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setSelectedBadge(null)}>
                  <Text style={s.modalCloseBtnText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════ 설정 시트 ══════════════ */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <TouchableOpacity style={s.settingsSheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.settingsHeaderRow}>
              <Text style={s.settingsTitle}>설정</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.settingsDivider} />

            {/* 알림 (토글 — 실제 기능은 추후) */}
            <View style={s.settingsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Bell size={16} color={colors.primary} />
                <View>
                  <Text style={s.settingsRowLabel}>알림 설정</Text>
                  <Text style={s.settingsRowDesc}>서핑 컨디션 알림</Text>
                </View>
              </View>
              <Switch
                value={false}
                thumbColor="#fff"
                trackColor={{ false: colors.gray200, true: colors.primary }}
              />
            </View>

            <View style={s.settingsDivider} />

            {/* 관리자 패널 (ADMIN만 노출) */}
            {user?.role === 'ADMIN' && (
              <>
                <TouchableOpacity
                  style={s.settingsRow}
                  onPress={() => {
                    setShowSettings(false);
                    navigation.navigate('Admin');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Shield size={16} color={colors.error} />
                    <Text style={[s.settingsRowLabel, { color: colors.error }]}>관리자 패널</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={s.settingsDivider} />
              </>
            )}

            {/* 로그아웃 */}
            <TouchableOpacity style={s.settingsRow} onPress={handleLogout}>
              <Text style={[s.settingsRowLabel, { color: colors.error }]}>로그아웃</Text>
            </TouchableOpacity>

            <View style={s.settingsDivider} />

            {/* 앱 정보 */}
            <View style={s.settingsRow}>
              <Text style={s.settingsRowLabel}>앱 정보</Text>
              <Text style={s.settingsRowDesc}>v1.0.0</Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

// ── 스타일 ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, fontWeight: '700', color: colors.text },
  settingsBtn: { padding: 6 },

  // 탭 바
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 4,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: colors.primary },
  badgeCountBubble: {
    backgroundColor: colors.primary + '20', borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  badgeCountText: { fontSize: 10, color: colors.primary, fontWeight: '700' },

  tabContent: { padding: spacing.lg, gap: spacing.md },

  // 프로필 그라데이션 카드
  profileGradient: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  profileTextArea: { flex: 1 },
  profileName: { ...typography.h3, fontWeight: '700', color: colors.text, marginBottom: 2 },
  profileEmail: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  levelBadgeText: { fontSize: 12, fontWeight: '600' },
  boardBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  boardBadgeText: { fontSize: 12, fontWeight: '600' },

  // 레벨/보드 아코디언 카드
  pickerCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  pickerLabel: { ...typography.body2, fontWeight: '600', color: colors.text },
  pickerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickerValue: { fontSize: 14, fontWeight: '600' },
  pickerDivider: { height: 1, backgroundColor: colors.border },
  pickerExpand: {
    backgroundColor: colors.surfaceSecondary + '80',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8,
  },
  pickerOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  pickerOptionText: { fontSize: 14, fontWeight: '600' },
  pickerCurrent: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  // 보드 ft 입력
  boardFtRow: {
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border + '80',
    gap: 6,
  },
  boardFtLabel: { fontSize: 11, color: colors.textSecondary },
  boardFtInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardFtInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: colors.text, textAlign: 'center',
  },
  boardFtUnit: { fontSize: 13, color: colors.textSecondary },
  boardFtSave: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  boardFtSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // 메뉴 아이템
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  menuItemLabel: { ...typography.body2, fontWeight: '600', color: colors.text },

  // 통계 카드
  statsCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  statsGrid: { flexDirection: 'row', marginBottom: spacing.md },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { ...typography.h3, fontWeight: '900', color: colors.text },
  statLbl: { fontSize: 10, color: colors.textSecondary },
  statsSub: {
    backgroundColor: colors.surfaceSecondary + '80',
    borderRadius: 10, padding: 10, gap: 6,
  },
  statsSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsSubLabel: { fontSize: 12, color: colors.textSecondary },
  statsSubValue: { fontSize: 12, fontWeight: '600', color: colors.text },

  // 빈 상태
  emptyState: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg,
    gap: 8,
  },
  emptyTitle: { ...typography.body1, fontWeight: '600', color: colors.textSecondary },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 4,
  },
  emptyBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // 뱃지 탭
  badgesHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgesHeaderTitle: { ...typography.body2, fontWeight: '700', color: colors.text },
  badgesHeaderCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  catScroll: { marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: colors.surfaceSecondary,
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  catChipTextActive: { color: '#fff' },

  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  badgeCell: {
    width: '22%', alignItems: 'center', gap: 4,
  },
  badgeImgWrap: {
    width: 56, height: 56, borderRadius: 28,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  badgeEarned: { borderWidth: 2, borderColor: '#FCD34D' },
  badgeUnearned: { opacity: 0.35 },
  badgeImg: { width: 52, height: 52 },
  badgeName: {
    fontSize: 10, color: colors.text, textAlign: 'center',
    fontWeight: '600', lineHeight: 13,
  },
  badgeDate: { fontSize: 9, color: colors.primary, fontWeight: '500' },

  // 뱃지 상세 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    width: '100%', padding: spacing.lg, paddingBottom: 40,
  },
  modalBadgeWrap: { alignItems: 'center', gap: 8, marginBottom: spacing.md },
  modalBadgeCircle: {
    width: 80, height: 80, borderRadius: 40,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  modalBadgeImg: { width: 76, height: 76 },
  modalBadgeTitle: { ...typography.h3, fontWeight: '700', color: colors.text },
  modalBadgeCat: { fontSize: 12, color: colors.textSecondary },
  modalBadgeDesc: {
    ...typography.body2, color: colors.textSecondary, textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalBadgeEarned: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'center', marginBottom: spacing.md },
  modalBadgeUnearned: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md },
  modalCloseBtn: {
    backgroundColor: colors.surfaceSecondary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseBtnText: { ...typography.body1, fontWeight: '600', color: colors.text },

  // 설정 시트
  settingsSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    width: '100%', paddingBottom: 40,
  },
  settingsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 12,
  },
  settingsTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  settingsDivider: { height: 1, backgroundColor: colors.border },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  settingsRowLabel: { ...typography.body2, fontWeight: '500', color: colors.text },
  settingsRowDesc: { fontSize: 12, color: colors.textSecondary },
});

export default MyPageScreen;
