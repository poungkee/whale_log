// 카카오 소셜 로그인 훅 — 백엔드 mobile-callback → whalelog:// 딥링크
// Expo Go + 출시 빌드 모두 동일한 방식 사용
// Kakao → 백엔드 GET /auth/kakao/mobile-callback → whalelog://oauth?token=...
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const KAKAO_REST_KEY = 'b70df9f595f363cd8fbfb637d1e19ca9';

// 백엔드가 카카오 code를 받아서 JWT 발급 후 whalelog:// 딥링크로 리다이렉트
const REDIRECT_URI = 'https://whalelog-production.up.railway.app/api/v1/auth/kakao/mobile-callback';

export function useKakaoLogin() {
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const promptKakaoLogin = useCallback(async () => {
    setLoading(true);
    try {
      const authUrl =
        `https://kauth.kakao.com/oauth/authorize` +
        `?client_id=${KAKAO_REST_KEY}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=profile_nickname,account_email`;

      // whalelog:// 딥링크가 오면 openAuthSessionAsync가 자동으로 닫힘
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'whalelog://');

      if (result.type === 'success') {
        const url = result.url;
        const errorMatch = url.match(/[?&]error=([^&]+)/);
        if (errorMatch) {
          Alert.alert('카카오 로그인 실패', decodeURIComponent(errorMatch[1]));
          return;
        }

        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const userMatch = url.match(/[?&]user=([^&]+)/);

        if (tokenMatch && userMatch) {
          const accessToken = decodeURIComponent(tokenMatch[1]);
          const user = JSON.parse(decodeURIComponent(userMatch[1]));
          await login(accessToken, user);
        } else {
          Alert.alert('카카오 로그인 실패', '토큰을 받지 못했어요.');
        }
      } else if (result.type === 'cancel') {
        // 사용자가 직접 취소 — 알림 불필요
      }
    } catch (err: any) {
      Alert.alert('오류', '카카오 로그인 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [login]);

  return { promptKakaoLogin, loading };
}
