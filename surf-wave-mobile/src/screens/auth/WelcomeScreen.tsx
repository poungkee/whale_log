// 웰컴 화면 — 앱 첫 진입 화면, 로고 + 배경 이미지 적용
import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ImageBackground, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const { height } = Dimensions.get('window');

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ImageBackground
      source={require('../../../assets/images/ocean-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* 어두운 오버레이 */}
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
          {/* 로그인 */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>로그인</Text>
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
    letterSpacing: 1, marginBottom: spacing.xs,
    fontStyle: 'italic',
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
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
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
