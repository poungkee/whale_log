import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Avatar from '../common/Avatar';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Post {
  id: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
  content: string;
  images?: { imageUrl: string }[];
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
}

interface FeedPostCardProps {
  post: Post;
  onPress: () => void;
  onLike: () => void;
  onBookmark: () => void;
}

const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  onPress,
  onLike,
  onBookmark,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Author Row */}
      <View style={styles.authorRow}>
        <Avatar name={post.author.nickname} uri={post.author.avatarUrl || undefined} size="sm" />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author.nickname}</Text>
          <Text style={styles.timestamp}>2h ago</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content} numberOfLines={3}>{post.content}</Text>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.images[0].imageUrl }} style={styles.image} />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Icon
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? colors.error : colors.textSecondary}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
          <Icon name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
          <Icon
            name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.isBookmarked ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  authorInfo: {
    marginLeft: spacing.sm,
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
  content: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  imageContainer: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
});

export default FeedPostCard;
