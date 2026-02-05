import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import GuideCard from '../../components/guide/GuideCard';
import ProgressBar from '../../components/guide/ProgressBar';
import { colors, spacing, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'GuideList'>;
};

const CATEGORIES = ['BASICS', 'SAFETY', 'EQUIPMENT', 'ETIQUETTE'];
const GUIDES = [
  { id: '1', title: 'Getting Started with Surfing', category: 'BASICS', estimatedReadMinutes: 5, isCompleted: true },
  { id: '2', title: 'Ocean Safety Tips', category: 'SAFETY', estimatedReadMinutes: 8, isCompleted: false },
  { id: '3', title: 'Choosing Your First Board', category: 'EQUIPMENT', estimatedReadMinutes: 10, isCompleted: false },
];

const GuideListScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Progress Overview */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Your Progress</Text>
        <ProgressBar progress={0.33} />
        <Text style={styles.progressText}>1 of 3 guides completed</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat} style={styles.tab}>
            <Text style={styles.tabText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={GUIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GuideCard
            guide={item as any}
            onPress={() => navigation.navigate('GuideDetail', { guideId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  progressTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray200,
    borderRadius: 16,
  },
  tabText: {
    ...typography.caption,
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});

export default GuideListScreen;
