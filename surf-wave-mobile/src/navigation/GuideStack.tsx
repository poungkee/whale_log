// 가이드 스택 — 서핑 가이드 목록 화면
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GuideStackParamList } from './types';
import GuideListScreen from '../screens/guide/GuideListScreen';

const Stack = createNativeStackNavigator<GuideStackParamList>();

const GuideStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuideList" component={GuideListScreen} />
    </Stack.Navigator>
  );
};

export default GuideStack;
