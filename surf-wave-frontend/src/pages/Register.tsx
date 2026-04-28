/**
 * @file Register.tsx
 * @description 회원가입 화면 - 아이디/닉네임/이메일/비밀번호 입력
 *
 * API 호출:
 * - POST /api/v1/auth/check-username → 아이디 중복 확인
 * - POST /api/v1/auth/register → 회원가입
 *
 * 요청 Body: { username, email, password, nickname }
 */

import { ArrowLeft, AtSign, Mail, Lock, Eye, EyeOff, User, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { AuthResponse } from '../types';
import { api } from '../lib/api';

declare const google: any;
declare const Kakao: any;
interface GoogleCredentialResponse { credential: string; }

interface RegisterProps {
  onBack: () => void;
  onAuthSuccess: (data: AuthResponse) => void;
  onGoLogin: () => void;
}

export function Register({ onBack, onAuthSuccess, onGoLogin }: RegisterProps) {
  /** 아이디 입력값 */
  const [username, setUsername] = useState('');
  /** 아이디 중복 확인 상태: null=미확인, true=사용가능, false=중복 */
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  /** 아이디 중복 확인 로딩 */
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  /** 약관 동의 상태 */
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  /** 닉네임 입력값 */
  const [nickname, setNickname] = useState('');
  /** 이메일 입력값 */
  const [email, setEmail] = useState('');
  /** 비밀번호 입력값 */
  const [password, setPassword] = useState('');
  /** 비밀번호 확인 입력값 */
  const [confirmPassword, setConfirmPassword] = useState('');
  /** 비밀번호 보기/숨기기 토글 */
  const [showPassword, setShowPassword] = useState(false);
  /** API 호출 중 로딩 상태 */
  const [isLoading, setIsLoading] = useState(false);
  /** 소셜 로그인 로딩 */
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  /** 필드별 에러 메시지 */
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Google 버튼 렌더링용 ref */
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const handleGoogleCallback = useCallback(async (response: GoogleCredentialResponse) => {
    setIsSocialLoading(true);
    try {
      const res = await fetch(api('/api/v1/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) return;
      const authData: AuthResponse = await res.json();
      onAuthSuccess(authData);
    } finally {
      setIsSocialLoading(false);
    }
  }, [onAuthSuccess]);

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId === '여기에_구글_클라이언트_ID') return;
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id && googleButtonRef.current) {
        if (!googleInitialized.current) {
          google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCallback, auto_select: false });
          google.accounts.id.renderButton(googleButtonRef.current, { type: 'standard', size: 'large', width: 400 });
          googleInitialized.current = true;
        }
        clearInterval(interval);
      }
    }, 100);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [handleGoogleCallback]);

  const handleGoogleLogin = () => {
    const googleBtn = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
    if (googleBtn) googleBtn.click();
  };

  const handleKakaoLogin = () => {
    const kakaoRestApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
    if (!kakaoRestApiKey) return;
    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoRestApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  };

  /**
   * 아이디 중복 확인 버튼 클릭 핸들러
   * POST /api/v1/auth/check-username 호출
   */
  const handleCheckUsername = async () => {
    if (!username.trim()) {
      setErrors(prev => ({ ...prev, username: '아이디를 입력해주세요' }));
      return;
    }
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      setErrors(prev => ({ ...prev, username: '4~20자, 영문/숫자/언더스코어(_)만 사용 가능합니다' }));
      return;
    }

    setIsCheckingUsername(true);
    setErrors(prev => ({ ...prev, username: '' }));

    try {
      const res = await fetch(api('/api/v1/auth/check-username'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      setUsernameAvailable(data.available);
      if (!data.available) {
        setErrors(prev => ({ ...prev, username: '이미 사용 중인 아이디입니다' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, username: '중복 확인에 실패했습니다' }));
    } finally {
      setIsCheckingUsername(false);
    }
  };

  /** 아이디 변경 시 중복 확인 초기화 */
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameAvailable(null);
    setErrors(prev => ({ ...prev, username: '' }));
  };

  /** 클라이언트 사이드 유효성 검증 */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = '아이디를 입력해주세요';
    } else if (usernameAvailable === null) {
      newErrors.username = '아이디 중복 확인을 해주세요';
    } else if (usernameAvailable === false) {
      newErrors.username = '이미 사용 중인 아이디입니다';
    }

    if (nickname.trim().length < 2) {
      newErrors.nickname = '닉네임은 2자 이상이어야 합니다';
    }
    if (!email.includes('@')) {
      newErrors.email = '올바른 이메일을 입력하세요';
    }
    if (password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      newErrors.password = '비밀번호는 영문과 숫자를 모두 포함해야 합니다';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }
    if (!agreeTerms || !agreePrivacy) {
      newErrors.agree = '이용약관 및 개인정보처리방침에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** 회원가입 폼 제출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch(api('/api/v1/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, nickname }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);

        if (res.status === 409) {
          const msg = data?.message || '';
          if (msg.includes('아이디')) {
            setErrors({ username: msg });
          } else if (msg.includes('닉네임')) {
            setErrors({ nickname: msg });
          } else {
            setErrors({ email: msg });
          }
        } else {
          const message = Array.isArray(data?.message) ? data.message[0] : (data?.message || '회원가입에 실패했습니다');
          setErrors({ email: message });
        }
        return;
      }

      const authData: AuthResponse = await res.json();
      onAuthSuccess(authData);
    } catch {
      setErrors({ email: '서버에 연결할 수 없습니다' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* 바깥 배경 — 어두운 오션 그라데이션 (로그인 화면과 통일) */
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8"
      style={{
        background: 'linear-gradient(160deg, #071E2F 0%, #0A3352 40%, #0D4A6B 65%, #071E2F 100%)',
      }}
    >
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
        {/* 카드 상단 — 틸 헤더 */}
        <div
          className="px-6 pt-7 pb-5 text-center"
          style={{
            background: 'linear-gradient(160deg, #1A8FA8 0%, #2AAFC6 100%)',
          }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <img src="/logo.png" alt="Whale Log" className="w-12 h-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <h1 className="text-xl font-bold italic text-white mb-0.5">회원가입</h1>
          <p className="text-xs text-white/75">Whale Log와 함께 시작하세요</p>
        </div>

      <div className="px-6 py-5">

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 아이디 입력 + 중복 확인 */}
          <div>
            <label htmlFor="username" className="block mb-1.5 text-sm font-medium text-[#1a2332]">아이디</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="4~20자, 영문/숫자/_"
                  className="w-full pl-10 pr-9 py-3 rounded-xl text-sm text-[#1a2332] placeholder:text-[#a09880]"
                  style={{ background: '#EDE8DC', border: '1.5px solid transparent', outline: 'none' }}
                  onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                  onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                  required
                />
                {usernameAvailable === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                {usernameAvailable === false && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
              </div>
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={isCheckingUsername || !username.trim()}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap text-white"
                style={{ background: '#2AAFC6' }}
              >
                {isCheckingUsername ? '확인...' : '중복 확인'}
              </button>
            </div>
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
            {usernameAvailable === true && <p className="text-xs text-green-600 mt-1">사용 가능한 아이디입니다</p>}
          </div>

          {/* 닉네임 입력 */}
          <div>
            <label htmlFor="nickname" className="block mb-1.5 text-sm font-medium text-[#1a2332]">닉네임</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1a2332] placeholder:text-[#a09880]"
                style={{ background: '#EDE8DC', border: '1.5px solid transparent', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                required
              />
            </div>
            {errors.nickname && <p className="text-xs text-red-500 mt-1">{errors.nickname}</p>}
          </div>

          {/* 이메일 입력 */}
          <div>
            <label htmlFor="reg-email" className="block mb-1.5 text-sm font-medium text-[#1a2332]">
              이메일 <span className="text-[#9a9082] text-xs font-normal">(비밀번호 찾기용)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1a2332] placeholder:text-[#a09880]"
                style={{ background: '#EDE8DC', border: '1.5px solid transparent', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                required
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label htmlFor="reg-password" className="block mb-1.5 text-sm font-medium text-[#1a2332]">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상, 영문+숫자"
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-[#1a2332] placeholder:text-[#a09880]"
                style={{ background: '#EDE8DC', border: '1.5px solid transparent', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6355]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label htmlFor="confirm-password" className="block mb-1.5 text-sm font-medium text-[#1a2332]">비밀번호 확인</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6355]" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1a2332] placeholder:text-[#a09880]"
                style={{ background: '#EDE8DC', border: '1.5px solid transparent', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#2AAFC6')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                required
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* 약관 동의 */}
          <div className="space-y-2 pt-1">
            {/* 전체 동의 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms && agreePrivacy}
                onChange={(e) => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); }}
                className="w-4 h-4 rounded accent-[#2AAFC6]"
              />
              <span className="text-sm font-semibold text-[#1a2332]">전체 동의</span>
            </label>
            <div style={{ height: 1, background: 'rgba(160,140,110,0.2)', margin: '4px 0' }} />
            {/* 이용약관 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2AAFC6]"
              />
              <span className="text-xs text-[#4a4338] flex-1">
                <span className="text-[#E8744A] font-semibold">[필수] </span>
                이용약관 동의
              </span>
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2AAFC6] font-medium underline"
                onClick={(e) => e.stopPropagation()}
              >
                보기
              </a>
            </label>
            {/* 개인정보처리방침 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2AAFC6]"
              />
              <span className="text-xs text-[#4a4338] flex-1">
                <span className="text-[#E8744A] font-semibold">[필수] </span>
                개인정보처리방침 동의
              </span>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2AAFC6] font-medium underline"
                onClick={(e) => e.stopPropagation()}
              >
                보기
              </a>
            </label>
            {errors.agree && <p className="text-xs text-red-500">{errors.agree}</p>}
          </div>

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #1A8FA8 0%, #2AAFC6 100%)',
              boxShadow: '0 4px 16px rgba(42,175,198,0.3)',
            }}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          {/* 소셜 회원가입 구분선 */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#CFC9BC]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-[#9a9082]" style={{ background: '#FBF8F3' }}>소셜 간편 가입</span>
            </div>
          </div>

          {/* 소셜 버튼 */}
          <div className="space-y-2.5">
            <div ref={googleButtonRef} className="hidden" />
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isSocialLoading}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
              style={{ background: '#FFFFFF', border: '1.5px solid #CFC9BC', color: '#1a2332' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSocialLoading ? '처리 중...' : 'Google로 가입하기'}
            </button>
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
              카카오로 가입하기
            </button>
          </div>

          {/* 로그인 링크 */}
          <div className="text-center pt-1 pb-1">
            <span className="text-xs text-[#9a9082]">이미 계정이 있으신가요? </span>
            <button type="button" onClick={onGoLogin} className="text-xs font-semibold" style={{ color: '#2AAFC6' }}>
              로그인
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
