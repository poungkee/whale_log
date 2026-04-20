/**
 * @file Login.tsx
 * @description 로그인 화면 - 이메일/비밀번호 입력 + Google/Kakao 소셜 로그인
 *
 * API 호출:
 * - POST /api/v1/auth/login → 이메일/비밀번호 로그인
 * - POST /api/v1/auth/google → Google ID 토큰으로 소셜 로그인
 *
 * Google 로그인 흐름:
 * 1. Google GIS SDK 초기화 (useEffect)
 * 2. 버튼 클릭 → google.accounts.id.prompt() 호출
 * 3. 사용자 인증 → credential(ID 토큰) 획득
 * 4. POST /api/v1/auth/google 호출 → JWT 발급
 *
 * Kakao 로그인 흐름:
 * 1. Kakao SDK 초기화 (useEffect)
 * 2. 버튼 클릭 → Kakao.Auth.authorize() 호출
 * 3. Kakao 로그인 페이지로 리다이렉트
 * 4. 로그인 후 redirectUri로 ?code=xxx와 함께 돌아옴
 * 5. App.tsx에서 code를 감지하여 POST /api/v1/auth/kakao/callback 호출
 */

import { ArrowLeft, AtSign, Lock, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { AuthResponse } from '../types';
import { api } from '../lib/api';

interface LoginProps {
  /** 뒤로 가기 (welcome 화면으로) */
  onBack: () => void;
  /** 로그인 성공 시 호출 - AuthResponse를 App.tsx로 전달 */
  onAuthSuccess: (data: AuthResponse) => void;
  /** 회원가입 화면으로 이동 */
  onGoRegister: () => void;
  /** 비밀번호 찾기 화면으로 이동 */
  onGoForgotPassword: () => void;
}

export function Login({ onBack, onAuthSuccess, onGoRegister, onGoForgotPassword }: LoginProps) {
  /** 아이디 입력값 */
  const [username, setUsername] = useState('');
  /** 비밀번호 입력값 */
  const [password, setPassword] = useState('');
  /** 비밀번호 보기/숨기기 토글 */
  const [showPassword, setShowPassword] = useState(false);
  /** 로그인 상태 유지 체크박스 (현재 미사용 - 추후 구현 예정) */
  const [rememberMe, setRememberMe] = useState(false);
  /** API 호출 중 로딩 상태 - 버튼 비활성화에 사용 */
  const [isLoading, setIsLoading] = useState(false);
  /** 소셜 로그인 로딩 상태 - 소셜 버튼 비활성화에 사용 */
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  /** 에러 메시지 - API 실패 시 화면에 표시 */
  const [error, setError] = useState<string | null>(null);
  /** Google 로그인 버튼을 렌더링할 컨테이너 ref */
  const googleButtonRef = useRef<HTMLDivElement>(null);
  /** Google GIS SDK 초기화 완료 여부 */
  const googleInitialized = useRef(false);

  /**
   * Google 로그인 성공 콜백
   * Google GIS에서 credential(ID 토큰)을 받아 백엔드로 전달
   * useCallback으로 감싸서 useEffect 의존성 안정화
   */
  const handleGoogleCallback = useCallback(async (response: GoogleCredentialResponse) => {
    setError(null);
    setIsSocialLoading(true);

    try {
      /** 백엔드 Google 소셜 로그인 API 호출 */
      const res = await fetch(api('/api/v1/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Google 로그인에 실패했습니다.');
        return;
      }

      /** 로그인 성공 - AuthResponse(JWT 토큰 + 사용자 정보) 수신 */
      const authData: AuthResponse = await res.json();
      onAuthSuccess(authData);
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setIsSocialLoading(false);
    }
  }, [onAuthSuccess]);

  /**
   * Google GIS SDK 초기화 + 버튼 렌더링
   * - prompt() 대신 renderButton() 사용 (localhost에서 안정적)
   * - Google 공식 버튼을 숨겨진 div에 렌더링하고, 커스텀 버튼 클릭 시 Google 버튼 클릭 전달
   */
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    /** 환경변수가 설정되지 않았으면 초기화 건너뜀 */
    if (!googleClientId || googleClientId === '여기에_구글_클라이언트_ID') return;

    /** Google GIS SDK가 로드될 때까지 100ms 간격으로 확인 */
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id && googleButtonRef.current) {
        if (!googleInitialized.current) {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
          });
          /** 숨겨진 컨테이너에 Google 공식 버튼 렌더링 */
          google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            size: 'large',
            width: 400,
          });
          googleInitialized.current = true;
        }
        clearInterval(interval);
      }
    }, 100);

    /** 5초 후에도 로드 안 되면 폴링 중단 */
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [handleGoogleCallback]);

  /**
   * Kakao SDK 초기화
   * - 페이지 로드 시 Kakao.init() 호출 (JavaScript 키 사용)
   * - 이미 초기화된 경우 건너뜀
   */
  useEffect(() => {
    const kakaoJsKey = import.meta.env.VITE_KAKAO_JS_KEY;
    /** 환경변수가 설정되지 않았으면 초기화 건너뜀 */
    if (!kakaoJsKey || kakaoJsKey === '여기에_카카오_자바스크립트_키') return;

    /** Kakao SDK가 로드될 때까지 100ms 간격으로 확인 */
    const interval = setInterval(() => {
      if (typeof Kakao !== 'undefined') {
        if (!Kakao.isInitialized()) {
          Kakao.init(kakaoJsKey);
        }
        clearInterval(interval);
      }
    }, 100);

    /** 5초 후에도 로드 안 되면 폴링 중단 */
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  /**
   * Google 로그인 버튼 클릭 핸들러
   * 숨겨진 Google 공식 버튼의 클릭 이벤트를 프로그래밍 방식으로 전달
   */
  const handleGoogleLogin = () => {
    setError(null);
    /** 숨겨진 Google 버튼 컨테이너 안의 실제 버튼 요소를 찾아서 클릭 */
    const googleBtn = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    } else {
      setError('Google 로그인을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  /**
   * Kakao 로그인 버튼 클릭 핸들러
   * REST API 키로 직접 카카오 인증 페이지 리다이렉트 (SDK 미사용)
   * authorize와 token exchange에서 동일한 REST API 키 사용하여 KOE010 방지
   * 로그인 후 redirectUri로 ?code=xxx 파라미터와 함께 돌아옴
   */
  const handleKakaoLogin = () => {
    setError(null);

    /** REST API 키 - 백엔드 토큰 교환에서도 동일한 키 사용 */
    const kakaoRestApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
    if (!kakaoRestApiKey) {
      setError('카카오 로그인 설정이 완료되지 않았습니다.');
      return;
    }

    /** 카카오 인증 페이지로 직접 리다이렉트 - REST API 키를 client_id로 사용 */
    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoRestApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  /**
   * 로그인 폼 제출 처리
   * 1. 이메일/비밀번호를 POST /api/v1/auth/login으로 전송
   * 2. 성공 시 AuthResponse(토큰 + 사용자정보)를 부모 컴포넌트로 전달
   * 3. 실패 시 에러 메시지 표시
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      /** 로그인 API 호출 - 아이디와 비밀번호 전송 */
      const res = await fetch(api('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        /** API 에러 응답 처리 - 백엔드에서 보낸 한국어 메시지 표시 */
        const data = await res.json().catch(() => null);
        setError(data?.message || '로그인에 실패했습니다.');
        return;
      }

      /**
       * 로그인 성공 - AuthResponse 수신
       * { accessToken: "eyJ...", user: { id, email, nickname, surfLevel, ... } }
       */
      const authData: AuthResponse = await res.json();
      onAuthSuccess(authData);
    } catch {
      /** 네트워크 에러 - 서버 미실행 또는 연결 불가 */
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* 바깥 배경 — 어두운 오션 그라데이션 */
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8"
      style={{
        background: 'linear-gradient(160deg, #071E2F 0%, #0A3352 40%, #0D4A6B 65%, #071E2F 100%)',
      }}
    >
      {/* 배경 파도 장식 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, rgba(42,175,198,0.12) 0%, transparent 70%)' }}
        />
        <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1440 80" preserveAspectRatio="xMidYMid slice">
          <path fill="#2AAFC6" d="M0,40L48,45C96,50,192,60,288,56C384,52,480,36,576,32C672,28,768,36,864,40C960,44,1056,44,1152,40C1248,36,1344,28,1392,24L1440,20L1440,80L0,80Z"/>
        </svg>
      </div>

      {/* 뒤로 가기 버튼 */}
      <button
        onClick={onBack}
        className="absolute top-5 left-4 p-2 rounded-xl transition-colors z-10"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#80CBC4' }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* 크림 플로팅 카드 */}
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
        style={{ background: '#FBF8F3' }}
      >
        {/* 카드 상단 — 틸 그라데이션 헤더 */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{
            background: 'linear-gradient(160deg, #1A8FA8 0%, #2AAFC6 100%)',
          }}
        >
          {/* 로고 */}
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto">
              <img
                src="/logo.png"
                alt="Whale Log"
                className="w-14 h-14 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div
              className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: '#E8744A', color: '#fff', letterSpacing: '0.05em' }}
            >
              EST 2026
            </div>
          </div>
          <h1 className="text-2xl font-bold italic text-white mb-0.5">Whale Log</h1>
          <p className="text-sm text-white/75">나만의 서핑 코치</p>
        </div>

        {/* 폼 영역 */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* 아이디 입력 */}
            <div>
              <label htmlFor="username" className="block mb-1.5 text-sm font-medium text-[#1a2332]">
                아이디
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors text-[#1a2332] placeholder:text-[#a09880]"
                  style={{
                    background: '#EDE8DC',
                    border: '1.5px solid transparent',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                  onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-[#1a2332]">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition-colors text-[#1a2332] placeholder:text-[#a09880]"
                  style={{
                    background: '#EDE8DC',
                    border: '1.5px solid transparent',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                  onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6355] hover:text-[#1a2332] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 로그인 상태 유지 + 비밀번호 찾기 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#2AAFC6]"
                />
                <span className="text-xs text-[#6b6355]">로그인 상태 유지</span>
              </label>
              <button
                type="button"
                onClick={onGoForgotPassword}
                className="text-xs font-medium"
                style={{ color: '#2AAFC6' }}
              >
                비밀번호 찾기
              </button>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading || isSocialLoading}
              className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #1A8FA8 0%, #2AAFC6 100%)',
                boxShadow: '0 4px 16px rgba(42,175,198,0.3)',
              }}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>

            {/* 구분선 */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#CFC9BC]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 text-[#9a9082]" style={{ background: '#FBF8F3' }}>또는</span>
              </div>
            </div>

            {/* 소셜 로그인 버튼 */}
            <div className="space-y-2.5">
              <div ref={googleButtonRef} className="hidden" />
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isSocialLoading}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #CFC9BC',
                  color: '#1a2332',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isSocialLoading ? '로그인 중...' : 'Google로 계속하기'}
              </button>
              {/* Kakao */}
              <button
                type="button"
                onClick={handleKakaoLogin}
                disabled={isLoading || isSocialLoading}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
                style={{ background: '#FEE500', color: '#191919' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#191919" d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.042 5.882l-.992 3.657c-.075.275.223.5.467.353L9.6 17.603c.78.13 1.58.197 2.4.197 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
                </svg>
                카카오로 계속하기
              </button>
            </div>

            {/* 회원가입 링크 */}
            <div className="text-center pt-1 pb-1">
              <span className="text-xs text-[#9a9082]">계정이 없으신가요? </span>
              <button
                type="button"
                onClick={onGoRegister}
                className="text-xs font-semibold"
                style={{ color: '#2AAFC6' }}
              >
                회원가입
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
