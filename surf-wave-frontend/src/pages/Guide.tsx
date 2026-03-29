/**
 * @file Guide.tsx
 * @description 서핑 가이드 페이지 — 초보 서퍼를 위한 필수 지식 모음
 *
 * 카테고리:
 * 1. 바다 규칙/에티켓 — 드롭인 금지, 라인업 순서, 패들 우회 등
 * 2. 안전 상식 — 이안류, 해파리, 파도 크기별 위험도
 * 3. 용어 사전 — 파도/동작/바람/보드 용어
 * 4. 기본 자세 — 스탠스, 팝업, 패들링
 *
 * 진입: 하단 탭 "가이드" 클릭
 * 서버 요청: 없음 (정적 콘텐츠)
 */

import { useState } from 'react';
import {
  Shield, BookOpen, Wind, Footprints,
  ChevronDown, ChevronUp, AlertTriangle, Users, Navigation, Heart
} from 'lucide-react';

/** 가이드 카테고리 타입 */
type GuideCategory = 'rules' | 'safety' | 'terms' | 'basics';

/** 카테고리 정의 — 아이콘, 라벨, 색상, 설명 */
const CATEGORIES: {
  id: GuideCategory;
  icon: typeof Shield;
  label: string;
  desc: string;
  color: string;
}[] = [
  { id: 'rules', icon: Users, label: '바다 규칙', desc: '서핑 에티켓과 우선권', color: '#3B82F6' },
  { id: 'safety', icon: Shield, label: '안전 상식', desc: '위험 상황 대처법', color: '#EF4444' },
  { id: 'terms', icon: BookOpen, label: '용어 사전', desc: '파도·바람·보드 용어', color: '#22C55E' },
  { id: 'basics', icon: Footprints, label: '기본 자세', desc: '스탠스·팝업·패들링', color: '#F59E0B' },
];

/** 가이드 항목 타입 — 제목 + 내용 (접이식 아코디언) */
interface GuideItem {
  title: string;
  icon?: string;
  content: string;
}

/* ===================================================================
 * 가이드 콘텐츠 — 각 카테고리별 항목 목록
 * 초보 서퍼가 바다 나가기 전에 반드시 알아야 할 정보
 * =================================================================== */

/** 1. 바다 규칙/에티켓 */
const RULES_ITEMS: GuideItem[] = [
  {
    title: '드롭인 금지 (Drop-in)',
    icon: '🚫',
    content: `서핑에서 가장 중요한 규칙이에요.

파도의 피크(가장 높은 지점)에 가장 가까운 서퍼가 우선권을 가져요. 이미 누군가 파도를 타고 있는데 같은 파도에 끼어드는 것을 "드롭인"이라고 해요.

드롭인은:
• 충돌 사고의 가장 큰 원인
• 서퍼 사이에서 가장 무례한 행동
• 초보자가 가장 많이 하는 실수

🔑 핵심: 파도를 타기 전에 항상 양쪽을 확인하세요. 누군가 이미 타고 있으면 포기!`,
  },
  {
    title: '피크 우선권 (Priority)',
    icon: '👑',
    content: `파도의 피크(Peak)에 가장 가까운 서퍼가 우선권을 가져요.

우선권 순서:
1. 피크에 가장 가까운 사람
2. 먼저 패들링을 시작한 사람
3. 로컬 서퍼 (해당 스팟을 자주 이용하는 사람)

⚠️ A-프레임 파도 (양쪽으로 갈라지는 파도)에서는 양쪽 각각 1명씩 탈 수 있어요.`,
  },
  {
    title: '패들 아웃 우회',
    icon: '🏊',
    content: `바다로 나갈 때 (패들 아웃) 다른 서퍼의 라이딩 경로를 방해하면 안 돼요.

올바른 방법:
• 화이트워터(거품) 쪽으로 돌아서 나가기
• 라이딩 중인 서퍼의 뒤쪽으로 우회
• 절대 서퍼의 앞을 가로지르지 않기

❌ 잘못된 예: 파도를 타고 내려오는 서퍼 앞으로 패들링
✅ 올바른 예: 거품 쪽(이미 부서진 파도)으로 돌아서 나가기`,
  },
  {
    title: '보드 잡고 있기',
    icon: '🏄',
    content: `파도가 올 때 보드를 놓으면 뒤에 있는 사람이 맞을 수 있어요.

기본 수칙:
• 리쉬(발줄) 항상 착용
• 파도가 덮칠 때 보드를 몸 옆으로 잡기
• 보드를 앞으로 밀지 않기 (뒤에 사람이 있을 수 있음)
• 덕다이브 또는 터틀롤로 파도 넘기

💡 리쉬는 생명줄이에요. 절대 빼지 마세요!`,
  },
  {
    title: '로컬 존중',
    icon: '🤝',
    content: `각 서핑 스팟에는 자주 오는 로컬 서퍼들이 있어요.

에티켓:
• 인사하기 — 물에 들어갈 때 눈 마주치면 가볍게 인사
• 양보하기 — 모든 파도를 독점하지 않기
• 스팟 규칙 따르기 — 스팟마다 비공식 규칙이 있을 수 있음
• 쓰레기 가져가기 — 해변 깨끗이

🌊 서핑은 자연과 사람을 존중하는 스포츠예요.`,
  },
];

