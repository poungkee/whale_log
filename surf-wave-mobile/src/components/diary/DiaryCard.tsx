import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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

const BOARD_ICONS: Record<string, string> = {
  LONGBOARD: 'boat',
  SHORTBOARD: 'arrow-forward',
  FUNBOARD: 'happy',
  SUP: 'person',
};

const DiaryCard: React.FC<DiaryCardProps> = ({ diary, onPress }) => {
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
            <Icon name={BOARD_ICONS[diary.boardType] || 'water'} size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{diary.boardType}</Text>
          </View>
          <StarRating rating={diary.satisfaction} maxStars={5} size={14} />
        </View>
      </View>

      <Icon name="chevron-forward" size={20} color={colors.textTertiary} />
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
