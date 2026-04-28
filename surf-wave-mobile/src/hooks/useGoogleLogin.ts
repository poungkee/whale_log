// 구글 소셜 로그인 훅 — WebBrowser 직접 방식 (카카오와 동일한 패턴)
// Expo Go + 출시 빌드 모두 auth.expo.io 프록시 URL 사용
// 인가코드 → 백엔드 POST /auth/google/callback → JWT
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { api } from '../config/api';
import { useAuthStore } from '../stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '1070042796453-of66enkoc3i23irnug81atp56gpugkv1.apps.googleusercontent.com';

// Google Cloud Console에 등록된 Authorized redirect URI
const REDIRECT_URI = 'https://auth.expo.io/@poungkee/whale-log';

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

      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (result.type === 'success') {
        const url = result.url;
        const codeMatch = url.match(/[?&]code=([^&]+)/);
        const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;

        if (code) {
          await handleCode(code);
        } else {
          const errMatch = url.match(/[?&]error=([^&]+)/);
          const err = errMatch ? decodeURIComponent(errMatch[1]) : '알 수 없는 오류';
          Alert.alert('구글 로그인 실패', err);
        }
      } else if (result.type === 'cancel') {
        // 사용자가 직접 취소한 경우 — 알림 불필요
      }
    } catch (err: any) {
      Alert.alert('오류', '구글 로그인 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [login]);

  // 인가 코드 → 백엔드 → JWT
  const handleCode = useCallback(async (code: string) => {
    const res = await api.post('/auth/google/callback', {
      code,
      redirectUri: REDIRECT_URI,
    });
    await login(res.data.accessToken, res.data.user);
  }, [login]);

  return { promptGoogleLogin, loading };
}
