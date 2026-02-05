import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Guide {
  id: string;
  title: string;
  category: string;
  thumbnailUrl?: string;
  estimatedReadMinutes: number;
  isCompleted?: boolean;
}

interface GuideCardProps {
  guide: Guide;
  onPress: () => void;
}

const GuideCard: React.FC<GuideCardProps> = ({ guide, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumbnailContainer}>
        {guide.thumbnailUrl ? (
          <Image source={{ uri: guide.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="book-outline" size={24} color={colors.textTertiary} />
          </View>
        )}
        {guide.isCompleted && (
          <View style={styles.completedBadge}>
            <Icon name="checkmark" size={16} color={colors.textInverse} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{guide.category}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{guide.title}</Text>
        <View style={styles.meta}>
          <Icon name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>{guide.estimatedReadMinutes} min read</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    ...typography.body1,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

export default GuideCard;
