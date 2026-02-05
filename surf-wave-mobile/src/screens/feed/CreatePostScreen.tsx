import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import ImagePicker from '../../components/common/ImagePicker';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<FeedStackParamList, 'CreatePost'>;

const CreatePostScreen: React.FC<Props> = ({ navigation, route }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    setLoading(true);
    // TODO: Implement post creation
    setTimeout(() => {
      setLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Share your surf experience..."
          placeholderTextColor={colors.textTertiary}
          multiline
          value={content}
          onChangeText={setContent}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <ImagePicker
            images={images}
            onImagesChange={setImages}
            maxCount={5}
          />
        </View>

        {/* TODO: Add spot selector, tags input */}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Post"
          onPress={handlePost}
          loading={loading}
          disabled={!content.trim()}
        />
      </View>
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
  input: {
    ...typography.body1,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.body2,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default CreatePostScreen;
