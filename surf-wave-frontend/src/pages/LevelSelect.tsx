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

/** 보드 타입 카드 데이터 - 각 보드별 이모지, 한국어 이름/설명, 테마 색상 */
const boards: { type: BoardType; emoji: string; title: string; subtitle: string; description: string; color: string }[] = [
  {
    type: 'LONGBOARD',
    emoji: '🏄‍♀️',
    title: '롱보드',
    subtitle: '9ft 이상',
    description: '안정적이고 작은 파도에서도 잘 타요. 여유로운 서핑 스타일.',
    color: '#32CD32',
  },
  {
    type: 'MIDLENGTH',
    emoji: '🏄',
    title: '미드렝스',
    subtitle: '6~8ft',
    description: '롱보드의 안정성과 숏보드의 기동성을 겸비한 만능 보드.',
    color: '#008CBA',
  },
  {
    type: 'SHORTBOARD',
    emoji: '🏄‍♂️',
    title: '숏보드',
    subtitle: '6ft 이하',
    description: '날카로운 턴과 에어가 가능해요. 파워풀한 파도에서 진가 발휘.',
    color: '#FF8C00',
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
