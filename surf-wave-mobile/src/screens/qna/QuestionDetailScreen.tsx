// 미사용 화면 — 추후 구현 예정
import React from 'react';
import { View, Text } from 'react-native';
import { colors, typography } from '../../theme';

const QuestionDetailScreen: React.FC<any> = () => (
  <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ ...typography.body2, color: colors.textSecondary }}>준비 중이에요</Text>
  </View>
);

export default QuestionDetailScreen;
