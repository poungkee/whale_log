// 커뮤니티 피드 화면 — 실제 API 연동 (GET /community/posts)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
  ScrollView, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Plus, X, Camera, Send, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../../components/common/Avatar';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

// 커뮤니티 게시글 타입
interface CommunityPost {
  id: string;
  author: { id: string; username: string | null; avatarUrl: string | null };
  content: string;
  images: { id: string; imageUrl: string }[];
  spot: { id: string; name: string; region: string } | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface PostsPage {
  data: CommunityPost[];
  total: number;
  page: number;
  hasNextPage: boolean;
}

// 상대 시간 표시 (예: 방금 전, 5분 전, 3시간 전)
const relativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const FeedScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // 글쓰기 모달 상태
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 게시글 목록 무한 스크롤 조회
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<PostsPage>({
    queryKey: ['community-posts'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/community/posts?page=${pageParam}&limit=15`);
      // 백엔드가 배열 직접 반환하는 경우도 대응
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { data: raw, total: raw.length, page: pageParam as number, hasNextPage: raw.length === 15 };
      }
      return {
        data: raw.data ?? [],
        total: raw.total ?? 0,
        page: pageParam as number,
        hasNextPage: (raw.page ?? 1) * 15 < (raw.total ?? 0),
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.page + 1 : undefined,
  });

  const posts = data?.pages.flatMap(p => p.data) ?? [];

  // 좋아요 토글
  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/community/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });

  // 글 작성 — 사진 선택
  const pickImages = async () => {
    if (newImages.length >= 5) { Alert.alert('알림', '사진은 최대 5장까지 첨부 가능해요.'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('권한 필요', '사진 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - newImages.length,
    });
    if (!result.canceled) {
      setNewImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  // 게시글 제출
  const handleSubmit = async () => {
    if (!newContent.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', newContent.trim());
      newImages.forEach((uri, i) => {
        formData.append('images', { uri, name: `post_${i}.jpg`, type: 'image/jpeg' } as any);
      });
      await api.post('/community/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowCreate(false);
      setNewContent('');
      setNewImages([]);
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '게시글 작성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 게시글 카드 렌더링
  const renderPost = useCallback(({ item: post }: { item: CommunityPost }) => (
    <View style={styles.card}>
      {/* 작성자 정보 */}
      <View style={styles.authorRow}>
        <Avatar name={post.author.username || '?'} uri={post.author.avatarUrl || undefined} size="sm" />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author.username || '알 수 없음'}</Text>
          <View style={styles.metaRow}>
            {post.spot && (
              <>
                <MapPin size={10} color={colors.primary} />
                <Text style={styles.spotTag}>{post.spot.name}</Text>
                <Text style={styles.dot}>·</Text>
              </>
            )}
            <Text style={styles.timestamp}>{relativeTime(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* 본문 */}
      <Text style={styles.content}>{post.content}</Text>

      {/* 첨부 이미지 (첫 번째만 크게, 나머지는 작게) */}
      {post.images.length > 0 && (
        <View style={styles.imagesContainer}>
          <Image source={{ uri: post.images[0].imageUrl }} style={styles.mainImage} />
          {post.images.length > 1 && (
            <View style={styles.thumbRow}>
              {post.images.slice(1).map((img) => (
                <Image key={img.id} source={{ uri: img.imageUrl }} style={styles.thumbImage} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* 좋아요 / 댓글 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            if (!isAuthenticated) { Alert.alert('로그인 필요', '로그인 후 이용해주세요.'); return; }
            likeMutation.mutate(post.id);
          }}
        >
          <Heart
            size={18}
            color={post.isLiked ? colors.error : colors.textSecondary}
            fill={post.isLiked ? colors.error : 'transparent'}
          />
          <Text style={[styles.actionText, post.isLiked && { color: colors.error }]}>
            {post.likeCount}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionBtn}>
          <MessageCircle size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </View>
      </View>
    </View>
  ), [isAuthenticated, likeMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>소통</Text>
      </View>

      {/* 게시글 목록 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>아직 게시글이 없어요 🌊</Text>
          <Text style={styles.emptySubText}>첫 번째 서퍼가 되어보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={isFetchingNextPage
            ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            : null
          }
        />
      )}

      {/* 글쓰기 FAB */}
      {isAuthenticated && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 글쓰기 모달 */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setNewContent(''); setNewImages([]); }}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>새 글 작성</Text>
              <TouchableOpacity
                style={[styles.postBtn, (!newContent.trim() || submitting) && styles.postBtnDisabled]}
                onPress={handleSubmit}
                disabled={!newContent.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.postBtnText}>게시</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.contentInput}
                value={newContent}
                onChangeText={setNewContent}
                placeholder="서핑 경험을 공유해보세요! 🌊"
                placeholderTextColor={colors.textTertiary}
                multiline
                autoFocus
              />

              {/* 첨부 이미지 미리보기 */}
              {newImages.length > 0 && (
                <View style={styles.previewGrid}>
                  {newImages.map((uri, i) => (
                    <View key={i} style={styles.previewThumb}>
                      <Image source={{ uri }} style={styles.previewImg} />
                      <TouchableOpacity
                        style={styles.removeThumb}
                        onPress={() => setNewImages(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X size={11} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* 하단 도구 바 */}
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolBtn} onPress={pickImages}>
                <Camera size={22} color={colors.primary} />
                <Text style={styles.toolBtnText}>사진 {newImages.length}/5</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h2, fontWeight: '700', color: colors.text },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { ...typography.body1, fontWeight: '600', color: colors.text },
  emptySubText: { ...typography.body2, color: colors.textSecondary },

  list: { padding: spacing.md, paddingBottom: 80 },

  // 게시글 카드
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  authorInfo: { marginLeft: spacing.sm, flex: 1 },
  authorName: { ...typography.body2, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  spotTag: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  dot: { ...typography.caption, color: colors.textTertiary },
  timestamp: { ...typography.caption, color: colors.textTertiary },

  content: { ...typography.body2, color: colors.text, lineHeight: 21, marginBottom: spacing.sm },

  imagesContainer: { marginBottom: spacing.sm, borderRadius: 10, overflow: 'hidden' },
  mainImage: { width: '100%', height: 200 },
  thumbRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  thumbImage: { flex: 1, height: 80 },

  actions: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.xs },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },

  // 글쓰기 모달
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.body1, fontWeight: '700', color: colors.text },
  postBtn: {
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  modalBody: { flex: 1, padding: spacing.lg },
  contentInput: {
    ...typography.body1, color: colors.text,
    minHeight: 120, textAlignVertical: 'top', lineHeight: 24,
  },

  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  previewThumb: { position: 'relative', width: 88, height: 88, borderRadius: 10, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  removeThumb: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },

  toolbar: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolBtnText: { ...typography.body2, color: colors.primary, fontWeight: '600' },
});

export default FeedScreen;
