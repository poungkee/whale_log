import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { colors, spacing, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {/* TODO: Add app logo */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>SURF WAVE</Text>
          </View>
          <Text style={styles.tagline}>Catch the Perfect Wave</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Continue with Google"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            style={styles.socialButton}
          />
          <Button
            title="Continue with Apple"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            style={styles.socialButton}
          />
          <Button
            title="Sign in with Email"
            onPress={() => navigation.navigate('Login')}
            style={styles.emailButton}
          />
        </View>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
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
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    ...typography.h4,
    color: colors.textInverse,
    textAlign: 'center',
  },
  tagline: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  socialButton: {
    marginBottom: 0,
  },
  emailButton: {
    marginTop: spacing.sm,
  },
  termsText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

export default WelcomeScreen;
