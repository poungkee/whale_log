// 다이어리 카드 — 날짜/스팟명/보드/만족도 표시
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Ship, ArrowRight, Smile, User, Waves } from 'lucide-react-native';
import StarRating from '../common/StarRating';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Diary {
  id: string;
  spotName: string;
  surfDate: string;
  boardType: string;
  satisfaction: number;
  images?: { imageUrl: string }[];
}

interface DiaryCardProps {
  diary: Diary;
  onPress: () => void;
}

const getBoardIcon = (boardType: string) => {
  switch (boardType) {
    case 'LONGBOARD': return Ship;
    case 'SHORTBOARD': return ArrowRight;
    case 'FUNBOARD': return Smile;
    case 'SUP': return User;
    default: return Waves;
  }
};

const DiaryCard: React.FC<DiaryCardProps> = ({ diary, onPress }) => {
  const BoardIcon = getBoardIcon(diary.boardType);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.dateContainer}>
        <Text style={styles.day}>{new Date(diary.surfDate).getDate()}</Text>
        <Text style={styles.month}>{new Date(diary.surfDate).toLocaleString('default', { month: 'short' })}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.spotName}>{diary.spotName}</Text>
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <BoardIcon size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{diary.boardType}</Text>
          </View>
          <StarRating rating={diary.satisfaction} maxStars={5} size={14} />
        </View>
      </View>

      <ChevronRight size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dateContainer: {
    width: 50,
    alignItems: 'center',
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  day: {
    ...typography.h3,
    color: colors.primary,
  },
  month: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  spotName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default DiaryCard;
