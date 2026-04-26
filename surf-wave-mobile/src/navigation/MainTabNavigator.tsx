// 하단 탭 네비게이터 — 홈/지도/피드/마이페이지
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map, Newspaper, User } from 'lucide-react-native';
import { MainTabParamList } from './types';
import HomeStack from './HomeStack';
import MapScreen from '../screens/map/MapScreen';
import FeedStack from './FeedStack';
import MyPageStack from './MyPageStack';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case 'HomeTab':
              return <Home size={size} color={color} />;
            case 'MapTab':
              return <Map size={size} color={color} />;
            case 'FeedTab':
              return <Newspaper size={size} color={color} />;
            case 'MyPageTab':
              return <User size={size} color={color} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="MapTab" component={MapScreen} options={{ tabBarLabel: '탐색' }} />
      <Tab.Screen name="FeedTab" component={FeedStack} options={{ tabBarLabel: '피드' }} />
      <Tab.Screen name="MyPageTab" component={MyPageStack} options={{ tabBarLabel: '마이' }} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
