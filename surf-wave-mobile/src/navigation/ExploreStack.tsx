// 탐색 스택 — 지도 화면 + 스팟 상세
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreStackParamList } from './types';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SpotDetailScreen from '../screens/home/SpotDetailScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

const ExploreStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="ExploreMap"  component={ExploreScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="SpotDetail"  component={SpotDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default ExploreStack;
