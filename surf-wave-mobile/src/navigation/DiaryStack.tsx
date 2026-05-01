// 다이어리 스택 — 목록/상세/작성 화면
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiaryStackParamList } from './types';
import DiaryListScreen from '../screens/diary/DiaryListScreen';
import DiaryDetailScreen from '../screens/diary/DiaryDetailScreen';
import CreateDiaryScreen from '../screens/diary/CreateDiaryScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<DiaryStackParamList>();

const DiaryStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        /** iOS 백 라벨 숨김 — 영문 라우트 이름("DiaryList")이 노출되지 않도록 */
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="DiaryList" component={DiaryListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} options={{ title: '서핑 일기' }} />
      <Stack.Screen name="CreateDiary" component={CreateDiaryScreen} options={{ title: '일기 작성' }} />
    </Stack.Navigator>
  );
};

export default DiaryStack;
