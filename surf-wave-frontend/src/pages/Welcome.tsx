/**
 * @file Welcome.tsx
 * @description 시작 화면 - 앱 소개 + 로그인/회원가입 진입점
 *
 * 앱을 처음 실행하거나 로그아웃 후 표시되는 화면입니다.
 * 주요 기능 소개 (실시간 파도 예보, 서퍼 커뮤니티, 스팟 탐색) +
 * 로그인/회원가입 버튼을 제공합니다.
 *
 * 화면 전환 흐름:
 * - 로그인 버튼 → Login 화면 (App.tsx에서 screen='login'으로 전환)
 * - 회원가입 버튼 → Register 화면 (App.tsx에서 screen='register'로 전환)
 */

import { TrendingUp, Users, MapPin } from 'lucide-react';

interface WelcomeProps {
  /** 로그인 버튼 클릭 → App.tsx에서 setScreen('login') 호출 */
  onLoginClick: () => void;
  /** 회원가입 버튼 클릭 → App.tsx에서 setScreen('register') 호출 */
  onRegisterClick: () => void;
}

export function Welcome({ onLoginClick, onRegisterClick }: WelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-12 page-transition">
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-6xl">🏄</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            서핑 파도
          </h1>
          <p className="text-lg text-muted-foreground">
            완벽한 파도를 찾아서
          </p>
        </div>

        {/* Features */}
        <div className="w-full max-w-md space-y-4 mb-12">
          <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">실시간 파도 예보</h3>
              <p className="text-sm text-muted-foreground">시간대별 상세한 파도 정보</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">서퍼 커뮤니티</h3>
              <p className="text-sm text-muted-foreground">생생한 현장 정보 공유</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="w-12 h-12 bg-[#32CD32]/20 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-[#32CD32]" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">스팟 탐색</h3>
              <p className="text-sm text-muted-foreground">전국 서핑 스팟 정보</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={onLoginClick}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            로그인
          </button>
          <button
            onClick={onRegisterClick}
            className="w-full py-4 bg-transparent border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-all active:scale-[0.98]"
          >
            회원가입
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 서핑 파도. All rights reserved.</p>
        </div>
      </div>

      {/* Decorative waves */}
      <div className="absolute bottom-0 left-0 right-0 opacity-10 pointer-events-none">
        <svg viewBox="0 0 1440 120" className="w-full">
          <path
            fill="currentColor"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </div>
  );
}
