import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface Question {
  id: string;
  title: string;
  author: { nickname: string };
  answerCount: number;
  viewCount: number;
  tags?: string[];
  acceptedAnswerId?: string;
}

interface QuestionCardProps {
  question: Question;
  onPress: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onPress }) => {
  const hasAcceptedAnswer = !!question.acceptedAnswerId;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.stats}>
        <View style={[styles.statBox, hasAcceptedAnswer && styles.acceptedBox]}>
          <Text style={[styles.statValue, hasAcceptedAnswer && styles.acceptedText]}>
            {question.answerCount}
          </Text>
          <Text style={[styles.statLabel, hasAcceptedAnswer && styles.acceptedText]}>
            answers
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{question.viewCount}</Text>
          <Text style={styles.statLabel}>views</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{question.title}</Text>
        <View style={styles.footer}>
          <Text style={styles.author}>asked by {question.author.nickname}</Text>
          {question.tags && question.tags.length > 0 && (
            <View style={styles.tags}>
              {question.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  stats: {
    marginRight: spacing.md,
    gap: spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    minWidth: 60,
  },
  acceptedBox: {
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success,
  },
  statValue: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  acceptedText: {
    color: colors.success,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body1,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.sm,
  },
  author: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
  },
});

export default QuestionCard;
