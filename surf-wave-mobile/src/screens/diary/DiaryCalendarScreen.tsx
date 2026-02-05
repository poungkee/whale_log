import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// TODO: Implement with a calendar library

const DiaryCalendarScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarPlaceholder}>
        <Text style={styles.placeholderText}>Calendar View</Text>
        <Text style={styles.subText}>Shows surf days with indicators</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  subText: {
    ...typography.body2,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});

export default DiaryCalendarScreen;
