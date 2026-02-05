import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { colors, spacing, typography } from '../../theme';

const NOTIFICATIONS = [
  { id: '1', title: 'New comment', body: 'SurferKim commented on your post', isRead: false, createdAt: '2024-01-15T10:00:00Z' },
  { id: '2', title: 'Wave alert', body: 'Perfect conditions at Yangyang Beach!', isRead: true, createdAt: '2024-01-15T08:00:00Z' },
];

const NotificationsScreen: React.FC = () => {
  if (NOTIFICATIONS.length === 0) {
    return (
      <EmptyState
        title="No Notifications"
        description="You're all caught up!"
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.item, !item.isRead && styles.unread]}>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>2 hours ago</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: {
    backgroundColor: colors.primaryLight + '10',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.md,
  },
});

export default NotificationsScreen;
