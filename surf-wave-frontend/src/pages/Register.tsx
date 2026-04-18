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
import { useState } from 'react';
import type { AuthResponse } from '../types';
import { api } from '../lib/api';

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
  /** 필드별 에러 메시지 */
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A]">
      <header className="px-4 py-6">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="max-w-md mx-auto px-6 py-4 page-transition">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Whale Log" className="w-20 h-20 mx-auto mb-4 rounded-full shadow-xl shadow-primary/20" />
          <h1 className="text-3xl font-bold mb-2">회원가입</h1>
          <p className="text-muted-foreground">Whale Log와 함께 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 아이디 입력 + 중복 확인 */}
          <div>
            <label htmlFor="username" className="block mb-2 text-sm font-medium">
              아이디
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="4~20자, 영문/숫자/_"
                  className="w-full pl-11 pr-10 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  required
                />
                {/* 중복 확인 결과 아이콘 */}
                {usernameAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {usernameAvailable === false && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                )}
              </div>
              {/* 중복 확인 버튼 */}
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={isCheckingUsername || !username.trim()}
                className="px-4 py-3 bg-secondary border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isCheckingUsername ? '확인 중...' : '중복 확인'}
              </button>
            </div>
            {errors.username && <p className="text-sm text-destructive mt-1">{errors.username}</p>}
            {usernameAvailable === true && (
              <p className="text-sm text-green-500 mt-1">사용 가능한 아이디입니다</p>
            )}
          </div>

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
              이메일 <span className="text-muted-foreground text-xs">(비밀번호 찾기용)</span>
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
                placeholder="비밀번호 (8자 이상, 영문+숫자)"
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

          {/* 비밀번호 확인 */}
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
