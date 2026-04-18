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
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A]">
      {/* 상단 헤더 - 뒤로 가기 버튼 */}
      <header className="px-4 py-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="max-w-md mx-auto px-6 py-4 page-transition">
        {/* Whale Log 로고 + 환영 메시지 */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Whale Log" className="w-20 h-20 mx-auto mb-4 rounded-full shadow-xl shadow-primary/20" />
          <h1 className="text-3xl font-bold mb-2">환영합니다!</h1>
          <p className="text-muted-foreground">Whale Log에 로그인하세요</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 에러 메시지 영역 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          {/* 아이디 입력 필드 */}
          <div>
            <label htmlFor="username" className="block mb-2 text-sm font-medium">
              아이디
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          {/* 비밀번호 입력 필드 */}
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full pl-11 pr-12 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
              {/* 비밀번호 보기/숨기기 토글 버튼 */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                className="w-4 h-4 rounded border-border bg-card accent-primary"
              />
              <span className="text-sm">로그인 상태 유지</span>
            </label>
            <button type="button" onClick={onGoForgotPassword} className="text-sm text-primary hover:underline">
              비밀번호 찾기
            </button>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading || isSocialLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A2332] text-muted-foreground">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-3">
            {/* Google GIS renderButton 숨김 컨테이너 - 커스텀 버튼 클릭 시 여기로 전달 */}
            <div ref={googleButtonRef} className="hidden" />
            {/* Google 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isSocialLoading}
              className="w-full py-3 bg-card border border-border rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isSocialLoading ? '로그인 중...' : 'Google로 계속하기'}</span>
            </button>
            {/* Kakao 로그인 버튼 */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isLoading || isSocialLoading}
              className="w-full py-3 bg-[#FEE500] text-[#191919] border border-[#FEE500] rounded-lg hover:bg-[#FEE500]/90 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#191919" d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.042 5.882l-.992 3.657c-.075.275.223.5.467.353L9.6 17.603c.78.13 1.58.197 2.4.197 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
              </svg>
              <span>카카오로 계속하기</span>
            </button>
          </div>

          {/* 회원가입 링크 */}
          <div className="text-center pt-2">
            <span className="text-sm text-muted-foreground">계정이 없으신가요? </span>
            <button
              type="button"
              onClick={onGoRegister}
              className="text-sm text-primary hover:underline font-medium"
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
