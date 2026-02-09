import type { SurfLevel } from '../types';

interface LevelSelectProps {
  onSelect: (level: SurfLevel) => void;
}

const levels: { level: SurfLevel; emoji: string; title: string; subtitle: string; description: string; color: string }[] = [
  {
    level: 'BEGINNER',
    emoji: '🌊',
    title: '초급',
    subtitle: '처음 시작해요',
    description: '파도 잡기 연습 중이에요. 안전하고 낮은 파도가 좋아요.',
    color: '#32CD32',
  },
  {
    level: 'INTERMEDIATE',
    emoji: '🏄',
    title: '중급',
    subtitle: '기본기 있어요',
    description: '테이크오프가 가능하고 기본 라이딩을 할 수 있어요.',
    color: '#008CBA',
  },
  {
    level: 'ADVANCED',
    emoji: '🏄‍♂️',
    title: '상급',
    subtitle: '자유롭게 타요',
    description: '다양한 기술을 구사하고 큰 파도도 즐길 수 있어요.',
    color: '#FF8C00',
  },
  {
    level: 'EXPERT',
    emoji: '🔥',
    title: '전문가',
    subtitle: '프로 수준이에요',
    description: '대회 참가 레벨이며 모든 컨디션에서 서핑이 가능해요.',
    color: '#FF4444',
  },
];

export function LevelSelect({ onSelect }: LevelSelectProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 py-12 page-transition">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">서핑 레벨을 알려주세요</h1>
          <p className="text-muted-foreground">
            레벨에 맞는 스팟과 정보를 추천해드려요
          </p>
        </div>

        {/* Level Cards */}
        <div className="w-full max-w-md space-y-4">
          {levels.map((item) => (
            <button
              key={item.level}
              onClick={() => onSelect(item.level)}
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

        {/* Skip */}
        <button
          onClick={() => onSelect('BEGINNER')}
          className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          나중에 선택할게요
        </button>
      </div>
    </div>
  );
}
