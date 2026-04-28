// 카카오 소셜 로그인 훅 — WebBrowser 직접 방식
// Expo Go: auth.expo.io 프록시 → code 수신 → 백엔드 POST /auth/kakao/callback
// 출시 빌드: 백엔드 mobile-callback → whalelog:// 딥링크
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { api } from '../config/api';
import { useAuthStore } from '../stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_REST_KEY = 'b70df9f595f363cd8fbfb637d1e19ca9';

// Expo Go 여부 판단
const isExpoGo = Constants.appOwnership === 'expo';

// Expo Go: auth.expo.io 프록시 URL (카카오 콘솔에 등록된 것과 동일)
// 출시 빌드: 백엔드 mobile-callback
const EXPO_PROXY_REDIRECT = 'https://auth.expo.io/@poungkee/whale-log';
const BACKEND_REDIRECT = 'https://whalelog-production.up.railway.app/api/v1/auth/kakao/mobile-callback';

const redirectUri = isExpoGo ? EXPO_PROXY_REDIRECT : BACKEND_REDIRECT;

export function useKakaoLogin() {
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const promptKakaoLogin = useCallback(async () => {
    setLoading(true);
    try {
      const authUrl =
        `https://kauth.kakao.com/oauth/authorize` +
        `?client_id=${KAKAO_REST_KEY}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=profile_nickname,account_email`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success') {
        // URL에서 code 파라미터 추출
        const url = result.url;
        const match = url.match(/[?&]code=([^&]+)/);
        const code = match ? decodeURIComponent(match[1]) : null;

        if (code) {
          await handleCode(code);
        } else {
          // 에러 파라미터 확인
          const errMatch = url.match(/[?&]error=([^&]+)/);
          const err = errMatch ? decodeURIComponent(errMatch[1]) : '알 수 없는 오류';
          Alert.alert('카카오 로그인 실패', err);
        }
      } else if (result.type === 'cancel') {
        // 사용자가 직접 취소한 경우 — 알림 불필요
      }
    } catch (err: any) {
      Alert.alert('오류', '카카오 로그인 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [login]);

  // 인가 코드 → 백엔드 → JWT
  const handleCode = useCallback(async (code: string) => {
    const res = await api.post('/auth/kakao/callback', {
      code,
      redirectUri,
    });
    await login(res.data.accessToken, res.data.user);
  }, [login]);

  return { promptKakaoLogin, loading };
}
