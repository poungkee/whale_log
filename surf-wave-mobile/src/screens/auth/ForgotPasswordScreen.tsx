// 비밀번호 찾기 화면 — 2단계 (이메일 인증코드 발송 → 비밀번호 재설정)
// 웹앱 ForgotPassword.tsx 디자인 참고
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, Mail, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: 인증코드 발송
  const handleSendCode = async () => {
    setError('');
    if (!email.includes('@')) {
      setError('올바른 이메일을 입력해주세요');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (e: any) {
      setError(e.response?.data?.message || '인증코드 발송에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 비밀번호 재설정
  const handleResetPassword = async () => {
    setError('');
    if (code.length !== 6) {
      setError('6자리 인증코드를 입력해주세요');
      return;
    }
    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요');
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      setError('비밀번호는 영문과 숫자를 모두 포함해야 해요');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않아요');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      Alert.alert('완료', '비밀번호가 변경되었어요. 새 비밀번호로 로그인해주세요.', [
        { text: '로그인하기', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      setError(e.response?.data?.message || '비밀번호 재설정에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 아이콘 + 타이틀 */}
        <View style={styles.headerBox}>
          <View style={styles.iconCircle}>
            <Lock size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>비밀번호 찾기</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? '가입 시 등록한 이메일로 인증코드를 보내드릴게요'
              : `${email}로 발송된\n인증코드를 입력해주세요`}
          </Text>
        </View>

        {/* 단계 표시 */}
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={styles.stepNumActive}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step === 2 && styles.stepActive]}>
            <Text style={[styles.stepNum, step === 2 && styles.stepNumActive]}>2</Text>
          </View>
        </View>

        {/* 에러 메시지 */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ===== Step 1: 이메일 입력 ===== */}
        {step === 1 && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>이메일</Text>
              <View style={styles.inputRow}>
                <Mail size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="가입 시 등록한 이메일"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>인증코드 받기</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ===== Step 2: 인증코드 + 새 비밀번호 ===== */}
        {step === 2 && (
          <View style={styles.form}>
            {/* 인증코드 */}
            <View style={styles.field}>
              <Text style={styles.label}>인증코드 <Text style={styles.labelHint}>(이메일에서 확인)</Text></Text>
              <TextInput
                style={[styles.inputBox, styles.codeInput]}
                value={code}
                onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="6자리 숫자"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* 새 비밀번호 */}
            <View style={styles.field}>
              <Text style={styles.label}>새 비밀번호</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
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
              <Text style={styles.label}>새 비밀번호 확인</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="비밀번호를 다시 입력하세요"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>비밀번호 변경</Text>
              }
            </TouchableOpacity>

            {/* 인증코드 재발송 */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => { setStep(1); setCode(''); setError(''); }}
            >
              <Text style={styles.linkText}>인증코드 다시 받기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  navHeader: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  headerBox: { alignItems: 'center', paddingVertical: spacing.xl },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { ...typography.body2, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 0, marginBottom: spacing.xl,
  },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: 'center', alignItems: 'center',
  },
  stepActive: { backgroundColor: colors.primary },
  stepLine: { width: 48, height: 4, backgroundColor: colors.gray200 },
  stepLineActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  stepNumActive: { fontSize: 13, fontWeight: '700', color: '#fff' },

  errorBox: {
    backgroundColor: colors.error + '10', borderWidth: 1, borderColor: colors.error + '30',
    borderRadius: 10, padding: spacing.sm, marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.error, textAlign: 'center' },

  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { ...typography.body2, fontWeight: '700', color: colors.text },
  labelHint: { fontWeight: '400', color: colors.textTertiary, fontSize: 12 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  input: { flex: 1, ...typography.body2, color: colors.text, padding: 0 },
  inputBox: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    ...typography.body2, color: colors.text,
  },
  codeInput: {
    textAlign: 'center', fontSize: 24, fontWeight: '800',
    letterSpacing: 8,
  },

  btn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  resendBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { ...typography.body2, color: colors.textTertiary },
});

export default ForgotPasswordScreen;
