import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import SpotConditions from '../../components/spot/SpotConditions';
import SpotVote from '../../components/spot/SpotVote';
import Button from '../../components/common/Button';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'SpotDetail'>;

const SpotDetailScreen: React.FC<Props> = ({ route }) => {
  const { spotId } = route.params;

  // TODO: Fetch spot details using spotId
  const spot = {
    id: spotId,
    name: 'Yangyang Beach',
    region: 'Yangyang',
    difficulty: 'INTERMEDIATE',
    rating: 4.5,
    description: 'A popular surf spot with consistent waves throughout the year.',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageText}>Spot Image</Text>
      </View>

      <View style={styles.content}>
        {/* Spot Info */}
        <View style={styles.header}>
          <Text style={styles.name}>{spot.name}</Text>
          <Text style={styles.region}>{spot.region}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{spot.difficulty}</Text>
            </View>
            <View style={[styles.badge, styles.ratingBadge]}>
              <Text style={styles.badgeText}>{spot.rating}</Text>
            </View>
          </View>
        </View>

        {/* Current Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>
          <SpotConditions forecast={{} as any} />
        </View>

        {/* Community Vote */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are the waves today?</Text>
          <SpotVote
            distribution={{ perfect: 10, flat: 3, mediocre: 2, totalVotes: 15, spotId, date: '' }}
            onVote={() => {}}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{spot.description}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Add to Favorites" variant="outline" onPress={() => {}} />
          <Button title="Start Session" onPress={() => {}} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    ...typography.body1,
    color: colors.textTertiary,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  region: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray200,
    borderRadius: 8,
  },
  ratingBadge: {
    backgroundColor: colors.warning,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default SpotDetailScreen;
