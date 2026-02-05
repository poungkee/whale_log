import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MyPageStackParamList } from '../../navigation/types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import StarRating from '../../components/common/StarRating';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<MyPageStackParamList, 'CreateDiary'>;

const BOARD_TYPES = ['Longboard', 'Shortboard', 'Funboard', 'Fish', 'SUP'];

const CreateDiaryScreen: React.FC<Props> = ({ navigation }) => {
  const [spotId, setSpotId] = useState('');
  const [surfDate, setSurfDate] = useState('');
  const [boardType, setBoardType] = useState('');
  const [duration, setDuration] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    // TODO: Implement diary creation
    setTimeout(() => {
      setLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* TODO: Add spot picker */}
        <Input
          label="Surf Date"
          value={surfDate}
          onChangeText={setSurfDate}
          placeholder="YYYY-MM-DD"
        />

        <View style={styles.section}>
          <Text style={styles.label}>Board Type</Text>
          <View style={styles.chips}>
            {BOARD_TYPES.map((type) => (
              <Button
                key={type}
                title={type}
                variant={boardType === type ? 'primary' : 'outline'}
                onPress={() => setBoardType(type)}
                style={styles.chip}
              />
            ))}
          </View>
        </View>

        <Input
          label="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          placeholder="e.g., 120"
          keyboardType="numeric"
        />

        <View style={styles.section}>
          <Text style={styles.label}>How was your session?</Text>
          <StarRating
            rating={satisfaction}
            maxStars={5}
            editable
            onRatingChange={setSatisfaction}
            size={36}
          />
        </View>

        <Input
          label="Notes"
          value={memo}
          onChangeText={setMemo}
          placeholder="Write about your session..."
          multiline
        />

        <Button
          title="Save Entry"
          onPress={handleCreate}
          loading={loading}
          disabled={!surfDate || !boardType || satisfaction === 0}
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
  section: {
    marginVertical: spacing.md,
  },
  label: {
    ...typography.body2,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});

export default CreateDiaryScreen;
