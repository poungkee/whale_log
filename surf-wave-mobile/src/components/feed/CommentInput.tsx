// 댓글 입력 컴포넌트
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';

interface CommentInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  replyTo?: string;
}

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = '댓글을 입력하세요...',
  replyTo,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      {replyTo && <View style={styles.replyBanner} />}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!text.trim()}
        >
          <Send size={20} color={text.trim() ? colors.primary : colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  replyBanner: {
    padding: spacing.sm,
    backgroundColor: colors.gray100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body2,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    padding: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default CommentInput;
