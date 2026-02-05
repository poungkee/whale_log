import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import SpotCard from '../../components/spot/SpotCard';
import { colors, spacing, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Home'>;
};

// Mock data
const FAVORITE_SPOTS = [
  { id: '1', name: 'Yangyang Beach', region: 'Yangyang', rating: 4.5 },
  { id: '2', name: 'Songjeong Beach', region: 'Busan', rating: 4.2 },
];

const NEARBY_SPOTS = [
  { id: '3', name: 'Jukdo Beach', region: 'Yangyang', rating: 4.0 },
  { id: '4', name: 'Surfyy Beach', region: 'Yangyang', rating: 4.3 },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.location}>Yangyang, Korea</Text>
        </View>

        {/* Current Conditions Summary */}
        <View style={styles.conditionsCard}>
          <Text style={styles.cardTitle}>Current Conditions</Text>
          <View style={styles.conditionsRow}>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionValue}>1.2m</Text>
              <Text style={styles.conditionLabel}>Wave</Text>
            </View>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionValue}>8s</Text>
              <Text style={styles.conditionLabel}>Period</Text>
            </View>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionValue}>15km/h</Text>
              <Text style={styles.conditionLabel}>Wind</Text>
            </View>
          </View>
        </View>

        {/* Favorite Spots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Spots</Text>
          <FlatList
            horizontal
            data={FAVORITE_SPOTS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SpotCard
                spot={item as any}
                onPress={() => navigation.navigate('SpotDetail', { spotId: item.id })}
                style={styles.horizontalCard}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Nearby Spots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Spots</Text>
          {NEARBY_SPOTS.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot as any}
              onPress={() => navigation.navigate('SpotDetail', { spotId: spot.id })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  location: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  conditionsCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  cardTitle: {
    ...typography.body2,
    color: colors.textInverse,
    opacity: 0.8,
    marginBottom: spacing.md,
  },
  conditionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  conditionItem: {
    alignItems: 'center',
  },
  conditionValue: {
    ...typography.h3,
    color: colors.textInverse,
  },
  conditionLabel: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.8,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  horizontalList: {
    paddingRight: spacing.lg,
  },
  horizontalCard: {
    width: 200,
    marginRight: spacing.md,
  },
});

export default HomeScreen;
