/**
 * @file CommunityFeed.tsx
 * @description 커뮤니티 소통 피드 — 게시글 목록 + 글쓰기 FAB
 *
 * 두 곳에서 사용:
 * 1. 홈 탭 "소통" 토글 → spotId 없이 전체 글 (지역 필터 적용)
 * 2. 스팟 상세 모달 "소통" 탭 → spotId로 해당 스팟 글만
 *
 * API: GET /api/v1/community/posts?spotId={spotId}&page={page}&limit=15
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Heart, MessageCircle, MapPin, Loader2,
  Plus, Send, X, ImagePlus,
} from 'lucide-react';

/** 게시글 타입 */
interface Post {
  id: string;
  content: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  createdAt: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
  spot: { id: string; name: string; region: string } | null;
  images: { id: string; imageUrl: string; sortOrder: number }[];
  /** 현재 사용자가 좋아요 했는지 */
  isLiked?: boolean;
}

/** 댓글 타입 */
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; nickname: string };
  replies?: Comment[];
}

/** 스팟 옵션 (글 작성 시 선택) */
interface SpotOption {
  id: string;
  name: string;
  region: string;
}

interface CommunityFeedProps {
  /** 특정 스팟의 글만 보기 (null이면 전체) */
  spotId?: string | null;
  /** 지역 필터 키워드 (홈에서 사용, 예: "양양", "Bali") */
  regionFilter?: string | null;
}

