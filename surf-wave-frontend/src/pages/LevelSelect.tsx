/**
 * @file LevelSelect.tsx
 * @description 온보딩 화면 - 서핑 레벨 + 보드 타입 선택 (2단계)
 *
 * 회원가입 직후 또는 boardType이 'UNSET'인 경우 표시됩니다.
 *
 * 2단계 흐름:
 * 1단계: surfLevel이 없으면 → 레벨 선택 (초급/중급/상급/전문가)
 * 2단계: boardType이 'UNSET'이면 → 보드 타입 선택 (롱보드/미드렝스/숏보드)
 *
 * 레벨이 이미 있으면 보드 선택만 표시됩니다.
 * 완료 시 onComplete 호출 → App.tsx에서 서버 저장 + 메인 화면 전환
 */

import { useState } from 'react';
import type { SurfLevel, BoardType } from '../types';

interface LevelSelectProps {
  /** 이미 설정된 서핑 레벨 (있으면 레벨 단계 건너뜀) */
  existingLevel?: SurfLevel | null;
  /** 온보딩 완료 시 호출 - 레벨과 보드 타입을 함께 전달 */
  onComplete: (level: SurfLevel, boardType: BoardType) => void;
}

/** 서핑 레벨 카드 데이터 - 각 레벨별 이모지, 한국어 제목/부제/설명, 테마 색상 */
const levels: { level: SurfLevel; emoji: string; title: string; subtitle: string; description: string; color: string }[] = [
  {
    level: 'BEGINNER',
    emoji: '🌊',
    title: '초급',
    subtitle: '처음 시작해요',
    description: '인스트럭터가 밀어주는 파도를 타고 있어요. 안전하고 잔잔한 비치가 좋아요.',
    color: '#32CD32',
  },
  {
    level: 'INTERMEDIATE',
    emoji: '🏄',
    title: '중급',
    subtitle: '혼자 파도를 잡아요',
    description: '스스로 패들링해서 파도를 잡고 테이크오프할 수 있어요.',
    color: '#008CBA',
  },
  {
    level: 'ADVANCED',
    emoji: '🏄‍♂️',
    title: '상급',
    subtitle: '자유롭게 타요',
    description: '원하는 파도를 골라 탈 수 있고 다양한 기술을 구사해요.',
    color: '#FF8C00',
  },
  {
    level: 'EXPERT',
    emoji: '🔥',
    title: '전문가',
    subtitle: '프로 수준이에요',
    description: '오버헤드 이상 파도도 소화하며 모든 컨디션에서 서핑이 가능해요.',
    color: '#FF4444',
  },
];

/** 보드 타입 카드 데이터 — 8종류 (백엔드 BoardType enum 통일) */
const boards: { type: BoardType; emoji: string; title: string; subtitle: string; description: string; color: string }[] = [
  {
    type: 'LONGBOARD',
    emoji: '🏄',
    title: '롱보드',
    subtitle: '9ft+',
    description: '안정적이고 작은 파도에서도 잘 타요. 여유로운 크루징.',
    color: '#32CD32',
  },
  {
    type: 'FUNBOARD',
    emoji: '🛹',
    title: '펀보드',
    subtitle: '7~8ft',
    description: '롱보드의 안정성 + 숏보드의 기동성. 입문자에게 인기.',
    color: '#008CBA',
  },
  {
    type: 'MIDLENGTH',
    emoji: '🏄‍♂️',
    title: '미드렝스',
    subtitle: '6.6~8ft',
    description: '범용적인 중간 사이즈. 다양한 파도에서 활용 가능.',
    color: '#6366F1',
  },
  {
    type: 'FISH',
    emoji: '🐟',
    title: '피쉬',
    subtitle: '5.2~6.2ft',
    description: '넓고 짧은 보드. 작은 파도에서 속도가 잘 나요.',
    color: '#EC4899',
  },
  {
    type: 'SHORTBOARD',
    emoji: '🏄‍♀️',
    title: '숏보드',
    subtitle: '~6.4ft',
    description: '날카로운 턴과 에어. 파워풀한 파도에서 진가 발휘.',
    color: '#FF8C00',
  },
  {
    type: 'SUP',
    emoji: '🚣',
    title: 'SUP',
    subtitle: '스탠드업 패들',
    description: '패들로 서서 타는 보드. 평수에서도 즐길 수 있어요.',
    color: '#14B8A6',
  },
  {
    type: 'BODYBOARD',
    emoji: '🤸',
    title: '바디보드',
    subtitle: '엎드려 타기',
    description: '엎드려서 파도를 타요. 입문이 쉽고 재미있어요.',
    color: '#8B5CF6',
  },
  {
    type: 'FOIL',
    emoji: '🪁',
    title: '포일',
    subtitle: '수중익 보드',
    description: '수중익으로 물 위를 나는 듯이. 상급자용.',
    color: '#0EA5E9',
  },
];

