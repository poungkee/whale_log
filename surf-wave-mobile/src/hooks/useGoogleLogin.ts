// 구글 소셜 로그인 훅 — 백엔드 mobile-callback → whalelog:// 딥링크
// Expo Go + 출시 빌드 모두 동일한 방식 사용
// Google → 백엔드 GET /auth/google/mobile-callback → whalelog://oauth?token=...
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '1070042796453-of66enkoc3i23irnug81atp56gpugkv1.apps.googleusercontent.com';

// 백엔드가 Google code를 받아서 JWT 발급 후 whalelog:// 딥링크로 리다이렉트
const REDIRECT_URI = 'https://whalelog-production.up.railway.app/api/v1/auth/google/mobile-callback';

export function useGoogleLogin() {
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const promptGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&access_type=offline` +
        `&prompt=select_account`;

      // whalelog:// 딥링크가 오면 openAuthSessionAsync가 자동으로 닫힘
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'whalelog://');

      if (result.type === 'success') {
        const url = result.url;
        const errorMatch = url.match(/[?&]error=([^&]+)/);
        if (errorMatch) {
          Alert.alert('구글 로그인 실패', decodeURIComponent(errorMatch[1]));
          return;
        }

        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const userMatch = url.match(/[?&]user=([^&]+)/);

        if (tokenMatch && userMatch) {
          const accessToken = decodeURIComponent(tokenMatch[1]);
          const user = JSON.parse(decodeURIComponent(userMatch[1]));
          await login(accessToken, user);
        } else {
          Alert.alert('구글 로그인 실패', '토큰을 받지 못했어요.');
        }
      } else if (result.type === 'cancel') {
        // 사용자가 직접 취소 — 알림 불필요
      }
    } catch (err: any) {
      Alert.alert('오류', '구글 로그인 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [login]);

  return { promptGoogleLogin, loading };
}
