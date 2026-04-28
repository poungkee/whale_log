// 다이어리 작성/편집 화면 — 서핑 기록 입력 + 사진 최대 5장 첨부
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X, Star, ChevronDown, Globe, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { DiaryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'CreateDiary'>;

// 보드 타입 목록 (9종)
const BOARD_TYPES = [
  { value: 'LONGBOARD', label: '롱보드' },
  { value: 'SHORTBOARD', label: '숏보드' },
  { value: 'FISH', label: '피시' },
  { value: 'FUNBOARD', label: '펀보드' },
  { value: 'MIDLENGTH', label: '미드렝스' },
  { value: 'SUP', label: 'SUP' },
  { value: 'BODYBOARD', label: '바디보드' },
  { value: 'FOILBOARD', label: '포일보드' },
  { value: 'SOFTBOARD', label: '소프트보드' },
];

// 서핑 시간대 프리셋 (웹앱 동일)
const TIME_PRESETS = [
  { label: '새벽', value: '05:00' },
  { label: '아침', value: '07:00' },
  { label: '오전', value: '09:00' },
  { label: '점심', value: '12:00' },
  { label: '오후', value: '15:00' },
  { label: '저녁', value: '18:00' },
];

// 오늘 날짜를 YYYY-MM-DD 형식으로
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CreateDiaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { spotId, editId } = route.params || {};
  const queryClient = useQueryClient();

  const [surfDate, setSurfDate] = useState(getTodayStr());
  const [surfTime, setSurfTime] = useState('09:00');     // 서핑 시작 시간 HH:mm
  const [boardType, setBoardType] = useState('LONGBOARD');
  const [boardSizeFt, setBoardSizeFt] = useState('');   // 보드 길이 (3.0~12.0 ft)
  const [duration, setDuration] = useState('');
  const [satisfaction, setSatisfaction] = useState(3);
  const [memo, setMemo] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]); // 최대 5장
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC'); // 공개/비공개
  const [loading, setLoading] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);

  // 편집 모드일 경우 기존 데이터 로드
  useEffect(() => {
    if (editId) {
      api.get(`/diaries/${editId}`).then(r => {
        const d = r.data;
        setSurfDate(d.surfDate?.slice(0, 10) || getTodayStr());
        setSurfTime(d.surfTime || '09:00');
        setBoardType(d.boardType || 'LONGBOARD');
        setBoardSizeFt(d.boardSizeFt ? String(d.boardSizeFt) : '');
        setDuration(String(d.durationMinutes || ''));
        setSatisfaction(d.satisfaction || 3);
        setMemo(d.memo || '');
        setVisibility(d.visibility || 'PUBLIC');
        // 기존 이미지 URL (서버 URL이면 그대로 표시)
        if (d.imageUrl) setImageUris([d.imageUrl]);
      });
    }
  }, [editId]);

  // 사진 추가 (최대 5장)
  const pickImage = async () => {
    if (imageUris.length >= 5) {
      Alert.alert('알림', '사진은 최대 5장까지 첨부할 수 있어요.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 5 - imageUris.length,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setImageUris(prev => [...prev, ...newUris].slice(0, 5));
    }
  };

  // 사진 제거
  const removeImage = (idx: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== idx));
  };

  // 저장 처리
  const handleSave = async () => {
    if (!surfDate) {
      Alert.alert('알림', '서핑 날짜를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('surfDate', surfDate);
      formData.append('surfTime', surfTime);
      formData.append('boardType', boardType);
      formData.append('satisfaction', String(satisfaction));
      formData.append('visibility', visibility);
      if (boardSizeFt) formData.append('boardSizeFt', boardSizeFt);
      if (duration) formData.append('durationMinutes', duration);
      if (memo) formData.append('memo', memo);
      if (spotId) formData.append('spotId', spotId);

      // 새로 선택한 사진만 업로드 (http로 시작하지 않는 것)
      const newImages = imageUris.filter(uri => !uri.startsWith('http'));
      newImages.forEach((uri, idx) => {
        formData.append('images', {
          uri,
          name: `diary_${idx}.jpg`,
          type: 'image/jpeg',
        } as any);
      });

      if (editId) {
        await api.patch(`/diaries/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/diaries', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 목록 캐시 초기화 후 뒤로가기
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '저장에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 날짜 입력 */}
        <View style={styles.field}>
          <Text style={styles.label}>서핑 날짜</Text>
          <TextInput
            style={styles.input}
            value={surfDate}
            onChangeText={setSurfDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* 서핑 시간 — 프리셋 6개 + 직접 입력 */}
        <View style={styles.field}>
          <Text style={styles.label}>서핑 시간</Text>
          <View style={styles.timePresets}>
            {TIME_PRESETS.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.timeChip, surfTime === t.value && styles.timeChipActive]}
                onPress={() => setSurfTime(t.value)}
              >
                <Text style={[styles.timeChipText, surfTime === t.value && styles.timeChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: spacing.xs }]}
            value={surfTime}
            onChangeText={setSurfTime}
            placeholder="HH:mm (예: 07:30)"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* 보드 타입 선택 */}
        <View style={styles.field}>
          <Text style={styles.label}>보드 타입</Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setShowBoardPicker(!showBoardPicker)}
          >
            <Text style={styles.selectText}>
              {BOARD_TYPES.find(b => b.value === boardType)?.label || '선택'}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showBoardPicker && (
            <View style={styles.picker}>
              {BOARD_TYPES.map(b => (
                <TouchableOpacity
                  key={b.value}
                  style={[styles.pickerItem, boardType === b.value && styles.pickerItemActive]}
                  onPress={() => { setBoardType(b.value); setShowBoardPicker(false); }}
                >
                  <Text style={[styles.pickerText, boardType === b.value && styles.pickerTextActive]}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 보드 길이 (ft) */}
        <View style={styles.field}>
          <Text style={styles.label}>보드 길이 (ft, 선택)</Text>
          <TextInput
            style={styles.input}
            value={boardSizeFt}
            onChangeText={setBoardSizeFt}
            placeholder="예: 9.0 (3.0 ~ 12.0)"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* 서핑 시간 (분) */}
        <View style={styles.field}>
          <Text style={styles.label}>서핑 시간 (분, 선택)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="예: 90"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        {/* 만족도 */}
        <View style={styles.field}>
          <Text style={styles.label}>만족도</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setSatisfaction(n)}>
                <Star
                  size={32}
                  color={n <= satisfaction ? colors.warning : colors.gray300}
                  fill={n <= satisfaction ? colors.warning : 'transparent'}
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.satisfactionLabel}>
              {['', '아쉬웠어요', '그저 그랬어요', '보통이에요', '좋았어요', '최고였어요'][satisfaction]}
            </Text>
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.field}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={memo}
            onChangeText={setMemo}
            placeholder="오늘 서핑은 어땠나요? 기억에 남는 것, 개선할 점 등..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 공개/비공개 토글 */}
        <View style={styles.field}>
          <View style={styles.visibilityRow}>
            <View style={styles.visibilityLeft}>
              {visibility === 'PUBLIC'
                ? <Globe size={16} color={colors.primary} />
                : <Lock size={16} color={colors.textSecondary} />
              }
              <View>
                <Text style={styles.label2}>
                  {visibility === 'PUBLIC' ? '공개' : '비공개'}
                </Text>
                <Text style={styles.visibilityDesc}>
                  {visibility === 'PUBLIC' ? '스팟 피드에 공개됩니다' : '나만 볼 수 있어요'}
                </Text>
              </View>
            </View>
            <Switch
              value={visibility === 'PUBLIC'}
              onValueChange={v => setVisibility(v ? 'PUBLIC' : 'PRIVATE')}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={visibility === 'PUBLIC' ? colors.primary : colors.gray300}
            />
          </View>
        </View>

        {/* 사진 첨부 (최대 5장) */}
        <View style={styles.field}>
          <Text style={styles.label}>사진 ({imageUris.length}/5)</Text>
          {/* 선택된 사진 그리드 */}
          {imageUris.length > 0 && (
            <View style={styles.imageGrid}>
              {imageUris.map((uri, idx) => (
                <View key={idx} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(idx)}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {/* 추가 버튼 (5장 미만인 경우) */}
              {imageUris.length < 5 && (
                <TouchableOpacity style={styles.addThumb} onPress={pickImage}>
                  <Camera size={20} color={colors.textSecondary} />
                  <Text style={styles.addThumbText}>추가</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* 처음 추가 버튼 */}
          {imageUris.length === 0 && (
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <Camera size={20} color={colors.textSecondary} />
              <Text style={styles.photoBtnText}>사진 추가 (최대 5장)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{editId ? '수정 완료' : '일기 저장'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },

  field: { marginBottom: spacing.lg },
  label: { ...typography.body2, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  label2: { ...typography.body2, fontWeight: '700', color: colors.text },

  input: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...typography.body2, color: colors.text,
  },
  textarea: { height: 100, paddingTop: 12 },

  // 시간 프리셋 칩 목록
  timePresets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  timeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  timeChipTextActive: { color: '#fff' },

  selectBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  selectText: { ...typography.body2, color: colors.text },
  picker: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  pickerItemActive: { backgroundColor: colors.primary + '15' },
  pickerText: { ...typography.body2, color: colors.text },
  pickerTextActive: { color: colors.primary, fontWeight: '700' },

  starsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  satisfactionLabel: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.xs },

  // 공개/비공개 토글 행
  visibilityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  visibilityLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  visibilityDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // 사진 그리드 (3열)
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  imageThumb: { position: 'relative', width: 96, height: 96, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  removeImg: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  addThumb: {
    width: 96, height: 96, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addThumbText: { ...typography.caption, color: colors.textSecondary },

  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    justifyContent: 'center', height: 80,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  photoBtnText: { ...typography.body2, color: colors.textSecondary },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CreateDiaryScreen;
