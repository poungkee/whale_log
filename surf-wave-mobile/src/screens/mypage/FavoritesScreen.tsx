// 즐겨찾기 스팟 화면 — GET /spots/favorites로 조회, 스팟 카드 목록 표시
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, Waves, Wind, Thermometer, MapPin } from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { MyPageStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'MyPage'>;
};

// 즐겨찾기 스팟 타입
interface FavoriteSpot {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  latitude: number;
  longitude: number;
}

// 난이도 한국어 변환
const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: '입문', INTERMEDIATE: '초급', ADVANCED: '중급', EXPERT: '고급',
};

const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const queryClient = useQueryClient();

  // 즐겨찾기 목록 조회
  const { data: spots, isLoading, refetch, isRefetching } = useQuery<FavoriteSpot[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get('/spots/favorites').then(r => r.data),
  });

  // 즐겨찾기 해제
  const removeMutation = useMutation({
    mutationFn: (spotId: string) => api.delete(`/spots/${spotId}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => {
      Alert.alert('오류', '즐겨찾기 해제에 실패했습니다.');
    },
  });

  const handleRemove = (spotId: string, spotName: string) => {
    Alert.alert(
      '즐겨찾기 해제',
      `${spotName}을(를) 즐겨찾기에서 제거할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '해제', style: 'destructive', onPress: () => removeMutation.mutate(spotId) },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>즐겨찾기 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Heart size={20} color={colors.accent} fill={colors.accent} />
        <Text style={styles.headerTitle}>즐겨찾기 스팟</Text>
        <Text style={styles.headerCount}>{spots?.length ?? 0}개</Text>
      </View>

      {!spots || spots.length === 0 ? (
        // 빈 상태
        <View style={styles.center}>
          <Heart size={48} color={colors.gray300} />
          <Text style={styles.emptyTitle}>즐겨찾기가 없어요</Text>
          <Text style={styles.emptyDesc}>홈 화면에서 ♥를 눌러 스팟을 저장하세요</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.spotCard}>
              <View style={styles.spotInfo}>
                <View style={styles.spotLeft}>
                  <Text style={styles.spotName}>{item.name}</Text>
                  <View style={styles.spotMeta}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={styles.spotRegion}>{item.region}</Text>
                    <View style={styles.diffChip}>
                      <Text style={styles.diffText}>
                        {DIFFICULTY_LABEL[item.difficulty] || item.difficulty}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* 즐겨찾기 해제 버튼 */}
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => handleRemove(item.id, item.name)}
                  disabled={removeMutation.isPending}
                >
                  <Heart size={20} color={colors.accent} fill={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.body1, fontWeight: '700', color: colors.text, flex: 1 },
  headerCount: { ...typography.body2, color: colors.textSecondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body2, color: colors.textSecondary },
  emptyTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  emptyDesc: { ...typography.body2, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },

  list: { padding: spacing.lg, gap: spacing.sm },

  spotCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  spotInfo: { flexDirection: 'row', alignItems: 'center' },
  spotLeft: { flex: 1 },
  spotName: { ...typography.body1, fontWeight: '700', color: colors.text, marginBottom: 4 },
  spotMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spotRegion: { ...typography.caption, color: colors.textTertiary },
  diffChip: {
    marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: colors.primary + '20', borderRadius: 6,
  },
  diffText: { fontSize: 10, color: colors.primary, fontWeight: '700' },

  heartBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center', alignItems: 'center',
  },
});

export default FavoritesScreen;
