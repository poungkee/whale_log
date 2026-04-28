// 하단 탭 네비게이터 — 웹앱 BottomNav.tsx와 동일한 pill 디자인
// 활성 탭: 타원형(pill) primary 배경 + 흰 아이콘 + primary 라벨
// 비활성 탭: muted 아이콘 + muted 라벨
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, BookOpen, User, Compass } from 'lucide-react-native';
import { MainTabParamList } from './types';
import HomeStack from './HomeStack';
import ExploreStack from './ExploreStack';
import DiaryStack from './DiaryStack';
import GuideStack from './GuideStack';
import MyPageStack from './MyPageStack';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 가이드 아이콘 — 웹앱과 동일한 열린 책 SVG
import Svg, { Path, Line } from 'react-native-svg';

function GuideIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 5 C3 5 6 4 9 5 L9 19 C6 18 3 19 3 19 Z" />
      <Path d="M21 5 C21 5 18 4 15 5 L15 19 C18 18 21 19 21 19 Z" />
      <Line x1="9" y1="5" x2="9" y2="19" />
      <Line x1="15" y1="5" x2="15" y2="19" />
      <Path d="M9 5 Q12 4 15 5" />
      <Path d="M9 19 Q12 20 15 19" />
    </Svg>
  );
}

// 서퍼 아이콘 — 웹앱 SurferIcon SVG
function SurferIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M14 4 A1.6 1.6 0 1 1 14 7.2 A1.6 1.6 0 0 1 14 4" />
      <Path d="M13.2 5.8 L10.5 10.5 L7.5 9.5 L6.8 10.8 L10.2 12.2 L8.5 15.5 L10 15.5 L12.2 11.8 L14.8 12.8 L16.5 8.5 Z" />
      <Path d="M4 16.5 Q9 14.5 20 17.5 Q15 20 4 16.5Z" opacity={0.85} />
      <Path d="M2 20 Q5 18.5 8 20 Q11 21.5 14 20 Q17 18.5 22 20" stroke={color} strokeWidth="1.2" fill="none" opacity={0.6} />
    </Svg>
  );
}

// 탭 정의
const TAB_ITEMS = [
  { name: 'HomeTab'    as const, label: '홈',      Icon: SurferIcon },
  { name: 'ExploreTab' as const, label: '탐색',    Icon: ({ color }: { color: string }) => <Compass size={22} color={color} /> },
  { name: 'DiaryTab'   as const, label: '다이어리', Icon: ({ color }: { color: string }) => <BookOpen size={22} color={color} /> },
  { name: 'MyPageTab'  as const, label: '마이',    Icon: ({ color }: { color: string }) => <User size={22} color={color} /> },
  { name: 'GuideTab'   as const, label: '가이드',  Icon: GuideIcon },
];

// 커스텀 탭 바 — pill 디자인 (웹앱 동일)
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tb.container, { paddingBottom: insets.bottom || 8 }]}>
      {TAB_ITEMS.map((item, index) => {
        const isActive = state.index === index;
        const iconColor = isActive ? '#fff' : colors.gray400;
        const labelColor = isActive ? colors.primary : colors.gray400;

        return (
          <TouchableOpacity
            key={item.name}
            style={tb.tabItem}
            onPress={() => navigation.navigate(item.name)}
            activeOpacity={0.7}
          >
            {/* 아이콘 — 활성 시 타원형 pill 배경 */}
            <View style={[tb.iconWrap, isActive && tb.iconWrapActive]}>
              <item.Icon color={iconColor} />
            </View>
            {/* 라벨 */}
            <Text style={[tb.label, { color: labelColor }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(160,140,110,0.25)',
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    paddingTop: 4,
  },
  // 비활성: 투명 배경 48×32 영역
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 활성: 타원형 primary 배경
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab"    component={HomeStack} />
      <Tab.Screen name="ExploreTab" component={ExploreStack} />
      <Tab.Screen name="DiaryTab"   component={DiaryStack} />
      <Tab.Screen name="MyPageTab"  component={MyPageStack} />
      <Tab.Screen name="GuideTab"   component={GuideStack} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
