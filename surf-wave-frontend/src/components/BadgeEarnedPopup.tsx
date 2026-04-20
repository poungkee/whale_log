/**
 * @file BadgeEarnedPopup.tsx
 * @description 뱃지 획득 축하 팝업 — 새 뱃지를 획득했을 때 화면 하단에서 슬라이드업
 *
 * 사용법:
 * 1. App.tsx에 <BadgeEarnedPopup> 렌더링
 * 2. API 응답에 newBadges: string[] 이 있으면 showBadgeEarned(keys) 호출
 */

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

/** 뱃지 key → 이름/이모지 매핑 (백엔드 badge-definitions 와 동일) */
const BADGE_META: Record<string, { nameKo: string; icon: string }> = {
  WELCOME: { nameKo: '웨일 로그 첫 인사', icon: '🐋' },
  PROFILE_COMPLETE: { nameKo: '파도의 시작', icon: '🏄' },
  PRO_SURFER: { nameKo: '프로 서퍼', icon: '🏆' },
  FIRST_DIARY: { nameKo: '첫 파도 기록', icon: '📔' },
  DIARY_10: { nameKo: '파도 일기장', icon: '📒' },
  DIARY_100: { nameKo: '파도 연대기', icon: '📚' },
  FIRST_PHOTO_DIARY: { nameKo: '파도 사진작가', icon: '📸' },
  PHOTO_DIARY_20: { nameKo: '파도 포토그래퍼', icon: '🎞️' },
  PHOTO_DIARY_50: { nameKo: '파도 아카이브', icon: '🗂️' },
  PHOTO_DIARY_100: { nameKo: '파도 박물관', icon: '🏛️' },
  FIRST_WAVER: { nameKo: '퍼스트 웨이버', icon: '🚀' },
  PERFECT_DAY: { nameKo: '퍼펙트 데이', icon: '⭐' },
  FLAT_DAY: { nameKo: '노 웨이브 데이', icon: '😅' },
  WIPEOUT_DAY: { nameKo: '와이프아웃 데이', icon: '💥' },
  DOUBLE_SESSION: { nameKo: '더블 세션', icon: '⚡' },
  BOARD_3: { nameKo: '보드 탐험가', icon: '🏄‍♂️' },
  BOARD_5: { nameKo: '보드 컬렉터', icon: '🎿' },
  BOARD_7: { nameKo: '보드 마스터', icon: '🎯' },
  BOARD_ALL: { nameKo: '보드 완전정복', icon: '👑' },
  FIRST_FAVORITE: { nameKo: '내 파도', icon: '❤️' },
  FAVORITE_10: { nameKo: '스팟 헌터', icon: '🗺️' },
  FAVORITE_20: { nameKo: '스팟 마스터', icon: '🌍' },
  FIRST_VOTE: { nameKo: '파도 관측자', icon: '👁️' },
  VOTE_30: { nameKo: '투표 달인', icon: '🗳️' },
  DAWN_SURFER: { nameKo: '새벽 서퍼', icon: '🌅' },
  SUNSET_SURFER: { nameKo: '노을 서퍼', icon: '🌇' },
  NIGHT_OWL: { nameKo: '나이트 올빼미', icon: '🦉' },
  FOUR_SEASONS: { nameKo: '사계절 서퍼', icon: '🍂' },
  WINTER_SURFER: { nameKo: '겨울 서퍼', icon: '❄️' },
  WINTER_WARRIOR: { nameKo: '겨울 전사', icon: '🥶' },
  OCEAN_CRUSH: { nameKo: '만족 백점', icon: '💯' },
  SOMMELIER: { nameKo: '파도 소믈리에', icon: '🍷' },
  REBEL_SURFER: { nameKo: '파도 반항아', icon: '😈' },
  CURSED_SURFER: { nameKo: '저주받은 서퍼', icon: '💀' },
  STUBBORN: { nameKo: '고집쟁이', icon: '🐂' },
  STREAK_7: { nameKo: '7일 연속', icon: '🔥' },
  STREAK_30: { nameKo: '30일 연속', icon: '🌋' },
  SURF_BUDDY: { nameKo: '서프 버디', icon: '🤝' },
  SURF_CLASSMATE: { nameKo: '서프 클래스메이트', icon: '👥' },
  GUIDE_5: { nameKo: '서핑 교과서', icon: '📖' },
  GUIDE_ALL: { nameKo: '파도 박사', icon: '🎓' },
  KOREAN_SURFER: { nameKo: '코리안 서퍼', icon: '🇰🇷' },
  BALI_SURFER: { nameKo: '발리 서퍼', icon: '🌴' },
  TWO_COUNTRIES: { nameKo: '두 나라 서퍼', icon: '✈️' },
  THREE_COUNTRIES: { nameKo: '세 나라 서퍼', icon: '🌏' },
  SECRET_SPOT: { nameKo: '시크릿 스팟', icon: '🤫' },
  WAVE_MASTER: { nameKo: '웨이브 마스터', icon: '🌊' },
  DAY_ONE_DIARY: { nameKo: '데이원 다이어리', icon: '📅' },
  TIME_CAPSULE: { nameKo: '타임 캡슐', icon: '⏳' },
  REVENGE_WAVE: { nameKo: '복수의 파도', icon: '⚔️' },
  ROLLERCOASTER: { nameKo: '롤러코스터', icon: '🎢' },
  TEARS_OF_WAVE: { nameKo: '파도의 눈물', icon: '😢' },
  DEEP_FISH: { nameKo: '심해어', icon: '🐟' },
  WILDCARD: { nameKo: '와일드카드', icon: '🃏' },
  WAVE_WITH_WHALE: { nameKo: '고래와 함께', icon: '🐳' },
  FOUNDER: { nameKo: '창립 멤버', icon: '🏅' },
  EARLY_BIRD: { nameKo: '얼리버드', icon: '🐦' },
  ANNIVERSARY_2026: { nameKo: '2026 개근상', icon: '🎂' },
  ANNIVERSARY_2027: { nameKo: '2027 개근상', icon: '🎂' },
};

/** 큐에 있는 뱃지 하나씩 순서대로 표시 */
interface BadgeEarnedPopupProps {
  /** 표시할 뱃지 key 큐 */
  queue: string[];
  /** 팝업 닫힐 때 첫 번째 항목 제거 */
  onDismiss: () => void;
}

export function BadgeEarnedPopup({ queue, onDismiss }: BadgeEarnedPopupProps) {
  const [visible, setVisible] = useState(false);
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    /** 살짝 딜레이 후 슬라이드인 */
    const showTimer = setTimeout(() => setVisible(true), 50);
    /** 3초 후 자동 닫기 */
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // 애니메이션 후 제거
    }, 3200);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [current]);

  if (!current) return null;

  const meta = BADGE_META[current] ?? { nameKo: current, icon: '🏅' };
  const imgSrc = `/badges/${current}.png`;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
    >
      <div className="flex items-center gap-3 bg-card border border-yellow-300 shadow-lg rounded-2xl px-4 py-3 min-w-[220px] max-w-[300px]">
        {/* 뱃지 이미지 */}
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-yellow-300">
          <BadgeImg src={imgSrc} fallback={meta.icon} />
        </div>
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide">뱃지 획득!</span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">{meta.nameKo}</p>
        </div>
      </div>
    </div>
  );
}

/** 이미지 onError 시 이모지 fallback */
function BadgeImg({ src, fallback }: { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="w-full h-full flex items-center justify-center text-xl bg-secondary">{fallback}</div>;
  }
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover scale-110"
      onError={() => setFailed(true)}
    />
  );
}
