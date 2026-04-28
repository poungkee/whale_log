// 마이페이지 스택 — 프로필/편집/설정/관리자
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyPageStackParamList } from './types';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import EditProfileScreen from '../screens/mypage/EditProfileScreen';
import SettingsScreen from '../screens/mypage/SettingsScreen';
import FavoritesScreen from '../screens/mypage/FavoritesScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

const MyPageStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="MyPage"      component={MyPageScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen}  options={{ title: '프로필 편집' }} />
      <Stack.Screen name="Settings"    component={SettingsScreen}     options={{ title: '설정' }} />
      <Stack.Screen name="Favorites"   component={FavoritesScreen}    options={{ title: '즐겨찾기' }} />
      <Stack.Screen name="Admin"        component={AdminScreen}         options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default MyPageStack;
