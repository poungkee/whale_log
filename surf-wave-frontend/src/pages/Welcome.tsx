/**
 * @file Welcome.tsx
 * @description 시작 화면 — Whale Log 랜딩 페이지
 *
 * 디자인: 어두운 오션 사진 배경 + 글래스모피즘 카드 + 틸 CTA
 * - 배경: 깊은 바다 색 그라데이션 (오션 포토 느낌)
 * - 로고: "Whale Log" 이탤릭 + 고래 이모지
 * - 기능 소개 3개: 반투명 글래스 카드
 * - CTA: 로그인(틸 filled) + 회원가입(outline)
 */

import { TrendingUp, BookOpen, MapPin } from 'lucide-react';

interface WelcomeProps {
  /** 로그인 버튼 클릭 → App.tsx에서 setScreen('login') 호출 */
  onLoginClick: () => void;
  /** 회원가입 버튼 클릭 → App.tsx에서 setScreen('register') 호출 */
  onRegisterClick: () => void;
}

export function Welcome({ onLoginClick, onRegisterClick }: WelcomeProps) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #071E2F 0%, #0A3352 30%, #0D4A6B 55%, #0A3352 75%, #071E2F 100%)',
      }}
    >
      {/* 배경 파도 질감 — SVG 오버레이 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 중앙 빛 번짐 효과 */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #2AAFC6 0%, transparent 70%)' }}
        />
        {/* 상단 잔물결 */}
        <svg
          className="absolute top-0 left-0 w-full opacity-5"
          viewBox="0 0 1440 200"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            fill="#2AAFC6"
            d="M0,96L48,85.3C96,75,192,53,288,58.7C384,64,480,96,576,101.3C672,107,768,85,864,80C960,75,1056,85,1152,90.7C1248,96,1344,96,1392,96L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          />
        </svg>
        {/* 하단 파도 */}
        <svg
          className="absolute bottom-0 left-0 w-full opacity-8"
          viewBox="0 0 1440 120"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            fill="#2AAFC6"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">

        {/* 로고 섹션 */}
        <div className="text-center mb-10">
          {/* 로고 이미지 */}
          <div className="relative inline-block mb-5">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1A8FA8 0%, #2AAFC6 60%, #3DC4DC 100%)',
                boxShadow: '0 8px 32px rgba(42,175,198,0.4)',
              }}
            >
              <img
                src="/logo.png"
                alt="Whale Log"
                className="w-20 h-20 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                }}
              />
              <span className="hidden text-4xl">🐋</span>
            </div>
            {/* EST 뱃지 */}
            <div
              className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: '#E8744A', color: '#fff', letterSpacing: '0.05em' }}
            >
              EST 2026
            </div>
          </div>

          {/* 앱 이름 */}
          <h1
            className="text-4xl font-bold italic mb-1"
            style={{ color: '#E0F7FA', letterSpacing: '-0.02em' }}
          >
            Whale Log
          </h1>
          <p className="text-sm" style={{ color: '#80CBC4' }}>
            나만의 서핑 코치
          </p>
        </div>

        {/* 기능 소개 카드 3개 — 글래스모피즘 */}
        <div className="w-full max-w-md space-y-3 mb-10">
          {/* 1. 맞춤 파도 추천 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4 border"
            style={{
              background: 'rgba(10, 45, 69, 0.65)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(42, 175, 198, 0.18)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(42, 175, 198, 0.18)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#2AAFC6' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#E0F7FA' }}>
                나에게 맞는 파도 추천
              </h3>
              <p className="text-xs" style={{ color: '#80CBC4' }}>
                레벨과 보드에 딱 맞는 스팟을 찾아드려요
              </p>
            </div>
          </div>

          {/* 2. 서핑 다이어리 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4 border"
            style={{
              background: 'rgba(10, 45, 69, 0.65)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(232, 116, 74, 0.18)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(232, 116, 74, 0.15)' }}
            >
              <BookOpen className="w-5 h-5" style={{ color: '#E8744A' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#E0F7FA' }}>
                서핑 다이어리
              </h3>
              <p className="text-xs" style={{ color: '#80CBC4' }}>
                기록하면 그날 파도 차트가 자동으로 붙어요
              </p>
            </div>
          </div>

          {/* 3. 스팟 탐색 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4 border"
            style={{
              background: 'rgba(10, 45, 69, 0.65)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 183, 77, 0.18)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255, 183, 77, 0.12)' }}
            >
              <MapPin className="w-5 h-5" style={{ color: '#FFB74D' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#E0F7FA' }}>
                한국 + 발리 124 스팟
              </h3>
              <p className="text-xs" style={{ color: '#80CBC4' }}>
                실시간 예보 + 서퍼 후기 + 파도 차트
              </p>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={onLoginClick}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #1A8FA8 0%, #2AAFC6 100%)',
              boxShadow: '0 4px 20px rgba(42,175,198,0.35)',
            }}
          >
            로그인
          </button>
          <button
            onClick={onRegisterClick}
            className="w-full py-4 rounded-2xl font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'transparent',
              border: '2px solid rgba(42, 175, 198, 0.45)',
              color: '#2AAFC6',
            }}
          >
            회원가입
          </button>
        </div>

        {/* 푸터 */}
        <div className="mt-10 text-center text-xs" style={{ color: '#3D6070' }}>
          <p>&copy; 2026 Whale Log. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