export function LevelSelect({ existingLevel, onComplete }: LevelSelectProps) {
  /** 현재 온보딩 단계: 'level' 또는 'board' */
  const [step, setStep] = useState<'level' | 'board'>(
    existingLevel ? 'board' : 'level'
  );
  /** 선택된 서핑 레벨 (1단계에서 선택 또는 기존 값) */
  const [selectedLevel, setSelectedLevel] = useState<SurfLevel | null>(
    existingLevel || null
  );

  /** 레벨 선택 시 → 보드 선택 단계로 전환 */
  const handleLevelSelect = (level: SurfLevel) => {
    setSelectedLevel(level);
    setStep('board');
  };

  /** 보드 선택 시 → 온보딩 완료 */
  const handleBoardSelect = (boardType: BoardType) => {
    const level = selectedLevel || 'BEGINNER';
    onComplete(level, boardType);
  };

  // ===== 1단계: 레벨 선택 화면 =====
  if (step === 'level') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] flex flex-col">
        <div className="flex-1 flex flex-col items-center px-6 py-12 page-transition">
          {/* 진행 표시 - 1/2 단계 */}
          <div className="flex gap-2 mb-8">
            <div className="w-8 h-1.5 rounded-full bg-primary" />
            <div className="w-8 h-1.5 rounded-full bg-muted" />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-3">서핑 레벨을 알려주세요</h1>
            <p className="text-muted-foreground">
              레벨에 맞는 스팟과 정보를 추천해드려요
            </p>
          </div>

          {/* 레벨 카드 목록 */}
          <div className="w-full max-w-md space-y-4">
            {levels.map((item) => (
              <button
                key={item.level}
                onClick={() => handleLevelSelect(item.level)}
                className="w-full text-left bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-primary transition-all active:scale-[0.98] group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    {item.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold" style={{ color: item.color }}>
                        {item.title}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {item.subtitle}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition-colors mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 건너뛰기 - 레벨 + 보드 모두 기본값으로 설정 */}
          <button
            onClick={() => onComplete('BEGINNER', 'UNSET')}
            className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            나중에 선택할게요
          </button>
        </div>
      </div>
    );
  }

  // ===== 2단계: 보드 타입 선택 화면 =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 py-12 page-transition">
        {/* 진행 표시 - 2/2 단계 (기존 레벨이 있으면 숨김) */}
        {!existingLevel && (
          <div className="flex gap-2 mb-8">
            <div className="w-8 h-1.5 rounded-full bg-primary" />
            <div className="w-8 h-1.5 rounded-full bg-primary" />
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">어떤 보드를 타세요?</h1>
          <p className="text-muted-foreground">
            보드에 맞는 파도 컨디션을 추천해드려요
          </p>
        </div>

        {/* 보드 타입 카드 목록 */}
        <div className="w-full max-w-md space-y-4">
          {boards.map((item) => (
            <button
              key={item.type}
              onClick={() => handleBoardSelect(item.type)}
              className="w-full text-left bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:border-primary transition-all active:scale-[0.98] group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  {item.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold" style={{ color: item.color }}>
                      {item.title}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 건너뛰기 또는 뒤로가기 */}
        <div className="flex gap-6 mt-8">
          {!existingLevel && (
            <button
              onClick={() => setStep('level')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              이전으로
            </button>
          )}
          <button
            onClick={() => handleBoardSelect('UNSET')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            나중에 선택할게요
          </button>
        </div>
      </div>
    </div>
  );
}
