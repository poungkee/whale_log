import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// TODO: Implement with react-native-maps

const MapScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Map View</Text>
        <Text style={styles.subText}>Surf spots will appear here</Text>
      </View>

      {/* Region Filter Chips */}
      <View style={styles.filters}>
        {['All', 'Yangyang', 'Busan', 'Jeju'].map((region) => (
          <View key={region} style={styles.chip}>
            <Text style={styles.chipText}>{region}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray200,
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
  filters: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    ...typography.body2,
    color: colors.text,
  },
});

export default MapScreen;
