// 피드 게시물 카드 — 좋아요/댓글/북마크 액션 포함
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import Avatar from '../common/Avatar';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Post {
  id: string;
  author: { id: string; username: string | null; avatarUrl: string | null };
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

const FeedPostCard: React.FC<FeedPostCardProps> = ({ post, onPress, onLike, onBookmark }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.authorRow}>
        <Avatar name={post.author.username || '?'} uri={post.author.avatarUrl || undefined} size="sm" />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author.username || '알 수 없음'}</Text>
          <Text style={styles.timestamp}>2h ago</Text>
        </View>
      </View>

      <Text style={styles.content} numberOfLines={3}>{post.content}</Text>

      {post.images && post.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.images[0].imageUrl }} style={styles.image} />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Heart
            size={20}
            color={post.isLiked ? colors.error : colors.textSecondary}
            fill={post.isLiked ? colors.error : 'transparent'}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
          <MessageCircle size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
          <Bookmark
            size={20}
            color={post.isBookmarked ? colors.primary : colors.textSecondary}
            fill={post.isBookmarked ? colors.primary : 'transparent'}
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
