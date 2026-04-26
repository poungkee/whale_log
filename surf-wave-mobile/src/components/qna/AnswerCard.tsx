// QnA 답변 카드 — 채택 답변 표시 + 좋아요/채택 액션
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle, ThumbsUp } from 'lucide-react-native';
import Avatar from '../common/Avatar';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Answer {
  id: string;
  content: string;
  author: { id: string; nickname: string; avatarUrl?: string };
  isAccepted: boolean;
  likeCount?: number;
}

interface AnswerCardProps {
  answer: Answer;
  isAuthor?: boolean;
  onAccept: () => void;
  onLike: () => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ answer, isAuthor = false, onAccept, onLike }) => {
  return (
    <View style={[styles.container, answer.isAccepted && styles.acceptedContainer]}>
      {answer.isAccepted && (
        <View style={styles.acceptedBadge}>
          <CheckCircle size={16} color={colors.success} />
          <Text style={styles.acceptedText}>채택된 답변</Text>
        </View>
      )}

      <View style={styles.header}>
        <Avatar name={answer.author.nickname} size="sm" />
        <Text style={styles.authorName}>{answer.author.nickname}</Text>
      </View>

      <Text style={styles.content}>{answer.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <ThumbsUp size={18} color={colors.textSecondary} />
          {answer.likeCount != null && answer.likeCount > 0 && (
            <Text style={styles.actionText}>{answer.likeCount}</Text>
          )}
        </TouchableOpacity>

        {isAuthor && !answer.isAccepted && (
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <CheckCircle size={18} color={colors.success} />
            <Text style={styles.acceptButtonText}>채택</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  acceptedContainer: {
    borderLeftColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  acceptedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  authorName: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  content: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  acceptButtonText: {
    ...typography.body2,
    color: colors.success,
    fontWeight: '500',
  },
});

export default AnswerCard;
