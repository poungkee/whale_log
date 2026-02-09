import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface LoginProps {
  onBack: () => void;
  onLogin: () => void;
  onGoRegister: () => void;
}

export function Login({ onBack, onLogin, onGoRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken: email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) {
          setError('가입되지 않은 계정입니다. 회원가입을 먼저 해주세요.');
        } else {
          setError(data?.message || '로그인에 실패했습니다.');
        }
        return;
      }

      const user = await res.json();
      localStorage.setItem('user', JSON.stringify(user));
      if (user.surfLevel) {
        localStorage.setItem('surfLevel', user.surfLevel);
      }
      onLogin();
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A]">
      {/* Header */}
      <header className="px-4 py-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="max-w-md mx-auto px-6 py-4 page-transition">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-xl">
            <span className="text-4xl">🏄</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">환영합니다!</h1>
          <p className="text-muted-foreground">계정에 로그인하세요</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          {/* Password */}
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
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
            <button type="button" className="text-sm text-primary hover:underline">
              비밀번호 찾기
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A2332] text-muted-foreground">또는</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full py-3 bg-card border border-border rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 계속하기</span>
            </button>
            <button
              type="button"
              className="w-full py-3 bg-[#FEE500] text-[#191919] border border-[#FEE500] rounded-lg hover:bg-[#FEE500]/90 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#191919" d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.042 5.882l-.992 3.657c-.075.275.223.5.467.353L9.6 17.603c.78.13 1.58.197 2.4.197 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
              </svg>
              <span>카카오로 계속하기</span>
            </button>
          </div>

          {/* Sign Up Link */}
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
