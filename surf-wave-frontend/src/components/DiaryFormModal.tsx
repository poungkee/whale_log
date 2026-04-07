/**
 * @file DiaryFormModal.tsx
 * @description 서핑 다이어리 작성/수정 모달 - 풍성한 UI
 *
 * 입력 항목:
 * 1. 서핑 날짜 (date picker) - 기본값: 오늘
 * 2. 스팟 선택 (검색 드롭다운) - GET /api/v1/spots에서 목록
 * 3. 보드 타입 (이모지 카드 선택) - LONGBOARD / MIDLENGTH / SHORTBOARD
 * 4. 서핑 시간 (프리셋 + 직접 입력)
 * 5. 만족도 (이모지 선택) - 1~5
 * 6. 메모 (textarea) - 선택사항
 *
 * API:
 * - 신규 작성: POST /api/v1/diary
 * - 수정: PATCH /api/v1/diary/:id
 */

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Search, Calendar, Clock, Eye, EyeOff, Sunrise, ImagePlus, Trash2 } from 'lucide-react';
import type { BoardType } from '../types';

/**
 * 다이어리 보드 타입 — 백엔드 BoardType enum과 1:1 대응
 * 사용자 프로필의 UserBoardType(LONGBOARD/MIDLENGTH/SHORTBOARD/UNSET)과 별개
 * 다이어리에서는 8종류 보드를 선택할 수 있음
 */
type DiaryBoardType = 'SHORTBOARD' | 'LONGBOARD' | 'FUNBOARD' | 'FISH' | 'SUP' | 'BODYBOARD' | 'FOIL' | 'OTHER';

/** 스팟 선택 목록용 간략 타입 */
interface SpotOption {
  id: string;
  name: string;
  region: string;
}

/** 다이어리 항목 전체 타입 (API 응답 기반) */
export interface DiaryFullEntry {
  id: string;
  surfDate: string;
  /** 서핑 시작 시간 (HH:mm, 예: "10:00") - null이면 미입력 */
  surfTime: string | null;
  boardType: BoardType;
  /** 보드 길이 (피트, 소수점 1자리) — null이면 미입력 */
  boardSizeFt: number | null;
  durationMinutes: number;
  satisfaction: number;
  memo: string | null;
  /** 공개 설정 - PRIVATE(나만 보기) / PUBLIC(전체 공개) */
  visibility: 'PRIVATE' | 'PUBLIC';
  /** 자동 매칭된 파고 (m) - surfTime 기반 forecast 조회 결과 */
  waveHeight: string | null;
  /** 자동 매칭된 파도 주기 (초) */
  wavePeriod: string | null;
  /** 자동 매칭된 풍속 (km/h) */
  windSpeed: string | null;
  spot: SpotOption | null;
  images: { id: string; imageUrl: string; sortOrder: number }[];
}

interface DiaryFormModalProps {
  /** 수정 모드일 때 기존 다이어리 데이터 (null이면 신규 작성) */
  editEntry: DiaryFullEntry | null;
  /** 사용자 기본 보드 타입 (신규 작성 시 기본값) */
  defaultBoardType?: BoardType;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 저장 완료 핸들러 - 목록 새로고침용 */
  onSaved: () => void;
}

/**
 * 보드 타입별 설정 (이모지 + 라벨 + 색상 + 설명)
 * 백엔드 BoardType enum 8종류와 1:1 대응
 */
const BOARD_CONFIG: { type: BoardType; emoji: string; label: string; color: string; desc: string }[] = [
  { type: 'LONGBOARD', emoji: '🏄', label: '롱보드', color: '#32CD32', desc: '9ft+ 안정적' },
  { type: 'FUNBOARD', emoji: '🛹', label: '펀보드', color: '#008CBA', desc: '7~8ft 올라운드' },
  { type: 'MIDLENGTH', emoji: '🏄‍♂️', label: '미드렝스', color: '#6366F1', desc: '6.6~8ft 범용' },
  { type: 'FISH', emoji: '🐟', label: '피쉬', color: '#EC4899', desc: '5.2~6.2ft 작은파도' },
  { type: 'SHORTBOARD', emoji: '🏄‍♀️', label: '숏보드', color: '#FF8C00', desc: '~6.4ft 기동성' },
  { type: 'SUP', emoji: '🚣', label: 'SUP', color: '#14B8A6', desc: '패들보드' },
  { type: 'BODYBOARD', emoji: '🤸', label: '바디보드', color: '#8B5CF6', desc: '엎드려 타기' },
  { type: 'FOIL', emoji: '🪁', label: '포일', color: '#0EA5E9', desc: '수중익 보드' },
];