/** 2. 안전 상식 */
const SAFETY_ITEMS: GuideItem[] = [
  {
    title: '이안류 (Rip Current) 대처법',
    icon: '🌊',
    content: `이안류는 해변에서 바다 쪽으로 강하게 빠져나가는 해류예요. 서핑 중 가장 위험한 상황 중 하나.

발생 징후:
• 주변보다 파도가 안 부서지는 구간
• 물 색이 탁하거나 거품이 바다로 빠져나감
• 떠다니는 물체가 바다로 빠르게 이동

대처법:
1. ❌ 절대 해변 방향으로 맞서 수영하지 않기 (체력 소진)
2. ✅ 해변과 평행하게 (옆으로) 수영
3. 이안류를 벗어난 후 대각선으로 해변을 향해 수영
4. 체력이 없으면 보드에 올라타고 떠서 기다리기 → 구조 요청

💡 이안류는 보통 폭 10~30m. 옆으로 조금만 이동하면 벗어날 수 있어요.`,
  },
  {
    title: '파도 크기별 위험도',
    icon: '📏',
    content: `파도 높이에 따른 서핑 난이도와 위험도:

🟢 0.3~0.8m (무릎~허리): 초보 적합
  • 안전하게 연습 가능
  • 화이트워터에서 팝업 연습

🟡 0.8~1.2m (허리~가슴): 초중급
  • 파도의 힘이 세짐
  • 기본기가 있어야 안전

🟠 1.2~1.8m (가슴~머리): 중급 이상
  • 초보자 위험
  • 덕다이브 필수

🔴 1.8m+ (머리 이상): 상급자 전용
  • 초보자 절대 금지
  • 경험자도 주의 필요

⚠️ 파고 수치보다 실제 파도가 더 크게 느껴져요. 처음엔 작은 파도에서 시작하세요!`,
  },
  {
    title: '해파리·산호 주의',
    icon: '🪼',
    content: `열대 지역(발리 등)에서 특히 주의:

해파리:
• 우기(11~3월)에 발리 해변에 많음
• 쏘이면 식초로 세척 (민물 ❌)
• 심하면 즉시 병원

산호:
• 리프 브레이크 스팟에서 주의 (울루와투, 파당파당 등)
• 서핑 부츠 착용 권장
• 긁히면 소독 + 항생제 연고

🏥 심한 통증/부종이면 반드시 병원! 가볍게 보면 안 돼요.`,
  },
  {
    title: '혼자 서핑 금지',
    icon: '👥',
    content: `초보자는 절대 혼자 서핑하지 마세요.

이유:
• 이안류에 빠졌을 때 구조 요청 불가
• 보드에 부딪혀 기절하면 익사 위험
• 체력 소진 시 도움 받을 사람 필요

안전 수칙:
• 최소 2인 이상
• 서로 시야에 있는 거리 유지
• 해변에서 관찰하는 사람이 있으면 더 좋음
• 인명구조대가 있는 해변 이용

💡 서핑 레슨을 받으면 안전하게 시작할 수 있어요!`,
  },
  {
    title: '준비운동 필수',
    icon: '🧘',
    content: `바다 들어가기 전 10분 스트레칭:

필수 부위:
• 어깨 — 패들링에 가장 많이 사용
• 허리 — 팝업 시 아치백 동작
• 목 — 패들링 중 계속 들고 있어야 함
• 손목/발목 — 보드 위 밸런스

추천 동작:
1. 팔 돌리기 (앞뒤 각 10회)
2. 고양이-소 자세 (허리 유연성)
3. 런지 (하체 활성화)
4. 손목 돌리기

⚠️ 차가운 물에 갑자기 들어가면 근육 경련 위험!`,
  },
];

