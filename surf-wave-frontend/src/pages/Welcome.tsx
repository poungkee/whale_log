/**
 * @file Welcome.tsx
 * @description 시작 화면 — Whale Log 앱 소개 + 로그인/회원가입 진입점
 *
 * 로고 + 슬로건 + 주요 기능 3개 소개 + CTA 버튼
 * 밝은 바다색 그라데이션 배경 (로고 컬러와 통일)
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
    <div className="min-h-screen bg-gradient-to-b from-[#0F2535] via-[#1A3345] to-[#0F2535] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* 로고 + 앱 이름 + 슬로건 */}
        <div className="text-center mb-12 page-transition">
          {/* Whale Log 로고 이미지 */}
          <img
            src="/logo.png"
            alt="Whale Log"
            className="w-28 h-28 mx-auto mb-5 rounded-full shadow-2xl shadow-primary/20"
          />
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#3CC4DB] to-[#2AAFC6] bg-clip-text text-transparent">
            Whale Log
          </h1>
          <p className="text-base text-[#8BB5C9]">
            나만의 서핑 코치
          </p>
        </div>

        {/* 주요 기능 소개 3가지 */}
        <div className="w-full max-w-md space-y-3 mb-12">
          {/* 1. 맞춤 파도 추천 */}
          <div className="flex items-center gap-4 bg-[#1A3345]/80 backdrop-blur-sm rounded-xl p-4 border border-[#3CC4DB]/10">
            <div className="w-11 h-11 bg-[#3CC4DB]/15 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#3CC4DB]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5 text-[#E8F4F8]">나에게 맞는 파도 추천</h3>
              <p className="text-xs text-[#8BB5C9]">레벨과 보드에 딱 맞는 스팟을 찾아드려요</p>
            </div>
          </div>

          {/* 2. 서핑 가이드 */}
          <div className="flex items-center gap-4 bg-[#1A3345]/80 backdrop-blur-sm rounded-xl p-4 border border-[#FF8C42]/10">
            <div className="w-11 h-11 bg-[#FF8C42]/15 rounded-full flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#FF8C42]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5 text-[#E8F4F8]">초보 서핑 가이드</h3>
              <p className="text-xs text-[#8BB5C9]">바다 규칙부터 자세 연습까지</p>
            </div>
          </div>

          {/* 3. 스팟 탐색 + 기록 */}
          <div className="flex items-center gap-4 bg-[#1A3345]/80 backdrop-blur-sm rounded-xl p-4 border border-[#34C759]/10">
            <div className="w-11 h-11 bg-[#34C759]/15 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-[#34C759]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5 text-[#E8F4F8]">서핑 기록 & 성장</h3>
              <p className="text-xs text-[#8BB5C9]">다이어리로 내 서핑 여정을 기록하세요</p>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={onLoginClick}
            className="w-full py-4 bg-gradient-to-r from-[#2AAFC6] to-[#3CC4DB] text-white rounded-xl font-semibold
                       hover:shadow-lg hover:shadow-[#2AAFC6]/30 transition-all active:scale-[0.98]"
          >
            로그인
          </button>
          <button
            onClick={onRegisterClick}
            className="w-full py-4 bg-transparent border-2 border-[#3CC4DB]/40 text-[#3CC4DB] rounded-xl font-semibold
                       hover:bg-[#3CC4DB]/10 transition-all active:scale-[0.98]"
          >
            회원가입
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-[#6B8A99]">
          <p>&copy; 2026 Whale Log. All rights reserved.</p>
        </div>
      </div>

      {/* 장식 파도 SVG */}
      <div className="absolute bottom-0 left-0 right-0 opacity-5 pointer-events-none">
        <svg viewBox="0 0 1440 120" className="w-full text-[#3CC4DB]">
          <path
            fill="currentColor"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </div>
  );
}
