import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import Avatar from '../../components/common/Avatar';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'MyPage'>;
};

const MENU_ITEMS = [
  { label: 'Edit Profile', screen: 'EditProfile' },
  { label: 'My Diary', screen: 'DiaryList' },
  { label: 'Favorites', screen: 'Favorites' },
  { label: 'Q&A', screen: 'QnAList' },
  { label: 'Surf Guide', screen: 'GuideList' },
  { label: 'Notifications', screen: 'Notifications' },
  { label: 'Settings', screen: 'Settings' },
];

const MyPageScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar name={user?.nickname || 'User'} size="lg" uri={user?.avatarUrl || undefined} />
          <Text style={styles.nickname}>{user?.nickname || 'Surfer'}</Text>
          <Text style={styles.level}>{user?.surfLevel || 'Beginner'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Diaries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen as any)}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  nickname: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  level: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  menu: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    ...typography.body1,
    color: colors.text,
  },
  menuArrow: {
    ...typography.h4,
    color: colors.textTertiary,
  },
});

export default MyPageScreen;