/** 만족도별 설정 (이모지 + 라벨 + 색상) */
const SATISFACTION_OPTIONS = [
  { value: 1, emoji: '😞', label: '별로', color: '#ef4444' },
  { value: 2, emoji: '😕', label: '아쉬움', color: '#f97316' },
  { value: 3, emoji: '😊', label: '보통', color: '#eab308' },
  { value: 4, emoji: '😄', label: '좋음', color: '#22c55e' },
  { value: 5, emoji: '🤩', label: '최고!', color: '#3b82f6' },
];

/** 시간 프리셋 (분 단위) - 이모지 + 라벨 */
const DURATION_PRESETS = [
  { minutes: 30, label: '30분', emoji: '⚡' },
  { minutes: 60, label: '1시간', emoji: '🌊' },
  { minutes: 90, label: '1.5시간', emoji: '🔥' },
  { minutes: 120, label: '2시간', emoji: '💪' },
];

/**
 * 서핑 시작 시간 프리셋
 * - 서퍼들이 주로 서핑하는 시간대: 새벽/아침/오전/점심/오후
 * - 이 시간으로 forecast DB에서 정확한 파도 데이터를 자동 매칭
 */
const SURF_TIME_PRESETS = [
  { time: '06:00', label: '새벽 6시', emoji: '🌅' },
  { time: '08:00', label: '아침 8시', emoji: '🌤️' },
  { time: '10:00', label: '오전 10시', emoji: '☀️' },
  { time: '12:00', label: '점심 12시', emoji: '🌞' },
  { time: '14:00', label: '오후 2시', emoji: '⛅' },
  { time: '16:00', label: '오후 4시', emoji: '🌇' },
];

