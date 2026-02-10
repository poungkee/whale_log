/**
 * @file Register.tsx
 * @description 회원가입 화면 - 닉네임/이메일/비밀번호 입력
 *
 * API 호출: POST /api/v1/auth/register
 * 요청 Body: { email: string, password: string, nickname: string }
 * 응답: { accessToken: JWT토큰, user: 사용자정보 }
 *
 * 클라이언트 사이드 유효성 검증:
 * - 닉네임: 2자 이상
 * - 이메일: @ 포함
 * - 비밀번호: 6자 이상
 * - 비밀번호 확인: 비밀번호와 일치
 *
 * 서버 사이드 에러:
 * - 409 Conflict: 이메일 또는 닉네임 중복 (한국어 메시지)
 * - 400 Bad Request: 유효성 검증 실패
 */

import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useState } from 'react';
import type { AuthResponse } from '../types';

interface RegisterProps {
  /** 뒤로 가기 (welcome 화면으로) */
  onBack: () => void;
  /** 회원가입 성공 시 호출 - AuthResponse를 App.tsx로 전달 */
  onAuthSuccess: (data: AuthResponse) => void;
  /** 로그인 화면으로 이동 */
  onGoLogin: () => void;
}

export function Register({ onBack, onAuthSuccess, onGoLogin }: RegisterProps) {
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
  /** 필드별 에러 메시지 - { nickname: "...", email: "...", password: "...", confirmPassword: "..." } */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 클라이언트 사이드 유효성 검증
   * 서버로 보내기 전에 기본적인 형식 확인
   *
   * @returns true면 검증 통과, false면 에러가 있음
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (nickname.trim().length < 2) {
      newErrors.nickname = '닉네임은 2자 이상이어야 합니다';
    }
    if (!email.includes('@')) {
      newErrors.email = '올바른 이메일을 입력하세요';
    }
    if (password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 회원가입 폼 제출 처리
   * 1. 클라이언트 유효성 검증
   * 2. POST /api/v1/auth/register로 데이터 전송
   * 3. 성공 시 AuthResponse를 부모 컴포넌트로 전달
   * 4. 실패 시 에러 메시지 표시 (중복 닉네임/이메일 등)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      /** 회원가입 API 호출 - 이메일, 비밀번호, 닉네임 전송 */
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname }),
      });

      if (!res.ok) {
        /** 서버 에러 응답 처리 */
        const data = await res.json().catch(() => null);

        if (res.status === 409) {
          /**
           * 409 Conflict - 중복 에러
           * 백엔드에서 한국어 메시지를 보냄:
           * - "이미 가입된 이메일입니다"
           * - "이미 사용 중인 닉네임입니다"
           */
          const msg = data?.message || '';
          if (msg.includes('닉네임')) {
            setErrors({ nickname: msg });
          } else {
            setErrors({ email: msg });
          }
        } else {
          /** 기타 에러 (400 등) - 메시지 배열일 수 있음 */
          const message = Array.isArray(data?.message) ? data.message[0] : (data?.message || '회원가입에 실패했습니다');
          setErrors({ email: message });
        }
        return;
      }

      /**
       * 회원가입 성공 - AuthResponse 수신
       * { accessToken: "eyJ...", user: { id, email, nickname, surfLevel: null, ... } }
       * surfLevel은 null → App.tsx에서 레벨 선택 화면으로 이동
       */
      const authData: AuthResponse = await res.json();
      onAuthSuccess(authData);
    } catch {
      /** 네트워크 에러 */
      setErrors({ email: '서버에 연결할 수 없습니다' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A]">
      {/* 상단 헤더 - 뒤로 가기 */}
      <header className="px-4 py-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="max-w-md mx-auto px-6 py-4 page-transition">
        {/* 로고 + 타이틀 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-xl">
            <span className="text-4xl">🏄</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">회원가입</h1>
          <p className="text-muted-foreground">서핑 파도와 함께 시작하세요</p>
        </div>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 닉네임 입력 */}
          <div>
            <label htmlFor="nickname" className="block mb-2 text-sm font-medium">
              닉네임
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            {errors.nickname && <p className="text-sm text-destructive mt-1">{errors.nickname}</p>}
          </div>

          {/* 이메일 입력 */}
          <div>
            <label htmlFor="reg-email" className="block mb-2 text-sm font-medium">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label htmlFor="reg-password" className="block mb-2 text-sm font-medium">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                className="w-full pl-11 pr-12 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
          </div>

          {/* 비밀번호 확인 입력 */}
          <div>
            <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium">
              비밀번호 확인
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          {/* 로그인 링크 */}
          <div className="text-center pt-2">
            <span className="text-sm text-muted-foreground">이미 계정이 있으신가요? </span>
            <button
              type="button"
              onClick={onGoLogin}
              className="text-sm text-primary hover:underline font-medium"
            >
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
