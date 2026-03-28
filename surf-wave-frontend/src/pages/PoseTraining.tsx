/**
 * @file PoseTraining.tsx
 * @description 포즈 트레이닝 페이지 — 육지 모드 실시간 자세 감지 + 피드백
 *
 * 기능:
 * 1. 카메라 시작/정지 토글
 * 2. 실시간 스켈레톤 오버레이 (LivePoseAnalyzer)
 * 3. 자세 피드백 카드 — 관절 각도 기반 체크:
 *    - 무릎 구부림 (골반-무릎-발목 각도)
 *    - 시선 방향 (코-귀 수평선)
 *    - 상체 정렬 (어깨-골반 회전각)
 *    - 무게중심 (골반 중점 vs 발 중점 수직 정렬)
 *
 * 진입 경로: 마이페이지 → "자세 연습" 메뉴 클릭
 * 서버 요청: 없음 (모든 처리가 브라우저에서 실행)
 */

import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Camera, CameraOff, Info, RotateCcw, SwitchCamera, Download, X } from 'lucide-react';
import { LivePoseAnalyzer } from '../components/pose/LivePoseAnalyzer';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface PoseTrainingProps {
  /** 뒤로가기 핸들러 — 마이페이지로 복귀 */
  onBack: () => void;
}

/**
 * 자세 측정 항목 타입
 *
 * 기존 good/warning/bad 판정을 제거하고, 측정값만 표시하는 방식으로 변경.
 * 이유: 체형마다 "좋은 자세"가 다르므로 절대적 판정은 부정확.
 * 대신 숫자만 보여주고, 사용자가 스스로 판단하거나 코치에게 공유.
 */
interface PoseFeedback {
  /** 측정 항목 이름 (예: "무릎 각도") */
  label: string;
  /** 측정 상태 — 'measured'(측정됨) | 'unknown'(관절 안 보임) */
  status: 'measured' | 'unknown';
  /** 설명 메시지 (한국어) — 판정이 아닌 사실 설명 */
  message: string;
  /** 측정된 수치 (예: "125°", "앞쪽 3cm") */
  value?: string;
}

/**
 * 두 벡터 사이 각도 계산 (도 단위)
 * 3개 관절 좌표로 중간 관절의 각도를 구함
 *
 * @param a - 첫 번째 관절 (예: 골반)
 * @param b - 중간 관절 (예: 무릎) — 이 관절의 각도를 계산
 * @param c - 세 번째 관절 (예: 발목)
 * @returns 도 단위 각도 (0~180)
 */
function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * 관절 좌표 배열에서 서핑 자세 측정값 4가지 항목 생성
 *
 * ⚠️ 판정(good/bad)을 하지 않음 — 이유:
 * - 체형마다 "올바른 각도"가 다름 (키, 다리 길이, 유연성)
 * - MediaPipe 좌표 자체가 ±5~10도 오차 있음
 * - 검증된 서핑 자세 데이터셋이 없음
 *
 * 대신 측정값만 보여주고, 사용자가 스스로 판단하거나 코치에게 공유.
 * "AI 거울" 역할 — 좋다/나쁘다가 아니라 "지금 이렇게 보여요"를 알려줌.
 *
 * visibility 임계값: 0.3 (기존 0.5)
 * - 0.5면 측면에서 반쪽 관절이 안 보여 분석 불가
 * - 0.3으로 낮추면 추정 좌표도 포함되어 측면 인식 개선
 * - 대신 노이즈가 약간 늘어남 (값이 흔들릴 수 있음)
 */
const VIS_THRESHOLD = 0.3;