export function DiaryFormModal({ editEntry, defaultBoardType, onClose, onSaved }: DiaryFormModalProps) {
  /** 오늘 날짜 (YYYY-MM-DD) */
  const today = new Date().toISOString().slice(0, 10);

  /* ===== 폼 상태 ===== */
  /** 서핑 날짜 */
  const [surfDate, setSurfDate] = useState(editEntry?.surfDate || today);
  /**
   * 서핑 시작 시간 (HH:mm 형식)
   * - forecast 자동 매칭에 사용: surfDate + surfTime → 해당 시점 파도 데이터 조회
   * - 빈 문자열이면 미입력 (forecast 매칭 안 함)
   */
  const [surfTime, setSurfTime] = useState(editEntry?.surfTime || '');
  /** 선택한 스팟 ID */
  const [spotId, setSpotId] = useState(editEntry?.spot?.id || '');
  /** 보드 타입 */
  const [boardType, setBoardType] = useState<BoardType>(
    editEntry?.boardType || (defaultBoardType && defaultBoardType !== 'UNSET' ? defaultBoardType : 'LONGBOARD')
  );
  /** 보드 길이 (피트) — 빈 문자열이면 미입력, 숫자면 소수점 1자리 */
  const [boardSizeFt, setBoardSizeFt] = useState(editEntry?.boardSizeFt?.toString() || '');
  /** 서핑 시간 (분) */
  const [durationMinutes, setDurationMinutes] = useState(editEntry?.durationMinutes || 60);
  /** 만족도 (1~5) */
  const [satisfaction, setSatisfaction] = useState(editEntry?.satisfaction || 3);
  /** 메모 */
  const [memo, setMemo] = useState(editEntry?.memo || '');
  /** 공개/비공개 설정 (PRIVATE=나만 보기, PUBLIC=전체 공개) */
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>(
    editEntry?.visibility || 'PRIVATE'
  );

  /**
   * 이미지 상태 — 미리보기용 로컬 URL + 업로드 완료 후 서버 URL
   * - localUrl: URL.createObjectURL()로 생성한 미리보기용 (브라우저 메모리)
   * - serverUrl: POST /upload/images 응답으로 받은 서버 저장 URL (null이면 아직 업로드 안 됨)
   * - file: 업로드할 원본 File 객체
   */
  interface ImageItem {
    localUrl: string;
    serverUrl: string | null;
    file: File;
  }
  const [images, setImages] = useState<ImageItem[]>(() => {
    /** 수정 모드일 때 기존 이미지를 미리보기에 표시 */
    if (editEntry?.images?.length) {
      return editEntry.images.map(img => ({
        localUrl: img.imageUrl,
        serverUrl: img.imageUrl,
        file: null as unknown as File, // 기존 이미지는 File 객체 없음
      }));
    }
    return [];
  });
  /** 이미지 업로드 진행 중 여부 */
  const [uploading, setUploading] = useState(false);

  /* ===== UI 상태 ===== */
  /** 스팟 목록 (API에서 가져옴) */
  const [spots, setSpots] = useState<SpotOption[]>([]);
  /** 스팟 검색어 (드롭다운 필터용) */
  const [spotSearch, setSpotSearch] = useState('');
  /** 스팟 드롭다운 열림 상태 */
  const [spotDropdownOpen, setSpotDropdownOpen] = useState(false);
  /** 저장 중 로딩 상태 */
  const [saving, setSaving] = useState(false);
  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  /**
   * 스팟 목록 가져오기
   * GET /api/v1/spots → 전체 스팟 목록 (이름, 지역)
   */
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        /** limit=150으로 전체 스팟 조회 (124개 스팟 전부 커버) */
        const res = await fetch('/api/v1/spots?limit=150');
        if (!res.ok) return;
        const data = await res.json();
        /** 배열 형태로 오든 data 프로퍼티로 오든 처리 */
        const list: SpotOption[] = (Array.isArray(data) ? data : data.data || []).map(
          (s: { id: string; name: string; region: string }) => ({
            id: s.id,
            name: s.name,
            region: s.region,
          })
        );
        setSpots(list);
      } catch {
        console.warn('스팟 목록 조회 실패');
      }
    };
    fetchSpots();
  }, []);

  /** 스팟 검색 필터링 - 이름 또는 지역으로 검색 */
  const filteredSpots = spots.filter(s => {
    if (!spotSearch) return true;
    const q = spotSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q);
  });

  /** 현재 선택된 스팟 정보 */
  const selectedSpot = spots.find(s => s.id === spotId);

  /**
   * 사진/영상 선택 핸들러
   * - input[type=file]에서 선택한 파일을 미리보기 목록에 추가
   * - 최대 5장 제한 (백엔드 FilesInterceptor max 5)
   * - 허용: image/jpeg, image/png, image/webp (백엔드 MIME 체크와 동일)
   */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    /** 최대 5장 초과 체크 */
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      setError('사진은 최대 5장까지 첨부할 수 있어요');
      return;
    }
    const toAdd = files.slice(0, remaining);

    /** 파일 → 미리보기 아이템 변환 */
    const newItems: ImageItem[] = toAdd.map(file => ({
      localUrl: URL.createObjectURL(file),
      serverUrl: null, // 아직 업로드 안 됨
      file,
    }));
    setImages(prev => [...prev, ...newItems]);

    /** input value 초기화 — 같은 파일 재선택 가능하도록 */
    e.target.value = '';
  };

  /**
   * 미리보기 이미지 삭제
   * - localUrl이 blob URL이면 메모리 해제 (URL.revokeObjectURL)
   */
  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index];
      /** blob URL 메모리 해제 */
      if (removed.localUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.localUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  /**
   * 이미지를 서버에 업로드
   * POST /api/v1/upload/images (FormData, 최대 5개)
   *
   * @returns 업로드된 이미지 URL 배열 (이미 업로드된 건 기존 serverUrl 사용)
   */
  const uploadImages = async (token: string): Promise<string[]> => {
    /** 업로드할 새 이미지와 이미 업로드된 이미지 분리 */
    const needUpload = images.filter(img => !img.serverUrl);
    const alreadyUploaded = images.filter(img => img.serverUrl).map(img => img.serverUrl!);

    if (needUpload.length === 0) return alreadyUploaded;

    setUploading(true);
    try {
      const formData = new FormData();
      /** 백엔드 FilesInterceptor 필드명: 'files' */
      needUpload.forEach(img => formData.append('files', img.file));

      const res = await fetch('/api/v1/upload/images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '사진 업로드에 실패했어요');
      }

      const data = await res.json();
      /** 백엔드 응답: { urls: string[] } */
      const uploadedUrls: string[] = data.urls || [];
      return [...alreadyUploaded, ...uploadedUrls];
    } finally {
      setUploading(false);
    }
  };

  /**
   * 폼 제출 - 다이어리 생성 또는 수정
   * POST /api/v1/diary (신규) 또는 PATCH /api/v1/diary/:id (수정)
   */
  const handleSubmit = async () => {
    /** 필수값 검증 */
    if (!spotId) {
      setError('스팟을 선택해주세요');
      return;
    }
    if (durationMinutes < 1) {
      setError('서핑 시간을 입력해주세요');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('로그인이 필요합니다');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      /**
       * 1단계: 새 이미지가 있으면 먼저 서버에 업로드
       * POST /api/v1/upload/images → URL 배열 반환
       */
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(token);
      }

      const isEdit = !!editEntry;
      const url = isEdit ? `/api/v1/diary/${editEntry.id}` : '/api/v1/diary';
      const method = isEdit ? 'PATCH' : 'POST';

      /**
       * 2단계: 다이어리 생성/수정 요청
       * - imageUrls: 업로드된 이미지 URL 배열 포함
       * - 수정 시 spotId/surfDate/surfTime은 변경 불가 (백엔드 DTO 제한)
       * - visibility는 수정 가능
       */
      /** boardSizeFt: 빈 문자열이면 undefined (미입력), 숫자면 float 변환 */
      const parsedFt = boardSizeFt.trim() ? parseFloat(boardSizeFt) : undefined;
      const body: Record<string, unknown> = {
        boardType,
        boardSizeFt: parsedFt && !isNaN(parsedFt) ? parsedFt : undefined,
        durationMinutes,
        satisfaction,
        memo: memo.trim() || undefined,
        visibility,
        /** 이미지 URL 배열 — 빈 배열이면 이미지 없음 (수정 시 기존 이미지 삭제됨) */
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      /** 신규 작성 시에만 spotId, surfDate, surfTime 포함 */
      if (!isEdit) {
        body.spotId = spotId;
        body.surfDate = surfDate;
        /** surfTime이 있으면 전송 → 백엔드에서 forecast 자동 매칭 */
        if (surfTime) {
          body.surfTime = surfTime;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '저장에 실패했습니다');
      }

      /** 저장 성공 → 부모 컴포넌트에 알림 후 모달 닫기 */
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 반투명 배경 오버레이 - 클릭 시 닫기 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 본체 - 하단에서 슬라이드업 */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        {/* 드래그 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* 헤더 - 그라데이션 배경 + 제목 + 닫기 버튼 */}
        <div className="sticky top-0 bg-card z-10 px-5 pb-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{editEntry ? '✏️' : '🏄'}</span>
              <h2 className="text-lg font-bold">
                {editEntry ? '기록 수정' : '서핑 기록하기'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* ===== 1. 서핑 날짜 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              서핑 날짜
            </label>
            <input
              type="date"
              value={surfDate}
              max={today}
              onChange={(e) => setSurfDate(e.target.value)}
              disabled={!!editEntry}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            {editEntry && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">수정 시 날짜는 변경할 수 없어요</p>
            )}
          </div>

          {/* ===== 1.5. 서핑 시작 시간 - forecast 자동 매칭용 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Sunrise className="w-3.5 h-3.5 text-primary" />
              서핑 시작 시간
              <span className="text-xs text-muted-foreground font-normal">(선택 - 파도 데이터 자동 연결)</span>
            </label>
            {/* 시간 프리셋 버튼 - 서퍼들이 자주 타는 시간대 */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {SURF_TIME_PRESETS.map(t => (
                <button
                  key={t.time}
                  type="button"
                  onClick={() => setSurfTime(surfTime === t.time ? '' : t.time)}
                  disabled={!!editEntry}
                  className={`py-2 rounded-xl text-center border transition-all
                    ${surfTime === t.time
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/30'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-base block">{t.emoji}</span>
                  <span className={`text-[10px] font-medium ${surfTime === t.time ? 'text-primary' : ''}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            {/* 직접 시간 입력 (HH:mm) */}
            <input
              type="time"
              value={surfTime}
              onChange={(e) => setSurfTime(e.target.value)}
              disabled={!!editEntry}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-center font-medium
                         focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {editEntry && surfTime && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">수정 시 시작 시간은 변경할 수 없어요</p>
            )}
            {!editEntry && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                입력하면 그 시간의 실제 파도·바람 데이터가 자동으로 기록돼요
              </p>
            )}
          </div>

          {/* ===== 2. 스팟 선택 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              서핑 스팟
            </label>
            {editEntry ? (
              /* 수정 모드에서는 스팟 변경 불가 - 텍스트로만 표시 */
              <div className="px-4 py-3 bg-secondary border border-border rounded-xl text-sm opacity-50 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {editEntry.spot?.name || '알 수 없는 스팟'}
                <span className="text-muted-foreground">({editEntry.spot?.region || ''})</span>
              </div>
            ) : (
              /* 신규 작성 - 검색 가능한 드롭다운 */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSpotDropdownOpen(!spotDropdownOpen)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left transition-all flex items-center gap-2
                    ${spotDropdownOpen
                      ? 'bg-card border-primary/50 ring-2 ring-primary/20'
                      : 'bg-secondary border-border hover:border-primary/30'
                    }
                    ${!selectedSpot ? 'text-muted-foreground' : ''}`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  {selectedSpot
                    ? <span className="text-foreground">{selectedSpot.name} <span className="text-muted-foreground">({selectedSpot.region})</span></span>
                    : '어디서 서핑했나요?'}
                </button>

                {/* 드롭다운 목록 */}
                {spotDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl z-20 max-h-52 overflow-y-auto">
                    {/* 검색 입력 */}
                    <div className="sticky top-0 bg-card p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={spotSearch}
                          onChange={(e) => setSpotSearch(e.target.value)}
                          placeholder="스팟 이름 또는 지역 검색..."
                          className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm
                                     focus:outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      </div>
                    </div>
                    {/* 스팟 옵션 목록 */}
                    {filteredSpots.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSpotId(s.id);
                          setSpotDropdownOpen(false);
                          setSpotSearch('');
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/80 transition-colors
                                    flex items-center gap-2
                          ${spotId === s.id ? 'bg-primary/10' : ''}`}
                      >
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${spotId === s.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className={spotId === s.id ? 'text-primary font-semibold' : ''}>
                          {s.name}
                        </span>
                        <span className="text-muted-foreground text-xs ml-auto">{s.region}</span>
                      </button>
                    ))}
                    {filteredSpots.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        검색 결과가 없어요
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== 3. 보드 타입 - 이모지 카드 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              🏄 보드 타입
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BOARD_CONFIG.map(b => (
                <button
                  key={b.type}
                  onClick={() => setBoardType(b.type)}
                  className={`py-2.5 px-1 rounded-xl text-center border-2 transition-all
                    ${boardType === b.type
                      ? 'scale-[1.02] shadow-md'
                      : 'border-border hover:border-primary/30 opacity-60 hover:opacity-100'
                    }`}
                  style={boardType === b.type ? {
                    borderColor: b.color,
                    backgroundColor: `${b.color}10`,
                  } : {}}
                >
                  <span className="text-lg block mb-0.5">{b.emoji}</span>
                  <span className="text-[10px] font-bold block" style={boardType === b.type ? { color: b.color } : {}}>
                    {b.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground block mt-0.5">{b.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 3.5. 보드 길이 (피트) — 선택사항 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              📏 보드 길이
              <span className="text-xs text-muted-foreground font-normal">(선택, 피트)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={boardSizeFt}
                onChange={(e) => setBoardSizeFt(e.target.value)}
                placeholder="예: 6.2"
                min={3.0}
                max={12.0}
                step={0.1}
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-center font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
                           placeholder:text-muted-foreground/40"
              />
              <span className="text-sm text-muted-foreground font-medium">ft</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 ml-1">
              모르면 비워두세요 (3.0 ~ 12.0 피트)
            </p>
          </div>

          {/* ===== 4. 서핑 시간 (분) ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              서핑 시간
            </label>
            {/* 프리셋 버튼 - 이모지 포함 */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d.minutes}
                  onClick={() => setDurationMinutes(d.minutes)}
                  className={`py-2 rounded-xl text-center border transition-all
                    ${durationMinutes === d.minutes
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/30'
                    }`}
                >
                  <span className="text-base block">{d.emoji}</span>
                  <span className={`text-[11px] font-medium ${durationMinutes === d.minutes ? 'text-primary' : ''}`}>
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
            {/* 직접 입력 */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                min={1}
                max={600}
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-center font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">분</span>
            </div>
          </div>

          {/* ===== 5. 만족도 (이모지 선택) ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              ⭐ 만족도
            </label>
            <div className="flex gap-1.5 justify-between">
              {SATISFACTION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSatisfaction(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-center border-2 transition-all
                    ${satisfaction === opt.value
                      ? 'scale-105 shadow-md'
                      : 'border-border opacity-50 hover:opacity-80'
                    }`}
                  style={satisfaction === opt.value ? {
                    borderColor: opt.color,
                    backgroundColor: `${opt.color}15`,
                  } : {}}
                >
                  <span className={`text-2xl block ${satisfaction === opt.value ? '' : 'grayscale'}`}>
                    {opt.emoji}
                  </span>
                  <span
                    className="text-[10px] font-bold block mt-0.5"
                    style={satisfaction === opt.value ? { color: opt.color } : {}}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 6. 사진 첨부 (최대 5장) ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              📷 사진
              <span className="text-xs text-muted-foreground font-normal">(선택, 최대 5장)</span>
            </label>

            {/* 이미지 미리보기 그리드 + 추가 버튼 */}
            <div className="grid grid-cols-4 gap-2">
              {/* 기존/선택된 이미지 미리보기 */}
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img
                    src={img.localUrl}
                    alt={`사진 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* 삭제 버튼 — 우상단 */}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                  {/* 업로드 대기 표시 — serverUrl 없으면 아직 업로드 안 됨 */}
                  {!img.serverUrl && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[9px] text-white text-center py-0.5">
                      저장 시 업로드
                    </div>
                  )}
                </div>
              ))}

              {/* 사진 추가 버튼 — 5장 미만일 때만 표시 */}
              {images.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50
                                  flex flex-col items-center justify-center gap-1 cursor-pointer
                                  hover:bg-secondary/50 transition-all">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{images.length}/5</span>
                  {/* 숨겨진 file input — 클릭 시 갤러리/카메라 선택 */}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 업로드 진행 중 표시 */}
            {uploading && (
              <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                사진 업로드 중...
              </div>
            )}
          </div>

          {/* ===== 7. 메모 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              📝 메모
              <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘 서핑은 어땠나요?&#10;파도 컨디션, 기분, 배운 점 등을 자유롭게 적어보세요..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         placeholder:text-muted-foreground/40 transition-all leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-0.5 mr-1">
              {memo.length}/500
            </p>
          </div>

          {/* ===== 7. 공개/비공개 토글 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              {visibility === 'PUBLIC' ? (
                <Eye className="w-3.5 h-3.5 text-primary" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              공개 설정
            </label>
            {/* 공개/비공개 토글 버튼 - 인향이 요청: 일기별로 선택 가능 */}
            <div className="flex gap-2">
              {/* 나만 보기 (PRIVATE) */}
              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`flex-1 py-3 rounded-xl text-center border-2 transition-all flex items-center justify-center gap-2
                  ${visibility === 'PRIVATE'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'border-border opacity-60 hover:opacity-80'
                  }`}
              >
                <EyeOff className={`w-4 h-4 ${visibility === 'PRIVATE' ? 'text-blue-500' : ''}`} />
                <div>
                  <span className={`text-sm font-bold block ${visibility === 'PRIVATE' ? 'text-blue-500' : ''}`}>
                    나만 보기
                  </span>
                  <span className="text-[9px] text-muted-foreground">비공개</span>
                </div>
              </button>
              {/* 전체 공개 (PUBLIC) */}
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`flex-1 py-3 rounded-xl text-center border-2 transition-all flex items-center justify-center gap-2
                  ${visibility === 'PUBLIC'
                    ? 'border-green-500 bg-green-500/10 shadow-sm'
                    : 'border-border opacity-60 hover:opacity-80'
                  }`}
              >
                <Eye className={`w-4 h-4 ${visibility === 'PUBLIC' ? 'text-green-500' : ''}`} />
                <div>
                  <span className={`text-sm font-bold block ${visibility === 'PUBLIC' ? 'text-green-500' : ''}`}>
                    전체 공개
                  </span>
                  <span className="text-[9px] text-muted-foreground">다른 서퍼에게 공유</span>
                </div>
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 저장 버튼 - 그라데이션 */}
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white
                       rounded-2xl font-bold text-base shadow-lg shadow-primary/25
                       hover:shadow-primary/40 hover:scale-[1.01]
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {saving ? '저장 중...' : (editEntry ? '✏️ 수정하기' : '🏄 기록하기')}
          </button>

          {/* 하단 여백 (safe area 대응) */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
