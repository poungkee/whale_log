import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors, spacing, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const SURF_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [nickname, setNickname] = useState('');
  const [surfLevel, setSurfLevel] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    // TODO: Implement registration
    navigation.navigate('Onboarding');
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your surf profile</Text>

        <View style={styles.form}>
          <Input
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Choose a nickname"
          />

          <View style={styles.levelSection}>
            <Text style={styles.label}>Surf Level</Text>
            <View style={styles.levelButtons}>
              {SURF_LEVELS.map((level) => (
                <Button
                  key={level}
                  title={level}
                  variant={surfLevel === level ? 'primary' : 'outline'}
                  onPress={() => setSurfLevel(level)}
                  style={styles.levelButton}
                />
              ))}
            </View>
          </View>

          {/* TODO: Add terms agreement checkboxes */}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={!nickname || !surfLevel}
            style={styles.registerButton}
          />
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
  levelSection: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '500',
  },
  levelButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  levelButton: {
    flex: 1,
  },
  registerButton: {
    marginTop: spacing.lg,
  },
});

export default RegisterScreen;
