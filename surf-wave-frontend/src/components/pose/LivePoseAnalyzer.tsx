/**
 * @file LivePoseAnalyzer.tsx
 * @description 실시간 포즈 감지 컴포넌트 - 웹캠 + MediaPipe Pose Landmarker + Canvas 스켈레톤
 *
 * 동작 흐름:
 * 1. 웹캠 스트림 시작 (navigator.mediaDevices.getUserMedia)
 * 2. MediaPipe PoseLandmarker WASM 모델 로드
 * 3. requestAnimationFrame 루프:
 *    - 매 프레임 비디오 → PoseLandmarker.detectForVideo()
 *    - 33개 관절 좌표 추출 (NormalizedLandmark[])
 *    - Canvas에 카메라 영상 배경 + 스켈레톤 오버레이
 * 4. 관절 색상 구분:
 *    - 상체 (어깨~손끝): 파란색 (#3B82F6)
 *    - 코어 (가슴~골반): 초록색 (#22C55E)
 *    - 하체 (골반~발끝): 빨간색 (#EF4444)
 *    - 머리: 노란색 (#FACC15)
 *
 * MediaPipe 관절 번호 맵:
 *   0: 코(머리), 11/12: 어깨, 13/14: 팔꿈치, 15/16: 손목
 *   23/24: 골반, 25/26: 무릎, 27/28: 발목
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

/** 카메라 방향 — 전면(셀카) / 후면 */
type CameraFacing = 'user' | 'environment';

/** 컴포넌트 Props */
interface LivePoseAnalyzerProps {
  /** 카메라 활성 상태 — true면 웹캠+분석 시작, false면 정지 */
  isActive: boolean;
  /** 현재 카메라 방향 — 'user'(전면) | 'environment'(후면) */
  facing: CameraFacing;
  /** Canvas ref 노출 — 부모에서 스냅샷 캡처 시 사용 */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** 감지된 관절 좌표를 부모에게 전달 (피드백 계산용) */
  onLandmarksDetected?: (landmarks: NormalizedLandmark[]) => void;
}

/**
 * 스켈레톤 연결선 정의 — [시작 관절, 끝 관절, 색상 카테고리]
 * 카테고리: 'head' | 'upper' | 'core' | 'lower'
 */
type BodyPart = 'head' | 'upper' | 'core' | 'lower';
const SKELETON_CONNECTIONS: [number, number, BodyPart][] = [
  /** 머리 → 어깨 연결 */
  [0, 11, 'head'], [0, 12, 'head'],
  /** 어깨 가로 라인 */
  [11, 12, 'upper'],
  /** 왼팔: 어깨(11) → 팔꿈치(13) → 손목(15) */
  [11, 13, 'upper'], [13, 15, 'upper'],
  /** 오른팔: 어깨(12) → 팔꿈치(14) → 손목(16) */
  [12, 14, 'upper'], [14, 16, 'upper'],
  /** 몸통: 어깨 → 골반 (좌/우) */
  [11, 23, 'core'], [12, 24, 'core'],
  /** 골반 가로 라인 */
  [23, 24, 'core'],
  /** 왼다리: 골반(23) → 무릎(25) → 발목(27) */
  [23, 25, 'lower'], [25, 27, 'lower'],
  /** 오른다리: 골반(24) → 무릎(26) → 발목(28) */
  [24, 26, 'lower'], [26, 28, 'lower'],
];

/** 신체 부위별 색상 맵 */
const PART_COLORS: Record<BodyPart, string> = {
  head: '#FACC15',   // 노란색 — 머리
  upper: '#3B82F6',  // 파란색 — 상체 (어깨~손끝)
  core: '#22C55E',   // 초록색 — 코어 (몸통~골반)
  lower: '#EF4444',  // 빨간색 — 하체 (골반~발끝)
};