/**
 * 상대 시간 표시 (예: "3분 전", "2시간 전", "어제")
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 172800) return '어제';
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function CommunityFeed({ spotId, regionFilter }: CommunityFeedProps) {
  /* ===== 글 목록 상태 ===== */
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  /* ===== 글 상세 (댓글 보기) ===== */
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  /* ===== 글 작성 모달 ===== */
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [writeContent, setWriteContent] = useState('');
  const [writeSpotId, setWriteSpotId] = useState(spotId || '');
  const [writeImages, setWriteImages] = useState<{ localUrl: string; file: File }[]>([]);
  /** 스팟 검색어 (글 작성 시 드롭다운 필터) */
  const [spotSearch, setSpotSearch] = useState('');
  /** 스팟 드롭다운 열림 상태 */
  const [spotDropdownOpen, setSpotDropdownOpen] = useState(false);
  const [spots, setSpots] = useState<SpotOption[]>([]);
  const [writeSending, setWriteSending] = useState(false);

  /** 인증 토큰 */
  const getToken = () => localStorage.getItem('accessToken');

  /**
   * 게시글 목록 조회
   * GET /api/v1/community/posts?spotId=xxx&page=N&limit=15
   */
  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    setLoading(!append);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '15' });
      if (spotId) params.set('spotId', spotId);

      const res = await fetch(`/api/v1/community/posts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('posts fetch failed');
      const json = await res.json();
      const items: Post[] = json.data || [];
      const meta = json.meta || {};

      setPosts(prev => append ? [...prev, ...items] : items);
      setHasNext(meta.hasNext || false);
      setPage(pageNum);
    } catch {
      console.warn('게시글 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  /** 최초 로드 */
  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  /**
   * 좋아요 토글
   * POST /api/v1/community/posts/:id/like
   */
  const toggleLike = async (postId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;

      /** 로컬 상태 즉시 업데이트 (낙관적 업데이트) */
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const liked = !p.isLiked;
        return { ...p, isLiked: liked, likeCount: p.likeCount + (liked ? 1 : -1) };
      }));
    } catch { /* 무시 */ }
  };

  /**
   * 댓글 목록 조회
   * GET /api/v1/community/posts/:id/comments
   */
  const fetchComments = async (postId: string) => {
    const token = getToken();
    if (!token) return;

    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/v1/community/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.data || []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  /** 글 상세 열기 → 댓글 로드 */
  const openPost = (post: Post) => {
    setSelectedPost(post);
    setNewComment('');
    fetchComments(post.id);
  };

  /**
   * 댓글 작성
   * POST /api/v1/community/posts/:id/comments
   */
  const submitComment = async () => {
    if (!selectedPost || !newComment.trim()) return;
    const token = getToken();
    if (!token) return;

    setCommentSending(true);
    try {
      const res = await fetch(`/api/v1/community/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error();

      setNewComment('');
      fetchComments(selectedPost.id);
      /** 댓글 수 업데이트 */
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p
      ));
    } catch { /* 무시 */ } finally {
      setCommentSending(false);
    }
  };

  /**
   * 글 작성 — 이미지 업로드 후 게시
   */
  const submitPost = async () => {
    if (!writeContent.trim()) return;
    const token = getToken();
    if (!token) return;

    setWriteSending(true);
    try {
      /** 이미지 업로드 */
      let imageUrls: string[] = [];
      if (writeImages.length > 0) {
        const formData = new FormData();
        writeImages.forEach(img => formData.append('files', img.file));
        const uploadRes = await fetch('/api/v1/upload/images', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrls = uploadData.urls || [];
        }
      }

      /** 게시글 작성 */
      const body: Record<string, unknown> = { content: writeContent.trim() };
      if (writeSpotId) body.spotId = writeSpotId;
      if (imageUrls.length > 0) body.imageUrls = imageUrls;

      const res = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();

      /** 성공 → 폼 닫고 목록 새로고침 */
      setShowWriteForm(false);
      setWriteContent('');
      setWriteImages([]);
      fetchPosts(1);
    } catch { /* 무시 */ } finally {
      setWriteSending(false);
    }
  };

  /** 스팟 목록 로드 (글 작성 시 선택용) */
  useEffect(() => {
    if (!showWriteForm) return;
    /** limit=150으로 전체 스팟 조회 (124개 전부) */
    fetch('/api/v1/spots?limit=150').then(r => r.json()).then(data => {
      const list = (Array.isArray(data) ? data : data.data || []).map(
        (s: { id: string; name: string; region: string }) => ({ id: s.id, name: s.name, region: s.region })
      );
      setSpots(list);
    }).catch(() => {});
  }, [showWriteForm]);

  /** 이미지 선택 */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - writeImages.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      localUrl: URL.createObjectURL(file),
      file,
    }));
    setWriteImages(prev => [...prev, ...toAdd]);
    e.target.value = '';
  };

  /** 지역 필터 적용 */
  const filteredPosts = regionFilter
    ? posts.filter(p => {
        if (!p.spot) return true;
        if (regionFilter === '국내') return !p.spot.region.startsWith('Bali');
        if (regionFilter === '발리') return p.spot.region.startsWith('Bali');
        return true;
      })
    : posts;

  return (
    <div className="relative">
      {/* 로딩 */}
      {loading && posts.length === 0 && (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">소통 글을 불러오는 중...</p>
        </div>
      )}

      {/* 글 목록 */}
      {filteredPosts.length > 0 && (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => openPost(post)}
            >
              {/* 작성자 + 시간 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {post.author.nickname?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold">{post.author.nickname}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                {post.spot && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {post.spot.name}
                  </span>
                )}
              </div>

              {/* 내용 */}
              <p className="text-sm leading-relaxed mb-2 line-clamp-3">{post.content}</p>

              {/* 이미지 */}
              {post.images && post.images.length > 0 && (
                <div className="flex gap-1.5 mb-2 overflow-x-auto">
                  {post.images.sort((a, b) => a.sortOrder - b.sortOrder).map(img => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover border border-border shrink-0"
                      onClick={e => { e.stopPropagation(); window.open(img.imageUrl, '_blank'); }}
                    />
                  ))}
                </div>
              )}

              {/* 좋아요 + 댓글 수 */}
              <div className="flex items-center gap-4">
                <button
                  onClick={e => { e.stopPropagation(); toggleLike(post.id); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-accent text-accent' : ''}`} />
                  {post.likeCount > 0 && post.likeCount}
                </button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.commentCount > 0 && post.commentCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 더보기 */}
      {hasNext && !loading && (
        <div className="text-center mt-3">
          <button onClick={() => fetchPosts(page + 1, true)} className="text-sm text-primary hover:underline">
            더보기
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground mb-1">아직 글이 없어요</p>
          <p className="text-[11px] text-muted-foreground">첫 번째 글을 작성해보세요!</p>
        </div>
      )}

      {/* 글쓰기 FAB */}
      <button
        onClick={() => setShowWriteForm(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-primary text-primary-foreground rounded-full
                   shadow-lg shadow-primary/30 flex items-center justify-center z-40
                   hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ===== 글 작성 모달 ===== */}
      {showWriteForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWriteForm(false)} />
          <div className="relative w-full max-w-md bg-card rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold">글 쓰기</h2>
                <button onClick={() => setShowWriteForm(false)} className="p-1 hover:bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 스팟 선택 — 검색 가능한 드롭다운 (고정 spotId 없을 때만) */}
              {!spotId && (
                <div className="mb-3 relative">
                  {/* 선택 버튼 */}
                  <button
                    type="button"
                    onClick={() => setSpotDropdownOpen(!spotDropdownOpen)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-left flex items-center gap-2
                      ${spotDropdownOpen
                        ? 'bg-card border-primary/50 ring-2 ring-primary/20'
                        : 'bg-secondary border-border'
                      }
                      ${!writeSpotId ? 'text-muted-foreground' : ''}`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {writeSpotId
                      ? (() => { const s = spots.find(s => s.id === writeSpotId); return s ? `${s.name} (${s.region})` : '스팟 선택'; })()
                      : '어디서 서핑했나요? (선택사항)'}
                  </button>

                  {/* 드롭다운 목록 */}
                  {spotDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-30 max-h-52 overflow-y-auto">
                      {/* 검색 입력 */}
                      <div className="sticky top-0 bg-card p-2 border-b border-border">
                        <input
                          type="text"
                          value={spotSearch}
                          onChange={e => setSpotSearch(e.target.value)}
                          placeholder="스팟 이름 검색..."
                          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm
                                     focus:outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      </div>
                      {/* "선택 안 함" 옵션 */}
                      <button
                        onClick={() => { setWriteSpotId(''); setSpotDropdownOpen(false); setSpotSearch(''); }}
                        className="w-full px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary/80"
                      >
                        스팟 선택 안 함
                      </button>
                      {/* 스팟 목록 — 검색어로 필터링 */}
                      {spots
                        .filter(s => {
                          /** 지역 필터 적용 — 국내 탭이면 한국 스팟만, 발리 탭이면 발리만 */
                          if (regionFilter === '국내' && s.region.startsWith('Bali')) return false;
                          if (regionFilter === '발리' && !s.region.startsWith('Bali')) return false;
                          /** 검색어 필터 */
                          if (!spotSearch) return true;
                          const q = spotSearch.toLowerCase();
                          return s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q);
                        })
                        .map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setWriteSpotId(s.id); setSpotDropdownOpen(false); setSpotSearch(''); }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/80 flex items-center gap-2
                              ${writeSpotId === s.id ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            <MapPin className={`w-3 h-3 shrink-0 ${writeSpotId === s.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                            <span>{s.name}</span>
                            <span className="text-muted-foreground text-xs ml-auto">{s.region}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 내용 */}
              <textarea
                value={writeContent}
                onChange={e => setWriteContent(e.target.value)}
                placeholder="오늘 파도는 어떤가요? 현장 소식을 공유해주세요!"
                rows={4}
                maxLength={5000}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40"
              />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">{writeContent.length}/5000</p>

              {/* 이미지 */}
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {writeImages.map((img, idx) => (
                  <div key={idx} className="relative shrink-0">
                    <img src={img.localUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(img.localUrl);
                        setWriteImages(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {writeImages.length < 5 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer shrink-0 hover:border-primary/50">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
              </div>

              {/* 작성 버튼 */}
              <button
                onClick={submitPost}
                disabled={!writeContent.trim() || writeSending}
                className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold
                           disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {writeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {writeSending ? '게시 중...' : '게시하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 글 상세 + 댓글 모달 ===== */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPost(null)} />
          <div className="relative w-full max-w-md bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-5">
              {/* 작성자 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {selectedPost.author.nickname?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">{selectedPost.author.nickname}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">{timeAgo(selectedPost.createdAt)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedPost(null)} className="p-1 hover:bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 스팟 */}
              {selectedPost.spot && (
                <div className="flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{selectedPost.spot.name}</span>
                  <span className="text-[10px] text-muted-foreground">{selectedPost.spot.region}</span>
                </div>
              )}

              {/* 내용 */}
              <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">{selectedPost.content}</p>

              {/* 이미지 */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {selectedPost.images.sort((a, b) => a.sortOrder - b.sortOrder).map(img => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt=""
                      className="w-28 h-28 rounded-xl object-cover border border-border shrink-0 cursor-pointer"
                      onClick={() => window.open(img.imageUrl, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* 좋아요 */}
              <div className="flex items-center gap-4 pb-3 border-b border-border">
                <button
                  onClick={() => toggleLike(selectedPost.id)}
                  className="flex items-center gap-1 text-sm"
                >
                  <Heart className={`w-4 h-4 ${selectedPost.isLiked ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                  <span className={selectedPost.isLiked ? 'text-accent' : 'text-muted-foreground'}>
                    {selectedPost.likeCount}
                  </span>
                </button>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  {selectedPost.commentCount}
                </span>
              </div>

              {/* 댓글 목록 */}
              <div className="mt-3 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground">댓글</h3>

                {commentsLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                  </div>
                )}

                {!commentsLoading && comments.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">아직 댓글이 없어요</p>
                )}

                {comments.map(comment => (
                  <div key={comment.id} className="space-y-2">
                    {/* 댓글 */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold">{comment.author.nickname?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{comment.author.nickname}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                    {/* 대댓글 */}
                    {comment.replies?.map(reply => (
                      <div key={reply.id} className="flex gap-2 ml-8">
                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[8px] font-bold">{reply.author.nickname?.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold">{reply.author.nickname}</span>
                            <span className="text-[9px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-foreground/80 mt-0.5">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* 댓글 입력 */}
              <div className="mt-4 flex gap-2">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  maxLength={2000}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  className="flex-1 px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || commentSending}
                  className="px-3 py-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"
                >
                  {commentSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
