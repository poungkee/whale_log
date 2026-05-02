import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import SpotDetailScreen from '../screens/home/SpotDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SpotDetail"
        component={SpotDetailScreen}
        /**
         * 자체 헤더가 SpotDetailScreen 안에 있어서(< 화살표 + 스팟 이름 + 하트) RN 기본 헤더 숨김.
         * 이전엔 "< Home Spot Details" 영문 헤더가 위에 추가로 떠서 중복됐음.
         */
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