/** 3. 용어 사전 */
const TERMS_ITEMS: GuideItem[] = [
  {
    title: '파도 용어',
    icon: '🌊',
    content: `• 세트 (Set) — 연속으로 밀려오는 큰 파도 그룹 (보통 3~5개)
• 피크 (Peak) — 파도가 처음 부서지기 시작하는 가장 높은 지점
• 숄더 (Shoulder) — 피크 옆으로 아직 안 부서진 파도 면
• 페이스 (Face) — 파도의 앞면 (서퍼가 타는 면)
• 립 (Lip) — 파도 꼭대기가 넘어지는 부분
• 화이트워터 (White Water) — 이미 부서진 거품 파도
• 라인업 (Lineup) — 서퍼들이 파도를 기다리며 앉아있는 구간
• 인사이드 (Inside) — 해변에 가까운 얕은 구간
• 아웃사이드 (Outside) — 바다 쪽 깊은 구간
• 클로즈아웃 (Close-out) — 파도가 한꺼번에 전부 부서지는 것 (타기 어려움)`,
  },
  {
    title: '동작 용어',
    icon: '🏄',
    content: `• 팝업 (Pop-up) — 보드 위에서 누워있다가 한 번에 일어서는 동작
• 테이크오프 (Take-off) — 파도를 잡고 일어서서 타기 시작하는 것
• 패들링 (Paddling) — 팔로 물을 저어 이동하는 것
• 덕다이브 (Duck Dive) — 보드와 함께 파도 아래로 잠수 (숏보드)
• 터틀롤 (Turtle Roll) — 보드를 뒤집어 파도 아래로 통과 (롱보드)
• 바텀턴 (Bottom Turn) — 파도 밑에서 방향 전환 (모든 기술의 기본)
• 컷백 (Cutback) — 파도 파워존으로 되돌아오는 턴
• 킥아웃 (Kick Out) — 파도에서 빠져나오는 동작
• 와이프아웃 (Wipeout) — 파도에서 떨어지는 것 (넘어짐)
• 노즈라이딩 (Nose Riding) — 롱보드 앞쪽에서 타기`,
  },
  {
    title: '바람 용어',
    icon: '💨',
    content: `바람은 파도 컨디션에 가장 큰 영향을 미쳐요:

• 오프쇼어 (Offshore) — 육지 → 바다 방향 바람
  ✅ 최고! 파도 면이 깨끗하고 파도가 오래 유지됨

• 온쇼어 (Onshore) — 바다 → 육지 방향 바람
  ❌ 파도를 무너뜨려서 지저분해짐

• 사이드쇼어 (Sideshore) — 옆에서 부는 바람
  △ 보통. 약하면 괜찮음

• 글래시 (Glassy) — 바람이 없는 상태
  ✅ 수면이 유리처럼 매끄러움. 서핑 최적!

• 초피 (Choppy) — 강한 바람으로 수면이 울퉁불퉁
  ❌ 패들링 어렵고 파도 타기 힘듦

💡 이 앱의 "바람" 정보에서 풍향/풍속을 확인하세요!`,
  },
  {
    title: '보드 용어',
    icon: '🛹',
    content: `• 노즈 (Nose) — 보드 앞부분 (둥글면 롱보드, 뾰족하면 숏보드)
• 테일 (Tail) — 보드 뒷부분 (턴 성능에 영향)
• 레일 (Rail) — 보드 옆면 (턴 시 물에 잠기는 부분)
• 덱 (Deck) — 보드 윗면 (발을 올리는 면)
• 바텀 (Bottom) — 보드 아랫면 (물과 접하는 면)
• 핀 (Fin) — 보드 아래 붙은 날개 (방향 제어)
• 리쉬 (Leash) — 발과 보드를 연결하는 줄 (안전 필수!)
• 왁스 (Wax) — 미끄럼 방지용 (덱에 바름)
• 스트링거 (Stringer) — 보드 중앙을 지나는 나무 심
• 로커 (Rocker) — 노즈/테일의 위로 휘어진 정도`,
  },
  {
    title: '파도 종류',
    icon: '🏖️',
    content: `• 비치 브레이크 (Beach Break) — 모래 바닥에서 부서지는 파도
  ✅ 초보 추천! 넘어져도 안전 (양양, 꾸따)

• 리프 브레이크 (Reef Break) — 산호/암초 위에서 부서지는 파도
  ⚠️ 중급 이상! 바닥이 단단해서 위험 (울루와투, 파당파당)

• 포인트 브레이크 (Point Break) — 돌출된 지형을 따라 부서지는 파도
  🌟 길게 탈 수 있음! (메데위)

• A-프레임 (A-Frame) — 피크에서 양쪽으로 갈라지는 파도
  양쪽에서 각각 1명씩 탈 수 있음

💡 초보자는 비치 브레이크에서 시작하세요!`,
  },
];

