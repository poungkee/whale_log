/**
 * @file Welcome.tsx
 * @description 시작 화면 — Whale Log 랜딩 페이지
 *
 * 디자인 (Stitch 기반):
 * - 배경: 실제 서핑 파도 사진 + 어두운 오버레이
 * - 로고: 파도 아이콘 원형 + "Whale Log" 이탤릭 대형 텍스트
 * - 기능 소개 3개: 반투명 다크 글래스 카드
 * - CTA: 로그인(틸 filled) + 회원가입(반투명 outline)
 */

import { TrendingUp, BookOpen, MapPin, Waves } from 'lucide-react';

interface WelcomeProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function Welcome({ onLoginClick, onRegisterClick }: WelcomeProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* 배경 파도 사진 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ocean-bg.jpg')" }}
      />
      {/* 다크 오버레이 — 사진 위에 어두운 틸 톤 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,40,55,0.72) 0%, rgba(8,30,45,0.82) 50%, rgba(5,20,35,0.88) 100%)',
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-12">

        {/* 상단: 로고 섹션 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* 파도 아이콘 원 */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{
              border: '2px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Waves className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          {/* 앱 이름 — 크고 이탤릭 */}
          <h1
            className="font-black italic mb-2 text-white leading-none"
            style={{ fontSize: 'clamp(3rem, 12vw, 3.5rem)', letterSpacing: '-0.02em' }}
          >
            Whale Log
          </h1>
          <p className="text-base font-medium" style={{ color: '#8cd0eb' }}>
            나만의 서핑 코치
          </p>
        </div>

        {/* 중간: 기능 소개 카드 3개 */}
        <div className="w-full max-w-md space-y-3 my-8">
          {/* 1. 맞춤 파도 추천 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{
              background: 'rgba(18,50,70,0.60)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#12647b' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm text-white mb-0.5">나에게 맞는 파도 추천</h3>
              <p className="text-xs" style={{ color: '#8cd0eb' }}>레벨과 보드에 딱 맞는 스팟을 찾아드려요</p>
            </div>
          </div>

          {/* 2. 서핑 다이어리 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{
              background: 'rgba(18,50,70,0.60)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#974311' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm text-white mb-0.5">서핑 다이어리</h3>
              <p className="text-xs" style={{ color: '#8cd0eb' }}>기록하면 그날 파도 차트가 자동으로 붙어요</p>
            </div>
          </div>

          {/* 3. 스팟 탐색 */}
          <div
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{
              background: 'rgba(18,50,70,0.60)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#476271' }}
            >
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm text-white mb-0.5">한국 + 발리 124 스팟</h3>
              <p className="text-xs" style={{ color: '#8cd0eb' }}>실시간 예보 + 서퍼 후기 + 파도 차트</p>
            </div>
          </div>
        </div>

        {/* 하단: CTA 버튼 */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={onLoginClick}
            className="w-full py-4 rounded-full font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #12647b 0%, #367d95 100%)',
              boxShadow: '0 4px 20px rgba(18,100,123,0.45)',
              fontSize: '1.0625rem',
            }}
          >
            로그인
          </button>
          <button
            onClick={onRegisterClick}
            className="w-full py-4 rounded-full font-bold transition-all active:scale-[0.97]"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              color: '#ffffff',
              fontSize: '1.0625rem',
            }}
          >
            회원가입
          </button>

          {/* 저작권 */}
          <p className="text-center text-xs pt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2026 WHALE LOG. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
}
