import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useState } from 'react';

interface RegisterProps {
  onBack: () => void;
  onRegister: () => void;
  onGoLogin: () => void;
}

export function Register({ onBack, onRegister, onGoLogin }: RegisterProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseToken: email,
          nickname,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          const msg = data?.message || '';
          if (msg.includes('Nickname')) {
            setErrors({ nickname: '이미 사용 중인 닉네임입니다' });
          } else {
            setErrors({ email: '이미 가입된 이메일입니다' });
          }
        } else {
          setErrors({ email: data?.message || '회원가입에 실패했습니다' });
        }
        return;
      }

      const user = await res.json();
      localStorage.setItem('user', JSON.stringify(user));
      onRegister();
    } catch {
      setErrors({ email: '서버에 연결할 수 없습니다' });
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
        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-xl">
            <span className="text-4xl">🏄</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">회원가입</h1>
          <p className="text-muted-foreground">서핑 파도와 함께 시작하세요</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nickname */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
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

          {/* Register Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          {/* Login Link */}
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