/** 4. 기본 자세 */
const BASICS_ITEMS: GuideItem[] = [
  {
    title: '스탠스 정하기 (레귤러 vs 구피)',
    icon: '🦶',
    content: `서핑에서 가장 먼저 정해야 할 것: 어느 발이 앞인지!

• 레귤러 (Regular) — 왼발이 앞, 오른발이 뒤
• 구피 (Goofy) — 오른발이 앞, 왼발이 뒤

확인 방법:
1. 누군가에게 뒤에서 살짝 밀어달라고 하기
2. 먼저 나가는 발 = 앞발
3. 또는 미끄러운 바닥에서 슬라이딩 — 앞에 놓는 발이 앞발

💡 정답은 없어요! 편한 쪽이 맞는 거예요.
💡 이 앱의 "자세 연습" 기능에서 스탠스를 확인해보세요!`,
  },
  {
    title: '팝업 5단계',
    icon: '💪',
    content: `팝업은 서핑의 가장 기본이자 가장 중요한 동작!

1단계: 패들링 자세
  → 보드 중앙에 엎드려 팔로 패들

2단계: 파도 잡기
  → 파도가 보드를 밀어주는 순간 느끼기

3단계: 가슴 올리기
  → 양손을 가슴 옆에 짚고 상체를 들어올림 (코브라 자세)

4단계: 뒷발 먼저
  → 뒷발을 보드 뒤쪽 패드 위에 놓기

5단계: 앞발 올리기 + 일어서기
  → 앞발을 양손 사이로 가져와서 일어섬
  → 무릎 굽히고, 시선은 앞으로!

⚠️ 무릎으로 먼저 일어서지 마세요! 한 번에 일어서는 연습을 해야 해요.
💡 육지에서 충분히 연습 → 바다에서 자연스럽게!`,
  },
  {
    title: '올바른 패들링 자세',
    icon: '🏊',
    content: `패들링은 서핑 시간의 80%를 차지해요. 효율적인 자세가 중요!

보드 위 위치:
• 너무 앞 → 노즈가 물에 잠김 (노즈다이브)
• 너무 뒤 → 노즈가 들려서 속도 안 남
• 적당 → 노즈가 수면에서 2~3cm 떠있는 위치

팔 동작:
• 팔을 쭉 뻗어서 앞에서 물 잡기
• 손가락 붙이고 컵 모양으로
• 보드 아래를 지나 허벅지까지 당기기
• S자 곡선으로 저으면 더 효율적

💡 패들링할 때 고개를 너무 들지 마세요. 목이 아파요!`,
  },
  {
    title: '보드 위 밸런스',
    icon: '⚖️',
    content: `일어선 후 밸런스 잡기:

발 위치:
• 뒷발: 보드 뒤쪽 1/3 지점 (핀 위쪽)
• 앞발: 보드 중앙 (스트링거 위)
• 발 간격: 어깨 너비보다 약간 넓게

자세:
• 무릎 살짝 굽히기 (서핑 스탠스)
• 체중을 앞발 60%, 뒷발 40%로
• 팔은 자연스럽게 벌려서 균형
• 시선은 앞! (발 보면 넘어져요)
• 엉덩이를 낮추면 안정감 UP

💡 이 앱의 "자세 연습"에서 무릎 각도와 스탠스 너비를 확인해보세요!`,
  },
  {
    title: '파도 읽는 법',
    icon: '👀',
    content: `좋은 파도를 고르는 눈을 키우세요:

라인업에서 관찰할 것:
• 세트가 오는 주기 (보통 5~15분 간격)
• 피크 위치 (파도가 처음 부서지는 곳)
• 파도 방향 (왼쪽/오른쪽 어디로 달리는지)
• 다른 서퍼들이 어디서 타는지

좋은 파도 고르기:
• 한꺼번에 부서지지 않는 파도 (숄더가 있는 파도)
• 너무 크지도 작지도 않은 파도
• 세트의 2~3번째 파도가 보통 가장 좋음

❌ 피할 파도:
• 클로즈아웃 (한꺼번에 전부 부서짐)
• 이미 부서진 화이트워터만 남은 파도
• 너무 빠르게 부서지는 파도

💡 15분간 해변에서 관찰 → 패턴 파악 → 물에 들어가기!`,
  },
];

