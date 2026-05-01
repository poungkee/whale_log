// 앱 루트 컴포넌트 — 앱 시작 시 JWT 토큰 복원 + 네비게이션 초기화
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { queryClient } from '@/config/queryClient';
import RootNavigator from '@/navigation/RootNavigator';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

/**
 * 글로벌 네비게이션 ref — 외부(예: RootNavigator의 모달)에서 화면 이동에 사용.
 * 사용 예: navigationRef.navigate('MainTab', { screen: 'MyPageTab', params: { screen: 'EditProfile' } })
 */
export const navigationRef = createNavigationContainerRef();

const App: React.FC = () => {
  const { isLoading, initialize } = useAuthStore();

  // SecureStore에서 기존 로그인 상태 복원
  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default App;
