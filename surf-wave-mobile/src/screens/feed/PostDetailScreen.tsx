import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../../navigation/types';
import Avatar from '../../components/common/Avatar';
import CommentItem from '../../components/feed/CommentItem';
import CommentInput from '../../components/feed/CommentInput';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<FeedStackParamList, 'PostDetail'>;

const PostDetailScreen: React.FC<Props> = ({ route }) => {
  const { postId } = route.params;

  // TODO: Fetch post details
  const post = {
    id: postId,
    author: { id: 'u1', nickname: 'SurferKim', avatarUrl: null },
    content: 'Amazing session today at Yangyang! The waves were perfect. Had a great time with friends.',
    likeCount: 24,
    commentCount: 5,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-15T10:30:00Z',
  };

  const comments = [
    { id: 'c1', author: { id: 'u2', nickname: 'WaveRider', avatarUrl: null }, content: 'Looks amazing!', createdAt: '2024-01-15T11:00:00Z' },
    { id: 'c2', author: { id: 'u3', nickname: 'OceanLover', avatarUrl: null }, content: 'Which board did you use?', createdAt: '2024-01-15T11:30:00Z' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.authorRow}>
            <Avatar name={post.author.nickname} size="md" />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.author.nickname}</Text>
              <Text style={styles.timestamp}>2 hours ago</Text>
            </View>
          </View>

          <Text style={styles.content}>{post.content}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Text style={styles.actionText}>{post.likeCount} likes</Text>
            <Text style={styles.actionText}>{post.commentCount} comments</Text>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment as any}
              onReply={() => {}}
              onLike={() => {}}
            />
          ))}
        </View>
      </ScrollView>

      <CommentInput onSubmit={(text) => console.log('Submit:', text)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  authorInfo: {
    marginLeft: spacing.md,
  },
  authorName: {
    ...typography.body1,
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
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  actionText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  commentsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
});

export default PostDetailScreen;
