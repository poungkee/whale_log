// 다이어리 카드용 도움됐어요 + 댓글 (Phase 2C-mobile)
// 모바일에서 ✋ 도움됐어요 + 💬 댓글 토글 + 작성/삭제 통합
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  TextInput, ActivityIndicator,
} from 'react-native';
import { ThumbsUp, MessageCircle, Send, Trash2 } from 'lucide-react-native';
import { api } from '../config/api';
import { colors, spacing } from '../theme';
import { useAuthStore } from '../stores/authStore';

interface DiaryInteractionsProps {
  diaryId: string;
}

interface CommentItem {
  id: string;
  content: string;
  authorId: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
  author?: { id: string; username: string | null; avatarUrl: string | null };
}

export const DiaryInteractions: React.FC<DiaryInteractionsProps> = ({ diaryId }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const myUserId = useAuthStore((s) => s.user?.id);

  const [helpfulCount, setHelpfulCount] = useState(0);
  const [helpful, setHelpful] = useState(false);
  const [helpfulLoading, setHelpfulLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 마운트 시 도움됐어요 카운트 + 본인 누름 여부 (인증된 경우) */
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get(`/diaries/${diaryId}/helpful`)
      .then((r) => {
        setHelpfulCount(r.data?.count ?? 0);
        setHelpful(!!r.data?.helpful);
      })
      .catch(() => {});
  }, [diaryId, isAuthenticated]);

  /** 댓글 lazy 로드 — 펼칠 때만 호출 */
  const loadComments = async () => {
    if (commentsLoaded || !isAuthenticated) return;
    try {
      const r = await api.get(`/diaries/${diaryId}/comments`);
      setComments(Array.isArray(r.data) ? r.data : (r.data?.data ?? []));
    } catch { /* ignore */ }
    finally { setCommentsLoaded(true); }
  };

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  const handleHelpful = async () => {
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요합니다');
      return;
    }
    setHelpfulLoading(true);
    try {
      const r = await api.post(`/diaries/${diaryId}/helpful/toggle`);
      setHelpful(!!r.data?.helpful);
      setHelpfulCount(r.data?.count ?? 0);
    } catch { /* ignore */ }
    finally { setHelpfulLoading(false); }
  };

  const handleSubmit = async () => {
    if (!commentInput.trim()) return;
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요합니다');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post(`/diaries/${diaryId}/comments`, {
        content: commentInput.trim(),
      });
      setComments((prev) => [...prev, r.data]);
      setCommentInput('');
    } catch {
      Alert.alert('댓글 작성 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('댓글 삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/diaries/${diaryId}/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      {/* 액션 행 — 도움됐어요 + 댓글 토글 */}
      <View style={s.actionRow}>
        <TouchableOpacity style={s.btn} onPress={handleHelpful} disabled={helpfulLoading} activeOpacity={0.7}>
          <ThumbsUp
            size={14}
            color={helpful ? colors.primary : colors.textTertiary}
            fill={helpful ? colors.primary : 'transparent'}
          />
          <Text style={[s.txt, helpful && s.txtActive]}>
            도움됐어요 {helpfulCount > 0 && helpfulCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={handleToggleComments} activeOpacity={0.7}>
          <MessageCircle size={14} color={colors.textTertiary} />
          <Text style={s.txt}>
            댓글 {comments.length > 0 && comments.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 댓글 영역 (펼친 상태) */}
      {showComments && (
        <View style={s.commentsBox}>
          {!commentsLoaded && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
          )}
          {commentsLoaded && comments.length === 0 && (
            <Text style={s.emptyTxt}>첫 댓글을 남겨보세요!</Text>
          )}
          {comments.map((c) => (
            <View key={c.id} style={s.commentItem}>
              <Text style={s.commentAuthor}>{c.author?.username || '?'}</Text>
              <Text style={s.commentBody}>{c.content}</Text>
              {c.authorId === myUserId && (
                <TouchableOpacity onPress={() => handleDelete(c.id)} style={s.deleteBtn}>
                  <Trash2 size={11} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* 댓글 입력 */}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder="댓글..."
              placeholderTextColor={colors.textTertiary}
              maxLength={500}
              editable={!submitting && isAuthenticated}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!commentInput.trim() || submitting) && s.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!commentInput.trim() || submitting}
            >
              <Send size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  actionRow: { flexDirection: 'row', gap: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txt: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },
  txtActive: { color: colors.primary, fontWeight: '700' },

  commentsBox: { marginTop: spacing.sm, gap: 6 },
  emptyTxt: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingVertical: 6 },
  commentItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.surfaceSecondary + '60',
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 6,
  },
  commentAuthor: { fontSize: 11, fontWeight: '700', color: colors.text },
  commentBody: { flex: 1, fontSize: 11, color: colors.text, lineHeight: 16 },
  deleteBtn: { padding: 2 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  input: {
    flex: 1, backgroundColor: colors.surfaceSecondary + '60',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6,
    fontSize: 11, color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 6,
    padding: 6,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
