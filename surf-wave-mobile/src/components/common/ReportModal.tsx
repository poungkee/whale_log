// 콘텐츠 신고 모달 (Phase 2D)
//
// 사용처: 다이어리 신고 (POST /diary/:id/report)
// 사용자 흐름:
// 1. 사유 5개 중 1개 선택
// 2. (선택) 부가 설명 (최대 500자)
// 3. 제출 → Alert 안내 + 모달 닫힘
//
// 백엔드 응답 처리: 400/403/404/409 한국어 메시지 매핑
// 작성자에게 알려지지 않는다는 안내문 표시 (보복 방지 신뢰 형성)

import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { X, Flag, AlertCircle } from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography, borderRadius } from '../../theme';

/** 신고 사유 - 백엔드 ReportReason enum과 1:1 일치 */
const REPORT_REASONS: { value: ReportReason; label: string; desc: string }[] = [
  { value: 'SPAM',           label: '스팸/광고',          desc: '반복 광고, 도배성 게시물' },
  { value: 'HARASSMENT',     label: '괴롭힘/욕설',        desc: '특정 인물 비방, 욕설' },
  { value: 'INAPPROPRIATE',  label: '부적절한 콘텐츠',    desc: '선정적, 폭력적 이미지/내용' },
  { value: 'MISINFORMATION', label: '허위 정보',          desc: '거짓 정보, 사기' },
  { value: 'OTHER',          label: '기타',               desc: '위 항목에 해당하지 않는 사유' },
];

type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISINFORMATION' | 'OTHER';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  /** 신고 대상 종류 — 현재는 'diary'만 지원 */
  targetType: 'diary';
  /** 신고 대상 ID */
  targetId: string;
  /** 신고 성공 후 콜백 (선택) */
  onSubmitted?: () => void;
}

export function ReportModal({ visible, onClose, targetType, targetId, onSubmitted }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = () => {
    setReason('');
    setDescription('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const url = targetType === 'diary' ? `/diary/${targetId}/report` : '';
      await api.post(url, {
        reason,
        description: description || undefined,
      });
      Alert.alert('신고 접수 완료', '검토 후 가이드라인 위반이 확인되면 조치합니다.');
      onSubmitted?.();
      handleClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      const msg = (typeof serverMsg === 'string' && serverMsg) || (
        status === 400 ? '본인의 다이어리는 신고할 수 없습니다' :
        status === 403 ? '비공개 다이어리는 신고할 수 없습니다' :
        status === 404 ? '다이어리를 찾을 수 없습니다' :
        status === 409 ? '이미 신고 접수된 다이어리입니다' :
        status === 401 ? '로그인이 필요합니다' :
        '신고 접수 중 문제가 발생했습니다'
      );
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <View style={s.modal}>
          {/* 헤더 */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Flag size={20} color={colors.error} />
              <Text style={s.title}>다이어리 신고</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: spacing.md }}>
            {/* 안내문 */}
            <View style={s.notice}>
              <AlertCircle size={14} color={colors.primary} />
              <Text style={s.noticeTxt}>
                신고 내용은 관리자만 확인하며, <Text style={{ fontWeight: '700' }}>작성자에게는 알려지지 않습니다</Text>.
                검토 후 가이드라인 위반이 확인되면 숨김 처리됩니다.
              </Text>
            </View>

            {/* 사유 선택 */}
            <Text style={s.sectionLabel}>신고 사유 선택 *</Text>
            {REPORT_REASONS.map(r => {
              const selected = reason === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[s.reasonBtn, selected && s.reasonBtnActive]}
                  onPress={() => setReason(r.value)}
                >
                  <View style={[s.radio, selected && s.radioActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reasonLabel, selected && { color: colors.error }]}>{r.label}</Text>
                    <Text style={s.reasonDesc}>{r.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* 부가 설명 */}
            <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>
              상세 설명 (선택, {description.length}/500)
            </Text>
            <TextInput
              style={s.textArea}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 500))}
              placeholder="구체적인 사유나 위반 내용을 적어주시면 빠른 검토에 도움이 됩니다"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* 에러 메시지 */}
            {errorMsg && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{errorMsg}</Text>
              </View>
            )}
          </ScrollView>

          {/* 액션 버튼 */}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleClose} disabled={submitting}>
              <Text style={s.cancelBtnTxt}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, (!reason || submitting) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.submitBtnTxt}>신고하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.md,
  },
  modal: {
    width: '100%', maxWidth: 420, maxHeight: '85%',
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.h4, color: colors.text, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },

  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },

  notice: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: colors.primaryLight, borderColor: colors.primary,
    borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeTxt: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },

  sectionLabel: {
    ...typography.caption, color: colors.textSecondary, fontWeight: '600',
    marginBottom: spacing.xs,
  },

  reasonBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: spacing.sm, marginBottom: 6,
  },
  reasonBtnActive: {
    borderColor: colors.error, backgroundColor: '#FEE2E2',
  },
  radio: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
    borderColor: colors.textSecondary, backgroundColor: 'transparent',
  },
  radioActive: { borderColor: colors.error, backgroundColor: colors.error },
  reasonLabel: { ...typography.body2, color: colors.text, fontWeight: '600' },
  reasonDesc: { ...typography.caption, fontSize: 10, color: colors.textTertiary, marginTop: 2 },

  textArea: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.sm,
    color: colors.text, minHeight: 80, ...typography.body2,
  },

  errorBox: {
    backgroundColor: '#FEE2E2', borderColor: colors.error, borderWidth: 1,
    borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.sm,
  },
  errorTxt: { ...typography.caption, color: colors.error },

  actions: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnTxt: { ...typography.body2, color: colors.text, fontWeight: '600' },
  submitBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnTxt: { ...typography.body2, color: '#fff', fontWeight: '700' },
});
