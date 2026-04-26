// 스팟 카드 — 스팟 이름, 지역, 난이도, 점수 표시
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ViewStyle, StyleProp } from 'react-native';
import { Waves, Heart, Star } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Spot {
  id: string;
  name: string;
  region?: string;
  imageUrl?: string;
  difficulty?: string;
  rating?: number;
  isFavorited?: boolean;
}

interface SpotCardProps {
  spot: Spot;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {spot.imageUrl ? (
          <Image source={{ uri: spot.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Waves size={32} color={colors.textTertiary} />
          </View>
        )}
        {spot.isFavorited && (
          <View style={styles.favoriteIcon}>
            <Heart size={16} color={colors.error} fill={colors.error} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>
        {spot.region && <Text style={styles.region}>{spot.region}</Text>}

        <View style={styles.footer}>
          {spot.difficulty && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{spot.difficulty}</Text>
            </View>
          )}
          {spot.rating && (
            <View style={styles.rating}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>{spot.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  region: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
});

export default SpotCard;
