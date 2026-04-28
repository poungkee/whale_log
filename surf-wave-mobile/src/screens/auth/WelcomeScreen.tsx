// 웰컴 화면 — 앱 첫 진입 화면, 로고 + 배경 이미지 적용
import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ImageBackground, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { useKakaoLogin } from '../../hooks/useKakaoLogin';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const { height } = Dimensions.get('window');

// Google 로고 SVG 아이콘
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </Svg>
);

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { promptKakaoLogin, loading: kakaoLoading } = useKakaoLogin();
  const { promptGoogleLogin, loading: googleLoading } = useGoogleLogin();

  return (
    <ImageBackground
      source={require('../../../assets/images/ocean-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* 로고 영역 */}
        <View style={styles.logoArea}>
          <Image
            source={require('../../../assets/images/logo-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Whale Log</Text>
          <Text style={styles.tagline}>We make waves</Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.btnArea}>
          {/* 카카오 로그인 */}
          <TouchableOpacity
            style={styles.kakaoBtn}
            onPress={promptKakaoLogin}
            disabled={kakaoLoading}
          >
            <Text style={styles.kakaoIcon}>💬</Text>
            <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
          </TouchableOpacity>

          {/* 구글 로그인 */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={promptGoogleLogin}
            disabled={googleLoading}
          >
            <GoogleIcon />
            <Text style={styles.googleBtnText}>Google로 시작하기</Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 이메일 로그인 */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>이메일로 로그인</Text>
          </TouchableOpacity>

          {/* 회원가입 */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerBtnText}>회원가입</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 20, 35, 0.55)',
  },
  container: { flex: 1, justifyContent: 'space-between' },

  logoArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingTop: height * 0.05,
  },
  logo: { width: 110, height: 110, marginBottom: spacing.md },
  appName: {
    fontSize: 36, fontWeight: '800', color: '#fff',
    letterSpacing: 1, marginBottom: spacing.xs, fontStyle: 'italic',
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, fontWeight: '500',
  },

  btnArea: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },

  // 카카오 버튼 — 카카오 공식 색상 (#FEE500)
  kakaoBtn: {
    backgroundColor: '#FEE500',
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { color: '#191919', fontWeight: '700', fontSize: 16 },

  // 구글 버튼 — 흰 배경 + 테두리
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  googleBtnText: { color: '#191919', fontWeight: '700', fontSize: 16 },

  // 구분선
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  registerBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  registerBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  terms: {
    fontSize: 11, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginTop: spacing.xs,
  },
});

export default WelcomeScreen;