/** 카테고리별 가이드 항목 매핑 */
const GUIDE_DATA: Record<GuideCategory, GuideItem[]> = {
  rules: RULES_ITEMS,
  safety: SAFETY_ITEMS,
  terms: TERMS_ITEMS,
  basics: BASICS_ITEMS,
};

export function Guide() {
  /** 현재 선택된 카테고리 */
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('rules');
  /** 펼쳐진 아코디언 인덱스 (null이면 모두 접힘) */
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  /** 아코디언 토글 */
  const toggleItem = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  /** 카테고리 변경 시 아코디언 초기화 */
  const changeCategory = (cat: GuideCategory) => {
    setActiveCategory(cat);
    setExpandedIndex(null);
  };

  const items = GUIDE_DATA[activeCategory];
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="max-w-md mx-auto pb-24 px-4">
      {/* 헤더 */}
      <header className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">서핑 가이드</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          초보 서퍼가 바다에 나가기 전에 꼭 알아야 할 것들
        </p>
      </header>

      {/* 카테고리 선택 — 4칸 그리드 카드 */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              className={`py-3 rounded-xl text-center border-2 transition-all ${
                isActive
                  ? 'scale-[1.02] shadow-md'
                  : 'border-border opacity-60 hover:opacity-80'
              }`}
              style={isActive ? {
                borderColor: cat.color,
                backgroundColor: `${cat.color}10`,
              } : {}}
            >
              <Icon
                className="w-5 h-5 mx-auto mb-1"
                style={isActive ? { color: cat.color } : {}}
              />
              <span
                className="text-[11px] font-bold block"
                style={isActive ? { color: cat.color } : {}}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 카테고리 설명 */}
      <div className="flex items-center gap-2 mb-3">
        <activeCat.icon className="w-4 h-4" style={{ color: activeCat.color }} />
        <h2 className="text-sm font-semibold">{activeCat.label}</h2>
        <span className="text-xs text-muted-foreground">— {activeCat.desc}</span>
      </div>

      {/* 가이드 항목 목록 — 아코디언 */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div
              key={idx}
              className={`bg-card border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'border-primary/30 shadow-md' : 'border-border'
              }`}
            >
              {/* 아코디언 헤더 — 클릭하면 펼침/접힘 */}
              <button
                onClick={() => toggleItem(idx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                {/* 아이콘 */}
                <span className="text-lg shrink-0">{item.icon || '📖'}</span>
                {/* 제목 */}
                <span className="flex-1 text-sm font-medium">{item.title}</span>
                {/* 화살표 */}
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>

              {/* 아코디언 내용 — 펼쳐졌을 때만 표시 */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1">안전한 서핑을 위해</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              처음엔 반드시 서핑 레슨을 받는 것을 추천해요. 이 가이드는 참고용이며, 실제 바다에서는 현장 상황에 따라 판단하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
