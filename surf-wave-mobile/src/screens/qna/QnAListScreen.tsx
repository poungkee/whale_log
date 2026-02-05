import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import QuestionCard from '../../components/qna/QuestionCard';
import { colors, spacing } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MyPageStackParamList, 'QnAList'>;
};

const QUESTIONS = [
  { id: '1', title: 'Best board for beginners?', author: { nickname: 'NewSurfer' }, answerCount: 5, viewCount: 42 },
  { id: '2', title: 'How to improve duck diving?', author: { nickname: 'WaveRider' }, answerCount: 3, viewCount: 28 },
];

const QnAListScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={QUESTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuestionCard
            question={item as any}
            onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateQuestion')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.textInverse,
  },
});

export default QnAListScreen;
