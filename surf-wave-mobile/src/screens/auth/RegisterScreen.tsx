// 회원가입 화면 — 이메일/아이디/비밀번호/닉네임 입력 후 JWT 등록
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors, spacing, typography } from '../../theme';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const SURF_LEVELS = [
  { label: '입문', value: 'BEGINNER' },
  { label: '초급', value: 'INTERMEDIATE' },
  { label: '중급', value: 'ADVANCED' },
];

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [surfLevel, setSurfLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !nickname.trim()) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('비밀번호 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });
      await login(res.data.accessToken, res.data.user);
      // 온보딩(서프 레벨 설정)으로 이동
      navigation.navigate('Onboarding');
    } catch (err: any) {
      const msg = err.response?.data?.message || '회원가입에 실패했습니다.';
      Alert.alert('회원가입 실패', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>계정 만들기</Text>
          <Text style={styles.subtitle}>서핑 프로필을 설정하세요</Text>

          <View style={styles.form}>
            <Input
              label="아이디"
              value={username}
              onChangeText={setUsername}
              placeholder="영문/숫자 조합"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="이메일 주소 입력"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="닉네임"
              value={nickname}
              onChangeText={setNickname}
              placeholder="서퍼 닉네임 입력"
            />
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="8자 이상"
              secureTextEntry
            />
            <Input
              label="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 재입력"
              secureTextEntry
            />

            <View style={styles.levelSection}>
              <Text style={styles.label}>서핑 레벨 (선택)</Text>
              <View style={styles.levelButtons}>
                {SURF_LEVELS.map((level) => (
                  <Button
                    key={level.value}
                    title={level.label}
                    variant={surfLevel === level.value ? 'primary' : 'outline'}
                    onPress={() => setSurfLevel(
                      surfLevel === level.value ? '' : level.value
                    )}
                    style={styles.levelButton}
                  />
                ))}
              </View>
            </View>

            <Button
              title="가입하기"
              onPress={handleRegister}
              loading={loading}
              disabled={!username || !email || !password || !passwordConfirm || !nickname}
              style={styles.registerButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
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
