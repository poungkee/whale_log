import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { colors, spacing, typography } from '../../theme';
import { useOnboardingStore } from '../../stores/onboardingStore';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
};

const ONBOARDING_PAGES = [
  {
    title: 'Real-time Wave Forecast',
    description: 'Get accurate wave, wind, and tide forecasts for your favorite surf spots.',
  },
  {
    title: 'Track Your Sessions',
    description: 'Record your surf sessions with photos, conditions, and personal notes.',
  },
  {
    title: 'Connect with Surfers',
    description: 'Share experiences, ask questions, and discover new spots with the community.',
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const { setCompleted } = useOnboardingStore();

  const handleNext = () => {
    if (currentPage < ONBOARDING_PAGES.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      setCompleted(true);
      // Navigate to main app
    }
  };

  const handleSkip = () => {
    setCompleted(true);
    // Navigate to main app
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.pageContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.pageNumber}>{currentPage + 1}</Text>
          </View>
          <Text style={styles.title}>{ONBOARDING_PAGES[currentPage].title}</Text>
          <Text style={styles.description}>{ONBOARDING_PAGES[currentPage].description}</Text>
        </View>

        <View style={styles.indicators}>
          {ONBOARDING_PAGES.map((_, index) => (
            <View
              key={index}
              style={[styles.indicator, currentPage === index && styles.indicatorActive]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          <Button
            title={currentPage === ONBOARDING_PAGES.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
          />
          {currentPage < ONBOARDING_PAGES.length - 1 && (
            <Button title="Skip" variant="text" onPress={handleSkip} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pageNumber: {
    ...typography.h1,
    color: colors.textInverse,
    fontSize: 80,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray300,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  buttons: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
});

export default OnboardingScreen;