function analyzePose(landmarks: NormalizedLandmark[]): PoseFeedback[] {
  const feedbacks: PoseFeedback[] = [];

  /** 관절 visibility 체크 — 0.3 이상이면 보이는 것으로 판단 (측면 인식 개선) */
  const isVisible = (idx: number) => (landmarks[idx]?.visibility ?? 0) > VIS_THRESHOLD;

  /**
   * 1. 무릎 각도 측정
   * 왼쪽: 골반(23) → 무릎(25) → 발목(27)
   * 오른쪽: 골반(24) → 무릎(26) → 발목(28)
   * 양쪽 다 보이면 각각 표시, 한쪽만 보이면 한쪽만
   */
  const leftKnee = isVisible(23) && isVisible(25) && isVisible(27)
    ? Math.round(calculateAngle(landmarks[23], landmarks[25], landmarks[27])) : null;
  const rightKnee = isVisible(24) && isVisible(26) && isVisible(28)
    ? Math.round(calculateAngle(landmarks[24], landmarks[26], landmarks[28])) : null;

  if (leftKnee !== null || rightKnee !== null) {
    /** 양쪽 다 보이면 "왼 125° / 오 130°", 한쪽만 보이면 해당 쪽만 */
    const parts: string[] = [];
    if (leftKnee !== null) parts.push(`왼 ${leftKnee}°`);
    if (rightKnee !== null) parts.push(`오 ${rightKnee}°`);
    const valueStr = parts.join(' / ');

    feedbacks.push({
      label: '무릎 각도',
      status: 'measured',
      message: '숫자가 작을수록 무릎을 많이 굽힌 것 (서핑 스탠스는 보통 90~140°)',
      value: valueStr,
    });
  } else {
    feedbacks.push({ label: '무릎 각도', status: 'unknown', message: '하체가 보이지 않아요. 전신이 나오게 서주세요' });
  }

  /**
   * 2. 머리 위치 측정
   * 코(0)와 어깨 중점(11,12)의 y좌표 차이를 cm 단위로 환산
   * y축: 0(위) ~ 1(아래) → 차이 × 화면높이(추정 170cm)로 대략 cm 환산
   * 양수면 코가 어깨보다 아래 (고개 숙임), 음수면 위 (고개 듦)
   */
  if (isVisible(0) && isVisible(11) && isVisible(12)) {
    const noseY = landmarks[0].y;
    const shoulderMidY = (landmarks[11].y + landmarks[12].y) / 2;
    const diffNorm = noseY - shoulderMidY;
    /** 대략적 cm 환산 — 화면 세로가 전신(~170cm)이라 가정 */
    const diffCm = Math.round(diffNorm * 170);

    let message: string;
    if (diffCm > 5) {
      message = '코가 어깨보다 아래 → 고개를 많이 숙이고 있어요';
    } else if (diffCm > 0) {
      message = '코가 어깨와 비슷한 높이예요';
    } else {
      message = '코가 어깨보다 위 → 고개를 들고 있어요';
    }
    feedbacks.push({
      label: '머리 위치',
      status: 'measured',
      message,
      value: diffCm > 0 ? `어깨 아래 약 ${diffCm}cm` : `어깨 위 약 ${Math.abs(diffCm)}cm`,
    });
  } else {
    feedbacks.push({ label: '머리 위치', status: 'unknown', message: '얼굴이 보이지 않아요' });
  }

  /**
   * 3. 어깨-골반 틀어짐 측정
   * 어깨 라인과 골반 라인의 각도 차이 (도 단위)
   * 0°에 가까울수록 정렬됨, 클수록 상체가 꼬여 있음
   */
  if (isVisible(11) && isVisible(12) && isVisible(23) && isVisible(24)) {
    const shoulderAngle = Math.atan2(
      landmarks[12].y - landmarks[11].y,
      landmarks[12].x - landmarks[11].x,
    ) * (180 / Math.PI);
    const hipAngle = Math.atan2(
      landmarks[24].y - landmarks[23].y,
      landmarks[24].x - landmarks[23].x,
    ) * (180 / Math.PI);
    const rotation = Math.round(Math.abs(shoulderAngle - hipAngle));

    feedbacks.push({
      label: '상체 틀어짐',
      status: 'measured',
      message: '어깨 라인과 골반 라인의 각도 차이 (0°에 가까울수록 정렬)',
      value: `${rotation}°`,
    });
  } else {
    feedbacks.push({ label: '상체 틀어짐', status: 'unknown', message: '상체가 보이지 않아요' });
  }

  /**
   * 4. 스탠스 너비 측정
   * 양 발목(27,28) 사이의 x축 거리를 어깨 너비(11,12) 대비 비율로 표시
   * 예: "어깨 너비의 1.5배" → 서핑에서 참고할 수 있는 객관적 수치
   */
  if (isVisible(11) && isVisible(12) && isVisible(27) && isVisible(28)) {
    const shoulderWidth = Math.abs(landmarks[12].x - landmarks[11].x);
    const footWidth = Math.abs(landmarks[28].x - landmarks[27].x);
    /** 어깨 너비 대비 비율 (소수점 1자리) */
    const ratio = shoulderWidth > 0.01 ? (footWidth / shoulderWidth).toFixed(1) : '—';

    feedbacks.push({
      label: '스탠스 너비',
      status: 'measured',
      message: '양 발목 간격을 어깨 너비 기준으로 표시 (서핑은 보통 1.0~1.8배)',
      value: `어깨 대비 ${ratio}배`,
    });
  } else {
    feedbacks.push({ label: '스탠스 너비', status: 'unknown', message: '전신이 보이지 않아요' });
  }

  return feedbacks;
}

