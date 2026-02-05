import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from '../common/Avatar';
import { colors, spacing, typography } from '../../theme';

interface Comment {
  id: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
  content: string;
  likeCount?: number;
  depth?: number;
  createdAt: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
  onLike: () => void;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onLike,
  depth = 0,
}) => {
  return (
    <View style={[styles.container, { marginLeft: depth * spacing.lg }]}>
      <Avatar name={comment.author.nickname} size="sm" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.authorName}>{comment.author.nickname}</Text>
          <Text style={styles.timestamp}>1h</Text>
        </View>
        <Text style={styles.text}>{comment.content}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onLike}>
            <Text style={styles.actionText}>Like</Text>
          </TouchableOpacity>
          {depth < 1 && (
            <TouchableOpacity onPress={onReply}>
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  text: {
    ...typography.body2,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default CommentItem;
