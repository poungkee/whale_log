// 로그인 화면 — 이메일/비밀번호로 JWT 인증
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors, spacing, typography } from '../../theme';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import { useKakaoLogin } from '../../hooks/useKakaoLogin';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { promptKakaoLogin, loading: kakaoLoading } = useKakaoLogin();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ username: username.trim(), password });
      await login(res.data.accessToken, res.data.user);
    } catch (err: any) {
      const msg = err.response?.data?.message || '로그인에 실패했습니다.';
      Alert.alert('로그인 실패', msg);
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
          {/* 로고 이미지 */}
          <View style={styles.logoArea}>
            <Image
              source={require('../../../assets/images/logo-transparent.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Whale Log</Text>
          </View>
          <Text style={styles.title}>다시 오신 걸 환영해요</Text>
          <Text style={styles.subtitle}>서핑 일지에 로그인하세요</Text>

          <View style={styles.form}>
            <Input
              label="이메일 또는 아이디"
              value={username}
              onChangeText={setUsername}
              placeholder="이메일 또는 아이디 입력"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호 입력"
              secureTextEntry
            />

            <Button
              title="로그인"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            {/* 비밀번호 찾기 링크 */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>
          </View>

          {/* 소셜 로그인 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>소셜 로그인</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 카카오 로그인 */}
          <TouchableOpacity
            style={styles.kakaoBtn}
            onPress={promptKakaoLogin}
            disabled={kakaoLoading}
          >
            <Text style={styles.kakaoIcon}>💬</Text>
            <Text style={styles.kakaoBtnText}>카카오로 로그인</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoArea: { alignItems: 'center', marginBottom: spacing.md },
  logoImg: { width: 72, height: 72, marginBottom: 6 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.primary, fontStyle: 'italic' },
  logo: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  linkText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  forgotBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  forgotText: { ...typography.caption, color: colors.textTertiary },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },

  kakaoBtn: {
    backgroundColor: '#FEE500',
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { color: '#191919', fontWeight: '700', fontSize: 15 },
});

export default LoginScreen;
