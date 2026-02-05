import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<MyPageStackParamList, 'GuideDetail'>;

const GuideDetailScreen: React.FC<Props> = ({ route }) => {
  const { guideId } = route.params;

  const guide = {
    id: guideId,
    title: 'Getting Started with Surfing',
    content: `
# Introduction

Surfing is an exciting water sport that combines athleticism, skill, and a deep connection with the ocean.

## What You'll Need

1. A surfboard appropriate for your skill level
2. A wetsuit (depending on water temperature)
3. Surf wax
4. A leash

## Basic Steps

### 1. Paddling
Lie flat on your board and paddle with your arms to move through the water.

### 2. Catching a Wave
When you see a wave approaching, start paddling towards shore. Feel the wave lift you.

### 3. Standing Up
Push up with your arms, bring your feet under you, and stand in one smooth motion.

## Tips for Beginners

- Start with smaller waves
- Practice on the beach first
- Don't get discouraged - surfing takes time!
    `,
    estimatedReadMinutes: 5,
    isCompleted: false,
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{guide.title}</Text>
          <Text style={styles.readTime}>{guide.estimatedReadMinutes} min read</Text>
        </View>

        {/* TODO: Render markdown content properly */}
        <View style={styles.content}>
          <Text style={styles.contentText}>{guide.content}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={guide.isCompleted ? 'Completed!' : 'Mark as Complete'}
          onPress={() => {}}
          disabled={guide.isCompleted}
        />
      </View>
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
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.textInverse,
  },
  readTime: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  contentText: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 24,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default GuideDetailScreen;
