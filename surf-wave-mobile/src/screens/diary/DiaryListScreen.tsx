import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import DiaryCard from '../../components/diary/DiaryCard';
import EmptyState from '../../components/common/EmptyState';
import { colors, spacing } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'DiaryList'>;
};

const DIARIES = [
  { id: '1', spotName: 'Yangyang Beach', surfDate: '2024-01-15', boardType: 'LONGBOARD', satisfaction: 5 },
  { id: '2', spotName: 'Songjeong Beach', surfDate: '2024-01-10', boardType: 'SHORTBOARD', satisfaction: 4 },
];

const DiaryListScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header with Calendar Toggle */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('DiaryCalendar')}>
          <Text style={styles.calendarLink}>View Calendar</Text>
        </TouchableOpacity>
      </View>

      {DIARIES.length === 0 ? (
        <EmptyState
          title="No Diary Entries"
          description="Record your surf sessions to track your progress"
          actionLabel="Create Entry"
          onAction={() => navigation.navigate('CreateDiary', {})}
        />
      ) : (
        <FlatList
          data={DIARIES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DiaryCard
              diary={item as any}
              onPress={() => navigation.navigate('DiaryDetail', { diaryId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDiary', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'flex-end',
  },
  calendarLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.textInverse,
  },
});

export default DiaryListScreen;
