// 서핑 가이드 화면 — 5개 카테고리 아코디언 (웹앱 동일 콘텐츠)
//
// 뱃지 트래킹: 가이드는 콘텐츠가 모바일에 하드코딩이라 백엔드 guide_progress를 안 씀.
// 사용자가 항목을 펼치면 SecureStore에 ID 저장 + POST /badges/track-guide-read 호출 →
// 백엔드가 GUIDE_5/GUIDE_ALL 부여 → 인터셉터가 newBadges 자동 토스트.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Shield, BookOpen, Users, Footprints, Wrench } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { api } from '../../config/api';
import { storage } from '../../config/storage';
import { useAuthStore } from '../../stores/authStore';

// 가이드 항목 타입
interface GuideItem {
  title: string;
  icon: string;
  content: string;
}

// 가이드 카테고리 정의
const CATEGORIES = [
  { id: 'rules',  icon: Users,      label: '바다 규칙',  desc: '서핑 에티켓과 우선권', color: '#3B82F6' },
  { id: 'safety', icon: Shield,     label: '안전 상식',  desc: '위험 상황 대처법',     color: '#EF4444' },
  { id: 'terms',  icon: BookOpen,   label: '용어 사전',  desc: '파도·바람·보드 용어',  color: '#22C55E' },
  { id: 'basics', icon: Footprints, label: '기본 자세',  desc: '스탠스·팝업·패들링',  color: '#F59E0B' },
  { id: 'gear',   icon: Wrench,     label: '장비 가이드', desc: '보드·웻슈트·왁스 선택', color: '#8B5CF6' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// ===== 가이드 콘텐츠 =====

const RULES_ITEMS: GuideItem[] = [
  {
    title: '드롭인 금지 (Drop-in)', icon: '🚫',
    content: '파도의 피크에 가장 가까운 서퍼가 우선권을 가져요. 이미 누군가 파도를 타고 있을 때 같은 파도에 끼어드는 것을 "드롭인"이라 해요.\n\n• 충돌 사고의 가장 큰 원인\n• 파도 타기 전 항상 양쪽 확인\n• 누군가 이미 타고 있으면 포기!',
  },
  {
    title: '피크 우선권 (Priority)', icon: '👑',
    content: '파도의 피크(Peak)에 가장 가까운 서퍼가 우선권을 가져요.\n\n우선권 순서:\n1. 피크에 가장 가까운 사람\n2. 먼저 패들링을 시작한 사람\n3. 로컬 서퍼\n\n⚠️ A-프레임 파도에서는 양쪽 각각 1명씩 탈 수 있어요.',
  },
  {
    title: '패들 아웃 — 채널(길) 찾기', icon: '🏊',
    content: '라이딩 후 라인업으로 돌아갈 때 채널(파도가 안 부서지는 구간)을 이용하세요.\n\n• 물 색이 더 짙고 파도 거품이 없는 구간\n• 다른 서퍼들이 패들 아웃하는 경로 따르기\n• 절대 서퍼의 앞을 가로지르지 않기\n\n💡 "길이 보인다"는 말은 채널을 찾았다는 뜻!',
  },
  {
    title: '보드 잡고 있기', icon: '🏄',
    content: '파도가 올 때 보드를 놓으면 뒤에 있는 사람이 맞을 수 있어요.\n\n• 리쉬(발줄) 항상 착용\n• 파도가 덮칠 때 보드를 몸 옆으로 잡기\n• 덕다이브 또는 터틀롤로 파도 넘기\n\n💡 리쉬는 생명줄이에요. 절대 빼지 마세요!',
  },
  {
    title: '로컬 존중', icon: '🤝',
    content: '각 서핑 스팟에는 자주 오는 로컬 서퍼들이 있어요.\n\n• 인사하기 — 물에 들어갈 때 가볍게\n• 양보하기 — 파도 독점 금지\n• 쓰레기 가져가기\n\n🌊 서핑은 자연과 사람을 존중하는 스포츠예요.',
  },
  {
    title: '내 레벨에 맞는 스팟 선택', icon: '🗺️',
    content: '초급자 적합 조건:\n• 비치 브레이크(모래 바닥)\n• 파고 0.3~1.0m\n• 완만하게 부서지는 파도\n• 해류가 약한 곳\n\n⚠️ 리프 브레이크(산호/바위)는 초보 금지!',
  },
  {
    title: '해변 깃발/표지판 읽기', icon: '🚩',
    content: '해변에 꽂혀 있는 깃발은 중요한 안전 신호예요.\n\n🔴 빨간 깃발 — 수영/서핑 금지\n🟡 노란 깃발 — 주의 (조심)\n🟢 초록 깃발 — 안전\n🔴🟡 빨강+노랑 — 인명구조대 감시 구역\n⚫ 검정/흰색 체크 — 서핑/보드 전용 구역\n\n⚠️ 깃발이 없는 해변은 인명구조대가 없다는 뜻!',
  },
];

const SAFETY_ITEMS: GuideItem[] = [
  {
    title: '이안류 (Rip Current) 대처법', icon: '🌊',
    content: '이안류는 해변에서 바다 쪽으로 강하게 빠져나가는 해류예요.\n\n대처법:\n1. ❌ 절대 해변 방향으로 맞서 수영하지 않기\n2. ✅ 해변과 평행하게(옆으로) 수영\n3. 이안류 벗어난 후 대각선으로 해변 향해 수영\n4. 체력 소진 시 보드에 올라타 대기\n\n💡 이안류는 보통 폭 10~30m. 옆으로만 이동하면 벗어나요.',
  },
  {
    title: '파도 크기별 위험도', icon: '📏',
    content: '🟢 0.3~0.8m (무릎~허리): 초보 적합\n🟡 0.8~1.2m (허리~가슴): 초중급\n🟠 1.2~1.8m (가슴~머리): 중급 이상\n🔴 1.8m+ (머리 이상): 상급자 전용\n\n⚠️ 파고 수치보다 실제 파도가 더 크게 느껴져요!',
  },
  {
    title: '세트파도(귀신파도) 주의', icon: '👻',
    content: '"귀신파도"는 일정 간격으로 갑자기 오는 큰 파도 그룹이에요.\n\n• 10~20분 간격으로 3~5개 연속 도착\n• 평소 파도보다 1.5~2배 큼\n• 잔잔하다가 갑자기 와서 "귀신파도"\n\n대처법:\n• 항상 바다 쪽을 바라보고 있기\n• 큰 파도가 오면 라인업 더 바깥으로',
  },
  {
    title: '준비운동 필수', icon: '🧘',
    content: '바다 들어가기 전 10분 스트레칭:\n\n• 어깨 — 패들링에 가장 많이 사용\n• 허리 — 팝업 시 아치백 동작\n• 목 — 패들링 중 계속 들고 있어야 함\n\n추천: 팔 돌리기 → 고양이-소 자세 → 런지\n\n⚠️ 차가운 물에 갑자기 들어가면 근육 경련 위험!',
  },
  {
    title: '혼자 서핑 금지', icon: '👥',
    content: '초보자는 절대 혼자 서핑하지 마세요.\n\n• 이안류에 빠졌을 때 구조 요청 불가\n• 보드에 부딪혀 기절하면 익사 위험\n\n안전 수칙:\n• 최소 2인 이상\n• 서로 시야에 있는 거리 유지\n• 인명구조대 있는 해변 이용',
  },
  {
    title: '해파리·산호 주의', icon: '🪼',
    content: '열대 지역(발리 등)에서 특히 주의:\n\n해파리:\n• 우기(11~3월)에 발리 해변에 많음\n• 쏘이면 식초로 세척 (민물 ❌)\n• 심하면 즉시 병원\n\n산호:\n• 리프 브레이크 스팟에서 주의 (울루와투 등)\n• 서핑 부츠 착용 권장\n• 긁히면 소독 + 항생제 연고',
  },
  {
    title: '보드 부상 대처', icon: '🩹',
    content: '서핑에서 가장 흔한 부상은 보드에 맞는 것.\n\n예방법:\n• 리쉬 꼭 착용\n• 와이프아웃 시 팔로 머리 감싸기\n• 물에서 올라올 때 팔 먼저 올려서 보드 확인\n\n응급 처치:\n• 핀에 베임 → 세척 + 압박 지혈\n• 머리 부딪힘 → 즉시 물에서 나오기\n\n🏥 피가 많이 나면 즉시 119!',
  },
  {
    title: '자외선/일사병 주의', icon: '☀️',
    content: '서핑은 장시간 야외 활동이라 자외선 피해가 커요.\n\n필수 준비물:\n• 래시가드 (긴팔 추천)\n• 서핑용 선크림 (SPF50+, 워터프루프)\n• 30분마다 재도포\n\n일사병 증상:\n• 어지러움, 두통, 구역질\n• 땀이 갑자기 안 남\n\n대처: 그늘로 이동 → 시원한 물 마시기\n\n💡 한여름 11~14시는 자외선 최강 시간대!',
  },
  {
    title: '체력 관리 — 언제 나와야 할까', icon: '🔋',
    content: '물에서 나와야 할 신호:\n• 패들링할 때 팔에 힘이 안 들어감\n• 파도 넘을 때 숨이 차고 겁이 남\n• 추위로 몸이 떨림 (저체온증 초기)\n\n권장 서핑 시간:\n• 초보: 40~60분 → 휴식 → 재입수\n• 중급: 60~90분\n\n💡 "한 파도만 더" 심리가 가장 위험해요!',
  },
  {
    title: '베일 아웃 — 큰 파도에서 살아남기', icon: '🆘',
    content: '"베일 아웃"은 큰 파도에 보드를 버리고 잠수하는 생존 기술이에요.\n\n방법:\n1. 보드를 옆으로 밀어내기 (앞으로 ❌)\n2. 최대한 깊이 잠수\n3. 3~5초 기다리기\n4. 올라오기 전 리쉬 당겨 보드 위치 확인\n\n⚠️ 베일 아웃은 최후의 수단 — 덕다이브/터틀롤을 먼저 연습!',
  },
  {
    title: '커버 업 — 수면 위로 올라올 때', icon: '🛡️',
    content: '와이프아웃 후 올라올 때 보드가 바로 위에 있을 수 있어요!\n\n방법:\n1. 올라오기 전 한 팔을 머리 위로 올리기\n2. 팔로 머리+얼굴 감싸기\n3. 천천히 올라오며 보드 위치 확인\n\n왜 중요한가:\n• 파도에 밀려온 보드 핀이 머리에 맞으면 큰 부상\n• 다른 서퍼 보드가 날아올 수도 있음\n\n💡 항상 "물에서 올라올 때는 팔로 머리 감싸기"!',
  },
];

const TERMS_ITEMS: GuideItem[] = [
  {
    title: '파도 용어', icon: '🌊',
    content: '• 피크(Peak) — 파도가 가장 높이 솟는 지점\n• 라인업(Line-up) — 서퍼들이 파도 기다리는 구역\n• 세트(Set) — 연속으로 오는 파도 그룹\n• 화이트워터(Whitewater) — 파도가 부서진 흰 거품\n• 그린 웨이브 — 아직 안 부서진 깨끗한 파도\n• 클로즈아웃(Close-out) — 한꺼번에 부서지는 파도',
  },
  {
    title: '서핑 동작 용어', icon: '🏄',
    content: '• 팝업(Pop-up) — 보드 위로 올라서는 동작\n• 패들링(Paddling) — 손으로 물 저어 나아가기\n• 테이크오프(Take-off) — 파도 올라타는 순간\n• 덕다이브(Duck-dive) — 파도 아래로 잠수해 통과\n• 터틀롤(Turtle Roll) — 롱보드로 파도 넘기\n• 베일아웃(Bail-out) — 의도적으로 보드 버리고 뛰어내리기',
  },
  {
    title: '바람 용어', icon: '💨',
    content: '• 오프쇼어(Offshore) — 육지→바다 방향 바람 ✅ 서핑 최적\n• 온쇼어(Onshore) — 바다→육지 방향 바람 ❌ 파도 망침\n• 크로스쇼어(Cross-shore) — 측면 바람 (보통)\n• 글래시(Glassy) — 바람 없이 잔잔한 수면 ✅ 최고 컨디션',
  },
  {
    title: '보드 용어', icon: '🛹',
    content: '• 노즈(Nose) — 보드 앞부분\n• 테일(Tail) — 보드 뒷부분\n• 레일(Rail) — 보드 옆면\n• 덱(Deck) — 발이 올라가는 윗면\n• 핀(Fin) — 보드 밑 지느러미 (방향 제어)\n• 리쉬(Leash) — 발목과 보드 연결 줄\n• 왁스(Wax) — 미끄럼 방지용\n• 로커(Rocker) — 노즈/테일의 위로 휘어진 정도',
  },
  {
    title: '파도 종류', icon: '🏖️',
    content: '• 비치 브레이크 — 모래 바닥에서 부서지는 파도\n  ✅ 초보 추천! 넘어져도 안전 (양양, 꾸따)\n\n• 리프 브레이크 — 산호/암초 위에서 부서지는 파도\n  ⚠️ 중급 이상! 바닥이 단단 (울루와투)\n\n• 포인트 브레이크 — 돌출 지형을 따라 부서지는 파도\n  🌟 길게 탈 수 있음 (메데위)\n\n• A-프레임 — 피크에서 양쪽으로 갈라지는 파도\n  양쪽 각각 1명씩 탈 수 있음\n\n💡 초보자는 비치 브레이크에서 시작하세요!',
  },
];

const BASICS_ITEMS: GuideItem[] = [
  {
    title: '스탠스 결정하기', icon: '🦶',
    content: '서핑 스탠스는 두 가지:\n\n• 레귤러(Regular) — 왼발 앞\n• 구피(Goofy) — 오른발 앞\n\n확인 방법: 누가 등 뒤에서 살짝 밀었을 때 먼저 나가는 발이 앞발!\n\n또는 스케이트보드/스노보드 경험이 있다면 그 스탠스 그대로.',
  },
  {
    title: '팝업 (Pop-up) 마스터하기', icon: '⬆️',
    content: '팝업 순서:\n1. 보드 위에 엎드려 노즈에서 30cm 아래 손 위치\n2. 팔굽혀펴기 자세로 올라오기\n3. 동시에 뒷발 → 앞발 순서로 올라서기\n4. 발은 어깨너비, 몸은 옆으로\n\n육지에서 100번 연습 후 바다로!\n\n⚠️ 무릎으로 올라오면 안 돼요 — 양발이 동시에!',
  },
  {
    title: '패들링 자세', icon: '🤽',
    content: '올바른 패들링:\n• 보드 중앙에 몸 위치 (노즈가 살짝 들리게)\n• 머리는 들고, 등은 아치형\n• 팔꿈치 높게 들고 깊게 젓기\n• S자 모양으로 물 당기기\n\n잘못된 패들링:\n• 노즈가 물속으로 → 앞으로 이동 (너무 앞에 탄 것)\n• 테일이 물속으로 → 뒤로 이동',
  },
  {
    title: '밸런스 잡기', icon: '⚖️',
    content: '보드 위 밸런스 팁:\n\n• 시선은 항상 수평선 (발 보지 않기!)\n• 팔을 날개처럼 넓게 펴기\n• 무릎 살짝 구부리기 (스프링처럼)\n• 중심이 흔들리면 무릎을 더 굽혀서 안정\n\n💡 서핑은 균형 운동이에요. 처음엔 화이트워터에서 연습!',
  },
  {
    title: '파도 읽는 법', icon: '👀',
    content: '좋은 파도를 고르는 눈을 키우세요:\n\n관찰할 것:\n• 세트가 오는 주기 (보통 5~15분)\n• 피크 위치 (파도가 처음 부서지는 곳)\n• 파도 방향 (왼/오른 어디로 달리는지)\n• 다른 서퍼들이 어디서 타는지\n\n좋은 파도: 한꺼번에 부서지지 않는 파도 (숄더가 있음)\n\n❌ 피할 것: 클로즈아웃, 너무 빠르게 부서지는 파도\n\n💡 15분 관찰 → 패턴 파악 → 물 들어가기!',
  },
  {
    title: '와이프아웃(넘어짐) 안전하게', icon: '💥',
    content: '넘어지는 건 당연해요! 중요한 건 어떻게 넘어지느냐.\n\n올바른 넘어짐:\n1. 보드 뒤쪽/옆으로 뛰기 (앞으로 ❌)\n2. 옆으로 납작하게 입수 (얕은 곳 대비)\n3. 물 속에서 팔로 머리 감싸기\n4. 2~3초 기다린 후 올라오기\n5. 한 손 위로 올려 보드 위치 확인\n\n절대 금지:\n• 머리부터 다이빙 ❌\n• 보드 앞으로 뛰어내리기 ❌\n• 리쉬 잡고 보드 당기기 ❌',
  },
  {
    title: '덕다이브 & 터틀롤', icon: '🦆',
    content: '패들 아웃할 때 파도를 넘는 기술이에요.\n\n🦆 덕다이브 (숏보드/피쉬용):\n1. 파도 2~3m 앞에서 노즈를 양손으로 눌러 잠수\n2. 무릎/발로 테일을 밀어 보드 전체 잠수\n3. 파도가 지나가면 위로 올라오기\n\n🐢 터틀롤 (롱보드/펀보드용):\n1. 파도 직전에 보드를 뒤집어 매달리기\n2. 파도가 지나가면 다시 뒤집고 올라타기\n\n💡 롱보드는 부력이 커서 덕다이브 불가 — 터틀롤 연습!',
  },
];

const GEAR_ITEMS: GuideItem[] = [
  {
    title: '첫 보드 선택', icon: '🛹',
    content: '초보자 추천 순서:\n\n1. 소프트보드(폼보드) — 안전, 저렴, 부력 최고\n2. 롱보드 (9ft+) — 안정적, 파도 잡기 쉬움\n3. 펀보드/미드렝스 (7~8ft) — 중급 넘어갈 때\n\n⚠️ 처음부터 숏보드 사면 후회해요!\n\n보드 선택 공식: 초보 = 키+30cm 이상 길이',
  },
  {
    title: '웻슈트 가이드', icon: '🤿',
    content: '수온별 웻슈트 두께:\n\n• 수온 24°C+ (발리 등): 래쉬가드만 OK\n• 수온 20~24°C: 2mm 스프링슈트\n• 수온 16~20°C (한국 여름): 3/2mm\n• 수온 12~16°C (한국 봄/가을): 4/3mm\n• 수온 12°C 이하 (한국 겨울): 5/4mm + 부츠',
  },
  {
    title: '서프왁스 사용법', icon: '🕯️',
    content: '왁스는 보드 덱(발 올리는 면)에 바르는 미끄럼방지제예요.\n\n사용 순서:\n1. 베이스코트 먼저 원형으로 바르기\n2. 그 위에 탑코트로 범프(작은 돌기) 만들기\n3. 서핑 전 가볍게 한 번 더 덧바르기\n\n수온별 왁스 선택:\n• 차가운 물 → 소프트 왁스\n• 따뜻한 물 → 하드 왁스',
  },
  {
    title: '리쉬(발줄) 관리', icon: '🔗',
    content: '리쉬 선택:\n• 길이 = 보드 길이와 비슷하게\n• 초보/롱보드: 9~10ft 리쉬\n• 숏보드: 6~7ft 리쉬\n\n관리:\n• 사용 후 담수로 세척\n• 꼬이지 않게 보관\n• 스위블(회전 부속) 상태 확인\n\n⚠️ 끊어진 리쉬는 즉시 교체! 생명과 직결됩니다.',
  },
];

const GUIDE_CONTENT: Record<CategoryId, GuideItem[]> = {
  rules: RULES_ITEMS,
  safety: SAFETY_ITEMS,
  terms: TERMS_ITEMS,
  basics: BASICS_ITEMS,
  gear: GEAR_ITEMS,
};

// 아코디언 항목 컴포넌트 — 펼칠 때 onFirstOpen 한 번만 호출 (뱃지 트래킹용)
const AccordionItem: React.FC<{
  item: GuideItem;
  categoryColor: string;
  guideId: string;
  alreadyRead: boolean;
  onFirstOpen: (guideId: string) => void;
}> = ({ item, categoryColor, guideId, alreadyRead, onFirstOpen }) => {
  const [open, setOpen] = useState(false);
  const reportedRef = useRef(alreadyRead);
  return (
    <View style={accordionStyles.container}>
      <TouchableOpacity
        style={accordionStyles.header}
        onPress={() => {
          const next = !open;
          setOpen(next);
          /** 처음 펼친 시점에만 트래킹 호출 — 동일 항목 반복 펼침은 무시 */
          if (next && !reportedRef.current) {
            reportedRef.current = true;
            onFirstOpen(guideId);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={accordionStyles.icon}>{item.icon}</Text>
        <Text style={accordionStyles.title}>{item.title}</Text>
        {open
          ? <ChevronUp size={16} color={colors.textTertiary} />
          : <ChevronDown size={16} color={colors.textTertiary} />
        }
      </TouchableOpacity>
      {open && (
        <View style={[accordionStyles.body, { borderLeftColor: categoryColor }]}>
          <Text style={accordionStyles.content}>{item.content}</Text>
        </View>
      )}
    </View>
  );
};

const accordionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
    /** overflow:hidden 제거 — 동적 높이 계산 시 본문 일부가 잘리던 문제 해결 */
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md,
  },
  icon: { fontSize: 18 },
  title: { flex: 1, ...typography.body2, fontWeight: '600', color: colors.text },
  /**
   * body — marginLeft + borderLeft + paddingHorizontal 합쳐서 좌우 여백이 너무 커
   * 본문이 좁게 wrap되고 일부 잘려 보이던 문제 수정.
   * 좌측 컬러 바는 paddingLeft 안에 borderLeft로 흡수 (전체 너비 활용).
   */
  body: {
    paddingTop: 0,
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md + 3,
    borderLeftWidth: 3,
    marginLeft: spacing.md,
  },
  content: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
    /** 안드로이드에서 일부 텍스트가 잘리던 문제 — flexShrink:1로 부모 너비 활용 보장 */
    flexShrink: 1,
  },
});

/** 전체 가이드 항목 수 (모든 카테고리 합계) — GUIDE_ALL 뱃지 조건 산정에 사용 */
const TOTAL_GUIDE_COUNT = Object.values(GUIDE_CONTENT).reduce((sum, arr) => sum + arr.length, 0);

const GuideListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('rules');
  const category = CATEGORIES.find(c => c.id === selectedCategory)!;
  const items = GUIDE_CONTENT[selectedCategory];

  /** 사용자가 이미 펼쳐 본 가이드 ID Set (앱 재시작 시 SecureStore에서 복원) */
  const [readGuides, setReadGuides] = useState<Set<string>>(new Set());
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  /** 마운트 시 SecureStore에서 읽은 가이드 목록 복원 */
  useEffect(() => {
    storage.getReadGuides().then(ids => setReadGuides(new Set(ids))).catch(() => {});
  }, []);

  /**
   * 가이드 항목 첫 펼침 시 호출:
   *  1. SecureStore에 추가 저장 (앱 재시작해도 유지)
   *  2. 백엔드에 카운트 동기화 → newBadges 응답은 인터셉터가 토스트로 표시
   */
  const handleFirstOpen = async (guideId: string) => {
    if (!isAuthenticated) return; // 비로그인 상태는 트래킹 안 함
    setReadGuides(prev => {
      if (prev.has(guideId)) return prev;
      const next = new Set(prev);
      next.add(guideId);
      const ids = Array.from(next);
      storage.setReadGuides(ids).catch(() => {});
      /** 백엔드에 진행도 동기화 — 응답 newBadges는 axios 인터셉터가 큐에 자동 enqueue */
      api.post('/badges/track-guide-read', {
        guideReadCount: ids.length,
        totalGuideCount: TOTAL_GUIDE_COUNT,
      }).catch(() => {});
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>서핑 가이드</Text>
        <Text style={styles.subtitle}>초보 서퍼를 위한 필수 지식</Text>
      </View>

      {/* 카테고리 탭 (가로 스크롤) */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}
      >
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = cat.id === selectedCategory;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryTab, isActive && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Icon size={16} color={isActive ? cat.color : colors.textTertiary} />
              <Text style={[styles.categoryLabel, isActive && { color: cat.color, fontWeight: '700' }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 현재 카테고리 설명 */}
      <View style={[styles.categoryBanner, { backgroundColor: category.color + '10' }]}>
        <Text style={[styles.categoryBannerText, { color: category.color }]}>{category.desc}</Text>
        <Text style={styles.itemCount}>{items.length}개 항목</Text>
      </View>

      {/* 아코디언 목록 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {items.map((item, idx) => {
          /** guideId — 카테고리+인덱스 조합으로 unique 보장 */
          const guideId = `${selectedCategory}-${idx}`;
          return (
            <AccordionItem
              key={guideId}
              item={item}
              categoryColor={category.color}
              guideId={guideId}
              alreadyRead={readGuides.has(guideId)}
              onFirstOpen={handleFirstOpen}
            />
          );
        })}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text, fontWeight: '700' },
  subtitle: { ...typography.body2, color: colors.textSecondary, marginTop: 2 },

  /**
   * 카테고리 탭 가로 스크롤 — height 고정으로 layout 안정화.
   * maxHeight + flexGrow:0 만으로는 RN의 ScrollView horizontal이 자식 너비를 못 잡아
   * 첫 탭만 보이고 나머지가 짤리던 문제. height 명시 + 각 탭에 minWidth 추가.
   */
  tabsScroll: { height: 52 },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    /** flexShrink:0 + minWidth 80 — 가로 스크롤 시 자식 너비 측정 보장 */
    flexShrink: 0,
    minWidth: 80,
  },
  categoryLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },

  categoryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: spacing.lg, marginVertical: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10,
  },
  categoryBannerText: { ...typography.caption, fontWeight: '600' },
  itemCount: { ...typography.caption, color: colors.textTertiary },

  list: { paddingHorizontal: spacing.lg },
});

export default GuideListScreen;
