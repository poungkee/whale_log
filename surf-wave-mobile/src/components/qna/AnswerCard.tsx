import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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

const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  isAuthor = false,
  onAccept,
  onLike,
}) => {
  return (
    <View style={[styles.container, answer.isAccepted && styles.acceptedContainer]}>
      {answer.isAccepted && (
        <View style={styles.acceptedBadge}>
          <Icon name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.acceptedText}>Accepted Answer</Text>
        </View>
      )}

      <View style={styles.header}>
        <Avatar name={answer.author.nickname} size="sm" />
        <Text style={styles.authorName}>{answer.author.nickname}</Text>
      </View>

      <Text style={styles.content}>{answer.content}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Icon name="thumbs-up-outline" size={18} color={colors.textSecondary} />
          {answer.likeCount && answer.likeCount > 0 && (
            <Text style={styles.actionText}>{answer.likeCount}</Text>
          )}
        </TouchableOpacity>

        {isAuthor && !answer.isAccepted && (
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Icon name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.acceptButtonText}>Accept</Text>
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
