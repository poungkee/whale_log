// 마이페이지 스택 — 프로필/편집/설정/관리자 + 다이어리 통합
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyPageStackParamList } from './types';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import EditProfileScreen from '../screens/mypage/EditProfileScreen';
import SettingsScreen from '../screens/mypage/SettingsScreen';
import FavoritesScreen from '../screens/mypage/FavoritesScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import DiaryListScreen from '../screens/diary/DiaryListScreen';
import DiaryDetailScreen from '../screens/diary/DiaryDetailScreen';
import CreateDiaryScreen from '../screens/diary/CreateDiaryScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

const MyPageStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        /**
         * iOS 백 라벨 완전 숨김 — 화살표(<)만 표시.
         * headerBackTitle:''만으로는 일부 케이스에서 이전 화면 이름이 노출되어
         * headerBackTitleVisible:false 옵션을 함께 적용.
         */
        headerBackTitle: '',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="MyPage"      component={MyPageScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen}  options={{ title: '프로필 편집' }} />
      <Stack.Screen name="Settings"    component={SettingsScreen}     options={{ title: '설정' }} />
      <Stack.Screen name="Favorites"   component={FavoritesScreen}    options={{ title: '즐겨찾기' }} />
      <Stack.Screen name="Admin"       component={AdminScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="DiaryList"   component={DiaryListScreen}     options={{ title: '서핑 다이어리' }} />
      <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen}   options={{ title: '다이어리 상세' }} />
      <Stack.Screen name="CreateDiary" component={CreateDiaryScreen}   options={{ title: '기록 작성' }} />
    </Stack.Navigator>
  );
};

export default MyPageStack;
