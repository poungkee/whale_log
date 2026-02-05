import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import SpotCard from '../../components/spot/SpotCard';
import EmptyState from '../../components/common/EmptyState';
import { colors, spacing, typography } from '../../theme';

const FAVORITE_SPOTS = [
  { id: '1', name: 'Yangyang Beach', region: 'Yangyang', rating: 4.5, isFavorited: true },
  { id: '2', name: 'Songjeong Beach', region: 'Busan', rating: 4.2, isFavorited: true },
];

const FavoritesScreen: React.FC = () => {
  if (FAVORITE_SPOTS.length === 0) {
    return (
      <EmptyState
        title="No Favorites Yet"
        description="Add your favorite surf spots to see them here"
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={FAVORITE_SPOTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SpotCard spot={item as any} onPress={() => {}} />
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
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});

export default FavoritesScreen;
