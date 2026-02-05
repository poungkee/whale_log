import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

const EditProfileScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState('');
  const [surfLevel, setSurfLevel] = useState(user?.surfLevel || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: Implement profile update
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar name={nickname} size="lg" />
          <Button title="Change Photo" variant="text" onPress={() => {}} />
        </View>

        <View style={styles.form}>
          <Input
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter nickname"
          />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
          />
          <Input
            label="Surf Level"
            value={surfLevel}
            onChangeText={setSurfLevel}
            placeholder="Beginner / Intermediate / Advanced"
          />
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});

export default EditProfileScreen;
