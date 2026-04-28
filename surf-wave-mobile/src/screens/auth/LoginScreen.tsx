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
import Svg, { Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors, spacing, typography } from '../../theme';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import { useKakaoLogin } from '../../hooks/useKakaoLogin';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';

// Google 로고 SVG 아이콘
const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </Svg>
);

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { promptKakaoLogin, loading: kakaoLoading } = useKakaoLogin();
  const { promptGoogleLogin, loading: googleLoading } = useGoogleLogin();

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

          {/* 구글 로그인 */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={promptGoogleLogin}
            disabled={googleLoading}
          >
            <GoogleIcon />
            <Text style={styles.googleBtnText}>Google로 로그인</Text>
          </TouchableOpacity>

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

  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  googleBtnText: { color: '#191919', fontWeight: '700', fontSize: 15 },

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