/** 피드백 상태별 색상 + 아이콘 */
const STATUS_CONFIG = {
  measured: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '📐' },
  unknown: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', icon: '?' },
};

export function PoseTraining({ onBack }: PoseTrainingProps) {
  /** 카메라 활성 상태 */
  const [cameraOn, setCameraOn] = useState(false);
  /** 카메라 방향 — 'user'(전면/셀카) | 'environment'(후면) */
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  /** 실시간 자세 측정 결과 배열 */
  const [feedbacks, setFeedbacks] = useState<PoseFeedback[]>([]);
  /** 프레임 스킵 카운터 — 매 프레임 분석하면 부하가 크므로 5프레임마다 피드백 갱신 */
  const frameCountRef = useRef(0);
  /** Canvas ref — 스냅샷 캡처 시 Canvas의 현재 프레임(영상+스켈레톤)을 이미지로 변환 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 캡처된 스냅샷 목록 — data URL 형태로 저장 */
  const [snapshots, setSnapshots] = useState<string[]>([]);
  /** 스냅샷 확대 보기 인덱스 — null이면 확대 안 함 */
  const [viewingSnapshot, setViewingSnapshot] = useState<number | null>(null);

  /**
   * LivePoseAnalyzer에서 관절 좌표를 받아 피드백 계산
   * 5프레임마다 한 번 분석 (성능 최적화)
   */
  const handleLandmarks = useCallback((landmarks: NormalizedLandmark[]) => {
    frameCountRef.current += 1;
    if (frameCountRef.current % 5 !== 0) return;
    const result = analyzePose(landmarks);
    setFeedbacks(result);
  }, []);

  /** 카메라 토글 */
  const toggleCamera = () => {
    if (cameraOn) {
      setFeedbacks([]);
      frameCountRef.current = 0;
    }
    setCameraOn(!cameraOn);
  };

  /**
   * 스냅샷 캡처 — Canvas의 현재 프레임(카메라 영상 + 스켈레톤 오버레이)을 PNG로 저장
   * 캡처 시점의 측정값도 함께 기록하면 나중에 비교 가능
   */
  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    /** Canvas → data URL (PNG) */
    const dataUrl = canvas.toDataURL('image/png');
    setSnapshots(prev => [dataUrl, ...prev]); // 최신순으로 앞에 추가
  };

  /**
   * 스냅샷 다운로드 — 갤러리에 저장
   * data URL → <a> 태그 클릭으로 다운로드 트리거
   */
  const downloadSnapshot = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `surf-pose-${new Date().toISOString().slice(0, 10)}-${index + 1}.png`;
    link.click();
  };

  /** 스냅샷 삭제 */
  const deleteSnapshot = (index: number) => {
    setSnapshots(prev => prev.filter((_, i) => i !== index));
    if (viewingSnapshot === index) setViewingSnapshot(null);
  };

  return (
    <div className="max-w-md mx-auto pb-24 px-4">
      {/* 헤더 — 뒤로가기 + 제목 */}
      <header className="flex items-center gap-3 py-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">자세 연습</h1>
          <p className="text-xs text-muted-foreground">
            카메라로 서핑 자세를 확인해보세요
          </p>
        </div>
      </header>

      {/* 안내 카드 — 카메라 꺼져 있을 때 표시 */}
      {!cameraOn && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">이렇게 사용하세요</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>카메라 앞에서 서핑 스탠스를 잡아주세요</li>
                <li>전신이 보이도록 1.5~2m 거리를 유지하세요</li>
                <li>스켈레톤이 내 몸에 맞게 표시되는지 확인하세요</li>
                <li>피드백 카드를 보며 자세를 교정해보세요</li>
              </ol>
              <p className="text-xs text-muted-foreground/70">
                * 이 기능은 "확실히 나쁜 자세"를 잡아주는 용도예요.<br />
                * 사람마다 체형이 다르므로 절대적인 기준은 아닙니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 카메라 뷰 — LivePoseAnalyzer 컴포넌트 */}
      <div className="mb-4">
        <LivePoseAnalyzer
          isActive={cameraOn}
          facing={facing}
          canvasRef={canvasRef}
          onLandmarksDetected={handleLandmarks}
        />
      </div>

      {/* 카메라 시작/정지 버튼 */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={toggleCamera}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
            cameraOn
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {cameraOn ? (
            <>
              <CameraOff className="w-5 h-5" />
              카메라 끄기
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              카메라 시작
            </>
          )}
        </button>

        {/* 카메라 전/후면 전환 버튼 — 카메라 켜져 있을 때만 표시 */}
        {cameraOn && (
          <button
            onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}
            className="px-4 py-3 rounded-xl border border-border hover:bg-secondary transition-colors"
            title={facing === 'user' ? '후면 카메라로 전환' : '전면 카메라로 전환'}
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        )}

        {/* 스냅샷 캡처 버튼 — 현재 화면(영상+스켈레톤)을 이미지로 저장 */}
        {cameraOn && (
          <button
            onClick={captureSnapshot}
            className="px-4 py-3 rounded-xl border border-primary/50 bg-primary/10 hover:bg-primary/20 transition-colors"
            title="자세 캡처"
          >
            <Download className="w-5 h-5 text-primary" />
          </button>
        )}

        {/* 피드백 초기화 버튼 */}
        {cameraOn && (
          <button
            onClick={() => { setFeedbacks([]); frameCountRef.current = 0; }}
            className="px-4 py-3 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 자세 피드백 카드 목록 */}
      {feedbacks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">자세 분석</h2>
          {feedbacks.map((fb) => {
            const config = STATUS_CONFIG[fb.status];
            return (
              <div
                key={fb.label}
                className={`flex items-center gap-3 p-3 rounded-xl border ${config.bg} ${config.border}`}
              >
                {/* 상태 아이콘 */}
                <div className={`w-8 h-8 flex items-center justify-center rounded-full ${config.bg} ${config.text} text-lg font-bold shrink-0`}>
                  {config.icon}
                </div>
                {/* 라벨 + 메시지 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{fb.label}</span>
                    {fb.value && (
                      <span className={`text-xs ${config.text}`}>{fb.value}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{fb.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 카메라 켜져 있고 피드백 아직 없을 때 */}
      {cameraOn && feedbacks.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            카메라 앞에 서면 자세 분석이 시작돼요
          </p>
        </div>
      )}

      {/* ─── 스냅샷 갤러리 ─── */}
      {snapshots.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            캡처한 자세 ({snapshots.length}장)
          </h2>
          {/* 썸네일 그리드 — 3열, 탭하면 확대 */}
          <div className="grid grid-cols-3 gap-2">
            {snapshots.map((dataUrl, idx) => (
              <div key={idx} className="relative group">
                <button
                  onClick={() => setViewingSnapshot(idx)}
                  className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img
                    src={dataUrl}
                    alt={`자세 캡처 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
                {/* 삭제 버튼 — 호버 시 표시 */}
                <button
                  onClick={() => deleteSnapshot(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 스냅샷 확대 모달 ─── */}
      {viewingSnapshot !== null && snapshots[viewingSnapshot] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingSnapshot(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            {/* 확대된 스냅샷 이미지 */}
            <img
              src={snapshots[viewingSnapshot]}
              alt="자세 캡처 확대"
              className="w-full rounded-xl"
            />
            {/* 하단 버튼 — 다운로드 + 닫기 */}
            <div className="flex gap-3 mt-3 justify-center">
              <button
                onClick={() => downloadSnapshot(snapshots[viewingSnapshot!], viewingSnapshot!)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                저장하기
              </button>
              <button
                onClick={() => setViewingSnapshot(null)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
