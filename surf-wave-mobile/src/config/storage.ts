// JWT 토큰 영구 저장소 — expo-secure-store 사용
// (AsyncStorage 미설치이므로 SecureStore를 일반 키-값 저장에도 활용)
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';
/** 사용자가 펼쳐 본 가이드 항목 ID 목록 (JSON 배열 string으로 저장) */
const READ_GUIDES_KEY = 'readGuides';

export const storage = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  removeToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),

  getUser: async () => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: object) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  removeUser: () => SecureStore.deleteItemAsync(USER_KEY),

  /** 읽은 가이드 ID 목록 조회 (없으면 빈 배열) */
  getReadGuides: async (): Promise<string[]> => {
    const raw = await SecureStore.getItemAsync(READ_GUIDES_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },
  /** 읽은 가이드 ID 목록 저장 (중복은 호출 측에서 제거) */
  setReadGuides: (ids: string[]) =>
    SecureStore.setItemAsync(READ_GUIDES_KEY, JSON.stringify(ids)),

  clearAll: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(READ_GUIDES_KEY).catch(() => {});
  },
};
