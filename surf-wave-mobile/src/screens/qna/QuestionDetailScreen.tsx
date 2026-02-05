import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import AnswerCard from '../../components/qna/AnswerCard';
import CommentInput from '../../components/feed/CommentInput';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<MyPageStackParamList, 'QuestionDetail'>;

const QuestionDetailScreen: React.FC<Props> = ({ route }) => {
  const { questionId } = route.params;

  const question = {
    id: questionId,
    title: 'Best board for beginners?',
    content: 'I just started surfing and looking for my first board. What would you recommend?',
    author: { nickname: 'NewSurfer' },
    answerCount: 5,
    createdAt: '2024-01-10',
  };

  const answers = [
    { id: 'a1', content: 'I recommend starting with a foam board. They are stable and forgiving.', author: { nickname: 'ProSurfer' }, isAccepted: true },
    { id: 'a2', content: 'A longboard around 8-9 feet would be great for learning.', author: { nickname: 'WaveRider' }, isAccepted: false },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.questionSection}>
          <Text style={styles.title}>{question.title}</Text>
          <Text style={styles.meta}>Asked by {question.author.nickname}</Text>
          <Text style={styles.content}>{question.content}</Text>
        </View>

        <View style={styles.answersSection}>
          <Text style={styles.sectionTitle}>{question.answerCount} Answers</Text>
          {answers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer as any}
              onAccept={() => {}}
              onLike={() => {}}
            />
          ))}
        </View>
      </ScrollView>

      <CommentInput
        onSubmit={(text) => console.log('Answer:', text)}
        placeholder="Write your answer..."
      />
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
  questionSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  content: {
    ...typography.body1,
    color: colors.text,
    marginTop: spacing.md,
    lineHeight: 24,
  },
  answersSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
});

export default QuestionDetailScreen;
