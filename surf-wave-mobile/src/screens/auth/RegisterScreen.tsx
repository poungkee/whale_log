// 회원가입 화면 — 아이디 중복확인 + 이메일/비밀번호/닉네임 입력
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
  TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { authApi } from '../../api/auth.api';
import { api } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';
import { useKakaoLogin } from '../../hooks/useKakaoLogin';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </Svg>
);

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  /** AI 학습 데이터 활용 동의 (선택) — Task #67 */
  const [agreeAi, setAgreeAi] = useState(false);

  // 정책 페이지 URL
  const TERMS_URL = 'https://whale-log.vercel.app/terms.html';
  const PRIVACY_URL = 'https://whale-log.vercel.app/privacy.html';

  // 아이디 중복확인 상태
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'ok' | 'taken'>('idle');

  const { login } = useAuthStore();
  const { promptKakaoLogin, loading: kakaoLoading } = useKakaoLogin();
  const { promptGoogleLogin, loading: googleLoading } = useGoogleLogin();

  // 아이디 중복확인
  const handleCheckUsername = async () => {
    if (!username.trim()) {
      Alert.alert('알림', '아이디를 먼저 입력해주세요.');
      return;
    }
    if (username.length < 3) {
      Alert.alert('알림', '아이디는 3자 이상이어야 해요.');
      return;
    }
    setCheckingUsername(true);
    try {
      await api.post('/auth/check-username', { username: username.trim() });
      setUsernameStatus('ok');
    } catch (e: any) {
      // 409 = 이미 사용 중
      setUsernameStatus('taken');
    } finally {
      setCheckingUsername(false);
    }
  };

  // 아이디 입력 변경 시 상태 초기화
  const handleUsernameChange = (t: string) => {
    setUsername(t);
    setUsernameStatus('idle');
  };

  // 회원가입 처리
  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }
    if (usernameStatus !== 'ok') {
      Alert.alert('알림', '아이디 중복확인을 해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 오류', '비밀번호가 일치하지 않아요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('비밀번호 오류', '비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      Alert.alert('약관 동의 필요', '이용약관과 개인정보처리방침에 모두 동의해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      await login(res.data.accessToken, res.data.user);

      /**
       * Task #67 — AI 동의 켰으면 가입 직후 POST /terms/agree 자동 호출
       * (login 완료 후 토큰 인터셉터로 자동 인증)
       */
      if (agreeAi) {
        try {
          const termsRes = await api.get('/terms');
          const list = Array.isArray(termsRes.data) ? termsRes.data : (termsRes.data?.data ?? []);
          const aiTerm = list.find((t: { title: string }) => t.title?.startsWith('AI 학습 데이터 활용'));
          if (aiTerm) {
            await api.post('/terms/agree', { termsIds: [aiTerm.id] });
          }
        } catch {
          /** 가입은 성공했으니 동의 실패해도 진행 (마이페이지에서 다시 가능) */
        }
      }

      navigation.navigate('Onboarding');
    } catch (err: any) {
      const msg = err.response?.data?.message || '회원가입에 실패했어요.';
      Alert.alert('회원가입 실패', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>계정 만들기</Text>
          <Text style={styles.subtitle}>서핑 프로필을 설정하세요</Text>

          <View style={styles.form}>

            {/* 아이디 + 중복확인 */}
            <View style={styles.field}>
              <Text style={styles.label}>아이디</Text>
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="영문/숫자 3자 이상"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.checkBtn, usernameStatus === 'ok' && styles.checkBtnOk]}
                  onPress={handleCheckUsername}
                  disabled={checkingUsername}
                >
                  {checkingUsername
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.checkBtnText}>중복확인</Text>
                  }
                </TouchableOpacity>
              </View>
              {/* 중복확인 결과 */}
              {usernameStatus === 'ok' && (
                <View style={styles.statusRow}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.success }]}>사용 가능한 아이디예요</Text>
                </View>
              )}
              {usernameStatus === 'taken' && (
                <View style={styles.statusRow}>
                  <XCircle size={14} color={colors.error} />
                  <Text style={[styles.statusText, { color: colors.error }]}>이미 사용 중인 아이디예요</Text>
                </View>
              )}
            </View>

            {/* 이메일 */}
            <View style={styles.field}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="이메일 주소 입력"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* 비밀번호 */}
            <View style={styles.field}>
              <Text style={styles.label}>비밀번호</Text>
              <View style={styles.pwInput}>
                <TextInput
                  style={{ flex: 1, ...typography.body2, color: colors.text, padding: 0 }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8자 이상, 영문+숫자"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword
                    ? <EyeOff size={18} color={colors.textTertiary} />
                    : <Eye size={18} color={colors.textTertiary} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* 비밀번호 확인 */}
            <View style={styles.field}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                style={styles.input}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="비밀번호 재입력"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <View style={styles.statusRow}>
                  <XCircle size={14} color={colors.error} />
                  <Text style={[styles.statusText, { color: colors.error }]}>비밀번호가 일치하지 않아요</Text>
                </View>
              )}
            </View>

            {/* 약관 동의 */}
            <View style={styles.agreeSection}>
              {/* 전체 동의 */}
              <TouchableOpacity
                style={styles.agreeRow}
                onPress={() => { setAgreeTerms(!agreeTerms || !agreePrivacy ? true : false); setAgreePrivacy(!agreeTerms || !agreePrivacy ? true : false); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, (agreeTerms && agreePrivacy) && styles.checkboxChecked]}>
                  {(agreeTerms && agreePrivacy) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.agreeAllText}>전체 동의</Text>
              </TouchableOpacity>

              <View style={styles.agreeDivider} />

              {/* 이용약관 */}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
                  onPress={() => setAgreeTerms(!agreeTerms)}
                >
                  {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.agreeText}>
                  <Text style={styles.agreeRequired}>[필수] </Text>이용약관 동의
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text style={styles.agreeLink}>보기</Text>
                </TouchableOpacity>
              </View>

              {/* 개인정보처리방침 */}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agreePrivacy && styles.checkboxChecked]}
                  onPress={() => setAgreePrivacy(!agreePrivacy)}
                >
                  {agreePrivacy && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.agreeText}>
                  <Text style={styles.agreeRequired}>[필수] </Text>개인정보처리방침 동의
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text style={styles.agreeLink}>보기</Text>
                </TouchableOpacity>
              </View>

              {/* AI 학습 데이터 활용 동의 (선택) — Task #67 */}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agreeAi && styles.checkboxChecked]}
                  onPress={() => setAgreeAi(!agreeAi)}
                >
                  {agreeAi && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.agreeText}>
                  <Text style={[styles.agreeRequired, { color: '#2AAFC6' }]}>[선택] </Text>
                  AI 자세 분석 학습 데이터 활용 동의
                </Text>
              </View>
            </View>

            {/* 가입하기 버튼 */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>가입하기</Text>
              }
            </TouchableOpacity>

            {/* 소셜 간편 가입 구분선 */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>소셜 간편 가입</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 구글 가입 */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={promptGoogleLogin}
              disabled={googleLoading}
            >
              <GoogleIcon />
              <Text style={styles.googleBtnText}>Google로 가입하기</Text>
            </TouchableOpacity>

            {/* 카카오 가입 */}
            <TouchableOpacity
              style={styles.kakaoBtn}
              onPress={promptKakaoLogin}
              disabled={kakaoLoading}
            >
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={styles.kakaoBtnText}>카카오로 가입하기</Text>
            </TouchableOpacity>

            {/* 로그인으로 이동 */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>로그인</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  title: { ...typography.h2, color: colors.text, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.xl },

  form: { gap: spacing.md },
  field: { gap: 6 },
  label: { ...typography.body2, fontWeight: '700', color: colors.text },

  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    ...typography.body2, color: colors.text,
  },

  rowInput: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  checkBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    minWidth: 72, alignItems: 'center',
  },
  checkBtnOk: { backgroundColor: colors.success },
  checkBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '500' },

  pwInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    gap: spacing.sm,
  },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.sm },
  footerText: { ...typography.body2, color: colors.textSecondary },
  linkText: { ...typography.body2, color: colors.primary, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },

  googleBtn: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: '#e0e0e0',
  },
  googleBtnText: { color: '#191919', fontWeight: '700', fontSize: 15 },

  kakaoBtn: {
    backgroundColor: '#FEE500', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { color: '#191919', fontWeight: '700', fontSize: 15 },

  // 약관 동의
  agreeSection: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
  },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  agreeAllText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  agreeDivider: { height: 1, backgroundColor: colors.border },
  agreeText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  agreeRequired: { color: '#E8744A', fontWeight: '700' },
  agreeLink: { fontSize: 12, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});

export default RegisterScreen;
