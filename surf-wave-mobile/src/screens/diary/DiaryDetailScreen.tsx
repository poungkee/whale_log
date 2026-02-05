import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import StarRating from '../../components/common/StarRating';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<MyPageStackParamList, 'DiaryDetail'>;

const DiaryDetailScreen: React.FC<Props> = ({ route }) => {
  const { diaryId } = route.params;

  // TODO: Fetch diary details
  const diary = {
    id: diaryId,
    spotName: 'Yangyang Beach',
    surfDate: '2024-01-15',
    boardType: 'LONGBOARD',
    durationMinutes: 120,
    satisfaction: 5,
    memo: 'Amazing session! The waves were perfect and the weather was great.',
    waveHeight: 1.2,
    wavePeriod: 8,
    windSpeed: 10,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{diary.surfDate}</Text>
        <Text style={styles.spot}>{diary.spotName}</Text>
        <StarRating rating={diary.satisfaction} maxStars={5} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Board</Text>
          <Text style={styles.detailValue}>{diary.boardType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{diary.durationMinutes} minutes</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conditions</Text>
        <View style={styles.conditionsGrid}>
          <View style={styles.conditionItem}>
            <Text style={styles.conditionValue}>{diary.waveHeight}m</Text>
            <Text style={styles.conditionLabel}>Waves</Text>
          </View>
          <View style={styles.conditionItem}>
            <Text style={styles.conditionValue}>{diary.wavePeriod}s</Text>
            <Text style={styles.conditionLabel}>Period</Text>
          </View>
          <View style={styles.conditionItem}>
            <Text style={styles.conditionValue}>{diary.windSpeed}km/h</Text>
            <Text style={styles.conditionLabel}>Wind</Text>
          </View>
        </View>
      </View>

      {diary.memo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.memo}>{diary.memo}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  date: {
    ...typography.body2,
    color: colors.textInverse,
    opacity: 0.8,
  },
  spot: {
    ...typography.h3,
    color: colors.textInverse,
    marginVertical: spacing.sm,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '500',
  },
  conditionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  conditionItem: {
    alignItems: 'center',
  },
  conditionValue: {
    ...typography.h4,
    color: colors.primary,
  },
  conditionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  memo: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 24,
  },
});

export default DiaryDetailScreen;
