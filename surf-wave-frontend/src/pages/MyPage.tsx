import { Settings, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { SurfLevel } from '../types';

interface MyPageProps {
  surfLevel: SurfLevel;
  onLogout: () => void;
  onLevelChange: (level: SurfLevel) => void;
}

const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

const LEVEL_COLORS: Record<SurfLevel, string> = {
  BEGINNER: '#32CD32',
  INTERMEDIATE: '#008CBA',
  ADVANCED: '#FF8C00',
  EXPERT: '#FF4444',
};

const ALL_LEVELS: SurfLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export function MyPage({ surfLevel, onLogout, onLevelChange }: MyPageProps) {
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">마이페이지</h1>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 page-transition">
        {/* Profile */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl p-6 border border-primary/30 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl">
              🏄‍♂️
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">서퍼</h2>
              <div
                className="inline-block px-3 py-1 text-sm rounded-full font-medium"
                style={{
                  backgroundColor: `${LEVEL_COLORS[surfLevel]}20`,
                  color: LEVEL_COLORS[surfLevel],
                }}
              >
                {LEVEL_LABELS[surfLevel]}
              </div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* Level Change */}
          <button
            onClick={() => setShowLevelPicker(!showLevelPicker)}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
          >
            <span>서핑 레벨 변경</span>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: LEVEL_COLORS[surfLevel] }}>
                {LEVEL_LABELS[surfLevel]}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>

          {/* Level Picker Dropdown */}
          {showLevelPicker && (
            <div className="p-4 bg-secondary/50 space-y-2">
              {ALL_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    onLevelChange(level);
                    setShowLevelPicker(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    surfLevel === level
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium" style={{ color: LEVEL_COLORS[level] }}>
                    {LEVEL_LABELS[level]}
                  </span>
                  {surfLevel === level && (
                    <span className="text-primary text-sm">현재</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Notification */}
          <div className="flex items-center justify-between p-4">
            <span>알림 설정</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* App Info */}
          <button className="w-full text-left p-4 hover:bg-secondary transition-colors flex items-center justify-between">
            <span>앱 정보</span>
            <span className="text-sm text-muted-foreground">v1.0.0</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full text-left p-4 hover:bg-secondary transition-colors text-destructive"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
