// JWT 토큰 영구 저장소 — expo-secure-store 사용
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

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

  clearAll: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
