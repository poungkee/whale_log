/**
 * @file ForgotPassword.tsx
 * @description 비밀번호 찾기 화면
 *
 * Step 1: 이메일 입력 → 인증코드 발송 (POST /api/v1/auth/forgot-password)
 * Step 2: 인증코드 + 새 비밀번호 입력 → 재설정 (POST /api/v1/auth/reset-password)
 */

import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';

interface ForgotPasswordProps {
  /** 뒤로 가기 (로그인 화면으로) */
  onBack: () => void;
  /** 비밀번호 재설정 완료 후 로그인 화면으로 이동 */
  onDone: () => void;
}

export function ForgotPassword({ onBack, onDone }: ForgotPasswordProps) {
  /** 현재 단계: 1=이메일 입력, 2=인증코드+새 비밀번호 입력 */
  const [step, setStep] = useState<1 | 2>(1);

  /** 이메일 입력값 */
  const [email, setEmail] = useState('');
  /** 인증코드 입력값 (6자리) */
  const [code, setCode] = useState('');
  /** 새 비밀번호 입력값 */
  const [newPassword, setNewPassword] = useState('');
  /** 새 비밀번호 확인 */
  const [confirmPassword, setConfirmPassword] = useState('');
  /** 비밀번호 보기/숨기기 */
  const [showPassword, setShowPassword] = useState(false);

  /** 로딩 상태 */
  const [isLoading, setIsLoading] = useState(false);
  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);
  /** 성공 메시지 */
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Step 1: 이메일로 인증코드 발송
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('올바른 이메일을 입력하세요');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(api('/api/v1/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || '인증코드 발송에 실패했습니다');
        return;
      }

      /** 성공 → Step 2로 이동 */
      setSuccessMessage(data.message);
      setStep(2);
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: 인증코드 + 새 비밀번호로 재설정
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError('6자리 인증코드를 입력해주세요');
      return;
    }
    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      setError('비밀번호는 영문과 숫자를 모두 포함해야 합니다');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(api('/api/v1/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || '비밀번호 재설정에 실패했습니다');
        return;
      }

      /** 완료 → 로그인 화면으로 */
      onDone();
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #071E2F 0%, #0A3352 40%, #0D4A6B 65%, #071E2F 100%)' }}
    >
      <header className="px-4 py-5">
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#80CBC4' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* 크림 카드 */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" style={{ background: '#FBF8F3' }}>
        {/* 상단 헤더 */}
        <div className="px-6 pt-6 pb-5 text-center" style={{ background: 'linear-gradient(160deg, #1A8FA8 0%, #2AAFC6 100%)' }}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold italic text-white">비밀번호 찾기</h1>
          <p className="text-xs text-white/75 mt-1">
            {step === 1 ? '가입 시 등록한 이메일로 인증코드를 보내드릴게요' : `${email}로 발송된 인증코드를 입력해주세요`}
          </p>
        </div>

      <div className="px-6 py-6 max-w-md mx-auto page-transition">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">비밀번호 찾기</h1>
          <p className="text-muted-foreground text-sm">
            {step === 1
              ? '가입 시 등록한 이메일로 인증코드를 보내드릴게요'
              : `${email}로 발송된 인증코드를 입력해주세요`}
          </p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>1</div>
          <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>2</div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-4">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Step 1: 이메일 입력 */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="가입 시 등록한 이메일"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoading ? '발송 중...' : '인증코드 받기'}
            </button>
          </form>
        )}

        {/* Step 2: 인증코드 + 새 비밀번호 */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* 인증코드 입력 */}
            <div>
              <label htmlFor="code" className="block mb-2 text-sm font-medium">
                인증코드 <span className="text-muted-foreground text-xs">(이메일에서 확인)</span>
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6자리 숫자 입력"
                className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground text-center text-2xl tracking-widest font-bold"
                maxLength={6}
                required
              />
            </div>

            {/* 새 비밀번호 */}
            <div>
              <label htmlFor="new-password" className="block mb-2 text-sm font-medium">새 비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상, 영문+숫자"
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
            </div>

            {/* 새 비밀번호 확인 */}
            <div>
              <label htmlFor="confirm-new-password" className="block mb-2 text-sm font-medium">새 비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>

            {/* 인증코드 재발송 */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); setError(null); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                인증코드 다시 받기
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