/** 관절 점(●)에 사용할 색상 — 관절 번호 → 부위 매핑 */
function getJointColor(idx: number): string {
  if (idx === 0) return PART_COLORS.head;                              // 코(머리)
  if ([11, 12, 13, 14, 15, 16].includes(idx)) return PART_COLORS.upper; // 상체
  if ([23, 24].includes(idx)) return PART_COLORS.core;                 // 골반
  if ([25, 26, 27, 28].includes(idx)) return PART_COLORS.lower;       // 하체
  return '#94A3B8'; // 기타 관절 (귀, 눈 등) — 회색
}

/** 그려야 할 주요 관절 인덱스 목록 (얼굴 세부 관절은 제외) */
const DRAW_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export function LivePoseAnalyzer({ isActive, facing, canvasRef: externalCanvasRef, onLandmarksDetected }: LivePoseAnalyzerProps) {
  /** 비디오 엘리먼트 ref — 웹캠 스트림 연결 */
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Canvas ref — 스켈레톤 오버레이 렌더링. 외부 ref가 있으면 그걸 사용 (스냅샷 캡처용) */
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
  /** MediaPipe PoseLandmarker 인스턴스 */
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  /** requestAnimationFrame ID — 정리용 */
  const rafIdRef = useRef<number>(0);
  /** 웹캠 스트림 ref — 정지 시 트랙 해제용 */
  const streamRef = useRef<MediaStream | null>(null);

  /** 모델 로딩 상태 */
  const [modelLoading, setModelLoading] = useState(false);
  /** 카메라 에러 메시지 */
  const [error, setError] = useState<string | null>(null);
  /** 감지된 관절 수 (UI 표시용) */
  const [detectedCount, setDetectedCount] = useState(0);

  /**
   * MediaPipe PoseLandmarker 모델 초기화
   *
   * 로딩 전략 (CSP 호환):
   * - WASM 파일셋: public/mediapipe/ 에서 로컬 서빙 (CDN 의존 완전 제거)
   * - 모델 파일(.task): public/mediapipe/ 에서 로컬 서빙
   * - 외부 네트워크 요청 0건 → CSP script-src 'self'만으로 충분
   *
   * GPU/CPU 폴백:
   * - GPU(WebGL) 우선 시도 → 실패 시 CPU로 자동 전환
   * - 일부 브라우저(Firefox, 구형 모바일)에서 WebGL delegate 오류 가능
   */
  const initModel = useCallback(async () => {
    if (poseLandmarkerRef.current) return; // 이미 로드됨
    setModelLoading(true);
    try {
      /**
       * WASM 파일셋 로드 — public/mediapipe/ 디렉토리에서 로컬 서빙
       *
       * Vite 규칙: public/ 폴더 내 파일은 루트(/)로 접근 가능
       * 예: public/mediapipe/vision_wasm_internal.js → /mediapipe/vision_wasm_internal.js
       *
       * FilesetResolver는 basePath + '/vision_wasm_internal.js' 형태로 로드하므로
       * 반드시 슬래시 없이 끝나는 경로 사용: '/mediapipe' (X) → 아래 형태 사용
       */
      const wasmBasePath = `${window.location.origin}/mediapipe`;
      const vision = await FilesetResolver.forVisionTasks(wasmBasePath);

      /**
       * GPU 가속 시도 → 실패 시 CPU 폴백
       * - GPU: WebGL 기반, 대부분의 데스크톱/최신 모바일에서 동작
       * - CPU: 모든 환경에서 동작하지만 느림 (10~15fps 정도)
       */
      let poseLandmarker: PoseLandmarker | null = null;
      for (const delegate of ['GPU', 'CPU'] as const) {
        try {
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              /** 모델 파일도 로컬에서 로드 — CDN 의존 완전 제거 */
              modelAssetPath: '/mediapipe/pose_landmarker_lite.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1, // 한 명만 감지 (성능 최적화)
          });
          console.log(`[PoseAnalyzer] 초기화 성공 — delegate: ${delegate}`);
          break; // 성공하면 루프 종료
        } catch (delegateErr) {
          console.warn(`[PoseAnalyzer] ${delegate} delegate 실패, 다음 시도...`, delegateErr);
        }
      }

      if (!poseLandmarker) throw new Error('GPU/CPU 모두 초기화 실패');
      poseLandmarkerRef.current = poseLandmarker;
    } catch (e) {
      console.error('[PoseAnalyzer] 모델 로드 실패:', e);
      setError('포즈 인식 모델을 불러오지 못했어요. 브라우저를 새로고침해주세요.');
    } finally {
      setModelLoading(false);
    }
  }, []);

  /**
   * 웹캠 시작 — getUserMedia로 카메라 스트림 획득
   *
   * 주의사항:
   * - 모바일 브라우저는 HTTPS 필수 (HTTP에서는 getUserMedia 차단됨)
   * - localhost만 HTTP에서 카메라 허용
   * - 외부 IP(192.168.x.x)로 접속 시 반드시 HTTPS 필요 (ngrok 등)
   * - 모바일: 전면 카메라 기본 (facingMode: 'user')
   */
  const startCamera = useCallback(async () => {
    try {
      /**
       * HTTPS 체크 — 모바일에서 HTTP 접속 시 카메라 차단되므로 미리 안내
       * localhost와 127.0.0.1은 HTTP에서도 카메라 허용 (브라우저 예외)
       */
      const isSecure = window.location.protocol === 'https:'
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        setError('카메라를 사용하려면 HTTPS 연결이 필요해요. ngrok 등으로 HTTPS 터널을 사용하거나 localhost에서 접속해주세요.');
        return;
      }

      /** getUserMedia 지원 여부 체크 — 구형 브라우저 대응 */
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('이 브라우저는 카메라를 지원하지 않아요. Chrome 또는 Safari를 사용해주세요.');
        return;
      }

      /**
       * facingMode로 전면/후면 카메라 선택
       * - 'user': 전면(셀카) — 혼자 연습할 때
       * - 'environment': 후면 — 친구를 촬영할 때
       * - PC 웹캠은 facingMode 무시됨 (카메라 1개이므로)
       */
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: unknown) {
      console.error('[PoseAnalyzer] 카메라 접근 실패:', e);
      /**
       * getUserMedia 에러별 한국어 메시지 분기
       * - NotAllowedError: 사용자가 카메라 권한 거부
       * - NotFoundError: 카메라 장치 없음 (데스크톱 카메라 없는 경우)
       * - NotReadableError: 다른 앱이 카메라 사용 중
       * - OverconstrainedError: 요청한 해상도를 카메라가 지원하지 않음
       */
      const errName = e instanceof DOMException ? e.name : '';
      if (errName === 'NotAllowedError') {
        setError('카메라 권한이 거부됐어요. 브라우저 설정에서 카메라 권한을 허용해주세요.');
      } else if (errName === 'NotFoundError') {
        setError('카메라를 찾을 수 없어요. 카메라가 연결되어 있는지 확인해주세요.');
      } else if (errName === 'NotReadableError') {
        setError('카메라가 다른 앱에서 사용 중이에요. 다른 앱을 닫고 다시 시도해주세요.');
      } else {
        setError('카메라에 접근할 수 없어요. 브라우저 카메라 권한을 확인해주세요.');
      }
    }
  }, [facing]);

  /**
   * 웹캠 + 모든 리소스 정지
   * - requestAnimationFrame 취소
   * - 카메라 스트림 트랙 해제
   * - Canvas 초기화
   */
  const stopCamera = useCallback(() => {
    /** 애니메이션 루프 중단 */
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    /** 카메라 스트림 해제 — 모든 트랙 stop */
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    /** 비디오 소스 해제 */
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    /** Canvas 클리어 */
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setDetectedCount(0);
  }, []);

  /**
   * 매 프레임 분석 + Canvas 렌더링 루프
   * requestAnimationFrame 기반 — 브라우저 프레임 속도에 맞춰 실행
   */
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || video.readyState < 2) {
      /** 비디오가 아직 준비 안 됐으면 다음 프레임에 재시도 */
      rafIdRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    /** Canvas 크기를 비디오 크기에 맞춤 */
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    /**
     * 1단계: Canvas에 카메라 영상 그리기
     * - 전면 카메라(user): 좌우 반전 (거울 모드 — 자연스러운 셀카 뷰)
     * - 후면 카메라(environment): 반전 없음 (실제 보이는 대로)
     */
    const isMirror = facing === 'user';
    ctx.save();
    if (isMirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    /** 2단계: MediaPipe 포즈 감지 실행 */
    const results = poseLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
      /** 첫 번째 사람의 관절 좌표 배열 (33개) */
      const landmarks = results.landmarks[0];
      setDetectedCount(landmarks.length);

      /** 부모 컴포넌트에 관절 데이터 전달 (피드백 계산용) */
      onLandmarksDetected?.(landmarks);

      /**
       * 3단계: 스켈레톤 연결선 그리기
       * - 전면(거울 모드): x → (1 - x) 반전 보정
       * - 후면: x 그대로 사용
       * - visibility < 0.5인 관절은 건너뜀 (가려진 부위)
       */
      /** x좌표 변환 함수 — 거울 모드면 반전, 아니면 그대로 */
      const toX = (nx: number) => (isMirror ? (1 - nx) : nx) * canvas.width;

      for (const [startIdx, endIdx, part] of SKELETON_CONNECTIONS) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        /** 두 관절 모두 visibility 0.5 이상일 때만 선 그리기 */
        if ((start.visibility ?? 0) < 0.3 || (end.visibility ?? 0) < 0.3) continue;

        const sx = toX(start.x);
        const sy = start.y * canvas.height;
        const ex = toX(end.x);
        const ey = end.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = PART_COLORS[part];
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      /**
       * 4단계: 관절 점(●) 그리기
       * - 주요 관절만 그림 (DRAW_JOINTS 목록)
       * - 부위별 색상 + 흰색 테두리
       */
      for (const idx of DRAW_JOINTS) {
        const lm = landmarks[idx];
        if ((lm.visibility ?? 0) < 0.3) continue;

        const x = toX(lm.x);
        const y = lm.y * canvas.height;

        /** 흰색 테두리 (두께 2px) */
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        /** 부위별 색상 채우기 */
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = getJointColor(idx);
        ctx.fill();
      }
    } else {
      setDetectedCount(0);
    }

    /** 다음 프레임 예약 */
    rafIdRef.current = requestAnimationFrame(detectLoop);
  }, [onLandmarksDetected, facing]);

  /**
   * isActive 또는 facing 변경 시 카메라 + 모델 시작/정지
   * facing이 바뀌면 기존 스트림 정지 → 새 카메라로 재시작
   */
  useEffect(() => {
    if (isActive) {
      /** 기존 카메라 정지 (facing 전환 시) → 모델 로드 → 새 카메라 시작 */
      stopCamera();
      (async () => {
        await initModel();
        await startCamera();
        /** 카메라 준비 후 분석 루프 시작 */
        rafIdRef.current = requestAnimationFrame(detectLoop);
      })();
    } else {
      stopCamera();
    }

    /** 컴포넌트 언마운트 or isActive false → 정리 */
    return () => stopCamera();
  }, [isActive, facing, initModel, startCamera, stopCamera, detectLoop]);

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden">
      {/* 웹캠 비디오 — 숨김 (Canvas로 렌더링) */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      {/* Canvas — 카메라 영상 + 스켈레톤 오버레이 */}
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className="w-full h-full object-contain"
      />

      {/* 모델 로딩 오버레이 */}
      {modelLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-white">포즈 인식 모델 로딩 중...</p>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center px-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* 관절 감지 상태 배지 — 좌상단 */}
      {isActive && !modelLoading && !error && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${detectedCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
            {detectedCount > 0 ? `관절 ${detectedCount}개 감지` : '사람을 찾는 중...'}
          </span>
        </div>
      )}

      {/* 색상 범례 — 우상단 */}
      {isActive && detectedCount > 0 && (
        <div className="absolute top-3 right-3 bg-black/50 rounded-lg px-2 py-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FACC15]" />
            <span className="text-[10px] text-white">머리</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span className="text-[10px] text-white">상체</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[10px] text-white">코어</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-[10px] text-white">하체</span>
          </div>
        </div>
      )}
    </div>
  );
}
