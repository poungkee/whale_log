import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface VoteDistribution {
  spotId: string;
  date: string;
  perfect: number;
  flat: number;
  mediocre: number;
  totalVotes: number;
  userVote?: string | null;
}

interface SpotVoteProps {
  distribution: VoteDistribution;
  onVote: (voteType: 'PERFECT' | 'FLAT' | 'MEDIOCRE') => void;
}

const SpotVote: React.FC<SpotVoteProps> = ({ distribution, onVote }) => {
  const total = distribution.totalVotes || 1;
  const perfectPct = (distribution.perfect / total) * 100;
  const flatPct = (distribution.flat / total) * 100;
  const mediocrePct = (distribution.mediocre / total) * 100;

  return (
    <View style={styles.container}>
      {/* Vote Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, distribution.userVote === 'PERFECT' && styles.buttonActive]}
          onPress={() => onVote('PERFECT')}
        >
          <Text style={styles.emoji}>🤙</Text>
          <Text style={styles.buttonLabel}>Perfect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, distribution.userVote === 'FLAT' && styles.buttonActive]}
          onPress={() => onVote('FLAT')}
        >
          <Text style={styles.emoji}>😐</Text>
          <Text style={styles.buttonLabel}>Flat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, distribution.userVote === 'MEDIOCRE' && styles.buttonActive]}
          onPress={() => onVote('MEDIOCRE')}
        >
          <Text style={styles.emoji}>🌊</Text>
          <Text style={styles.buttonLabel}>Mediocre</Text>
        </TouchableOpacity>
      </View>

      {/* Distribution Bar */}
      <View style={styles.distributionBar}>
        <View style={[styles.barSegment, styles.perfectBar, { flex: perfectPct || 0.1 }]} />
        <View style={[styles.barSegment, styles.flatBar, { flex: flatPct || 0.1 }]} />
        <View style={[styles.barSegment, styles.mediocreBar, { flex: mediocrePct || 0.1 }]} />
      </View>

      <Text style={styles.totalVotes}>{distribution.totalVotes} votes today</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
  },
  buttonActive: {
    backgroundColor: colors.primaryLight + '30',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  buttonLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barSegment: {
    height: '100%',
  },
  perfectBar: {
    backgroundColor: colors.success,
  },
  flatBar: {
    backgroundColor: colors.warning,
  },
  mediocreBar: {
    backgroundColor: colors.error,
  },
  totalVotes: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SpotVote;
