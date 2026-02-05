import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { colors, spacing } from '../../theme';

const CreateQuestionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: Implement question creation
    setTimeout(() => {
      setLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="What's your question?"
        />
        <Input
          label="Details"
          value={content}
          onChangeText={setContent}
          placeholder="Provide more context..."
          multiline
        />
        {/* TODO: Add tags input */}

        <Button
          title="Post Question"
          onPress={handleSubmit}
          loading={loading}
          disabled={!title.trim() || !content.trim()}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});

export default CreateQuestionScreen;
