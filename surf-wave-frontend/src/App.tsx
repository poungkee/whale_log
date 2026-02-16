/**
 * @file App.tsx
 * @description 앱 루트 컴포넌트 - 화면 전환, 인증 상태 관리, 전역 상태 관리
 *
 * 화면 전환 흐름:
 * 1. splash (2초) → welcome (시작 화면)
 * 2. welcome → login 또는 register
 * 3. login/register → 성공 시:
 *    - surfLevel이 있으면 → main (메인 화면)
 *    - surfLevel이 없으면 → level-select (레벨 선택)
 * 4. level-select → main
 * 5. main → mypage에서 로그아웃 → welcome
 *
 * 인증 데이터 관리 (localStorage):
 * - 'accessToken': JWT 토큰 (API 인증에 사용)
 * - 'user': 사용자 정보 JSON (닉네임, 이메일, 레벨 등)
 * - 'surfLevel': 서핑 레벨 (대시보드 필터에 사용)
 */

import { useState, useEffect } from 'react';
import type { AppScreen, MainTab, SurfLevel, AuthResponse, UserInfo } from './types';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LevelSelect } from './pages/LevelSelect';
import { Home } from './pages/Home';
import { MyPage } from './pages/MyPage';
import { BottomNav } from './components/BottomNav';

export default function App() {
  /** 현재 표시 중인 화면 상태 */
  const [screen, setScreen] = useState<AppScreen>('splash');
  /** 메인 화면의 활성 탭 (하단 네비게이션) */
  const [mainTab, setMainTab] = useState<MainTab>('home');
  /** 홈 리셋 키 - 홈 탭 재클릭 시 증가하여 Home 컴포넌트를 초기화 */
  const [homeResetKey, setHomeResetKey] = useState(0);
  /** 사용자 서핑 레벨 - 대시보드 예보 필터에 사용 */
  const [surfLevel, setSurfLevel] = useState<SurfLevel | null>(null);
  /** 로그인된 사용자 정보 */
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  /**
   * 앱 시작 시 localStorage에서 저장된 인증 정보 복원
   * - accessToken이 있으면 로그인된 상태로 간주
   * - surfLevel이 있으면 메인 화면으로 바로 이동
   */
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    const savedLevel = localStorage.getItem('surfLevel') as SurfLevel | null;

    if (savedToken && savedUser) {
      /** 저장된 토큰과 사용자 정보가 있으면 로그인 상태 복원 */
      try {
        const user = JSON.parse(savedUser) as UserInfo;
        setUserInfo(user);
        if (savedLevel) {
          setSurfLevel(savedLevel);
        }
      } catch {
        /** JSON 파싱 실패 시 저장 데이터 초기화 */
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('surfLevel');
      }
    }
  }, []);

  /**
   * Kakao 소셜 로그인 콜백 처리
   *
   * Kakao 로그인 후 리다이렉트 URI로 돌아오면 URL에 ?code=xxx 파라미터가 포함됨.
   * 이 코드를 감지하여 백엔드 POST /api/v1/auth/kakao/callback API를 호출하고,
   * 성공 시 handleAuthSuccess()로 로그인 처리.
   *
   * URL 경로 확인: /auth/kakao/callback?code=xxx 형태
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const pathname = url.pathname;

    /** Kakao 콜백 경로가 아니거나 code가 없으면 무시 */
    if (pathname !== '/auth/kakao/callback' || !code) return;

    /** URL에서 code 파라미터 제거 (새로고침 시 중복 처리 방지) */
    window.history.replaceState({}, '', '/');

    /** 백엔드에 인가코드 전달하여 로그인 처리 */
    const processKakaoCallback = async () => {
      try {
        const res = await fetch('/api/v1/auth/kakao/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: `${window.location.origin}/auth/kakao/callback`,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error('카카오 로그인 실패:', data?.message || '알 수 없는 오류');
          setScreen('login');
          return;
        }

        /** 로그인 성공 - AuthResponse 수신 후 처리 */
        const authData: AuthResponse = await res.json();
        handleAuthSuccess(authData);
      } catch {
        console.error('카카오 로그인 중 서버 연결 실패');
        setScreen('login');
      }
    };

    processKakaoCallback();
  }, []);

  /**
   * 스플래시 화면 → 시작 화면 자동 전환 (2초 후)
   * 저장된 로그인 정보가 있으면 메인/레벨선택으로 바로 이동
   */
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        const savedToken = localStorage.getItem('accessToken');
        const savedLevel = localStorage.getItem('surfLevel') as SurfLevel | null;

        if (savedToken && savedLevel) {
          /** 토큰 + 레벨 모두 있으면 → 메인 화면으로 바로 이동 */
          setScreen('main');
        } else if (savedToken) {
          /** 토큰만 있고 레벨 없으면 → 레벨 선택 화면 */
          setScreen('level-select');
        } else {
          /** 토큰 없으면 → 시작 화면 */
          setScreen('welcome');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  /**
   * 로그인/회원가입 성공 후 호출
   * API 응답(AuthResponse)을 받아 localStorage에 저장하고 화면 전환
   *
   * @param authData - { accessToken: JWT토큰, user: 사용자정보 }
   */
  const handleAuthSuccess = (authData: AuthResponse) => {
    /** JWT 토큰과 사용자 정보를 localStorage에 저장 */
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('user', JSON.stringify(authData.user));
    setUserInfo(authData.user);

    /** surfLevel 유무에 따라 화면 전환 결정 */
    if (authData.user.surfLevel) {
      /** 이미 레벨을 선택한 사용자 → 메인 화면으로 이동 */
      const level = authData.user.surfLevel as SurfLevel;
      localStorage.setItem('surfLevel', level);
      setSurfLevel(level);
      setScreen('main');
    } else {
      /** 레벨 미선택 → 레벨 선택 화면으로 이동 (온보딩) */
      setScreen('level-select');
    }
  };

  /**
   * 레벨 선택 완료 후 호출
   * 선택한 레벨을 서버 API로 저장하고 메인 화면으로 전환
   *
   * @param level - 선택한 서핑 레벨 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
   */
  const handleLevelSelect = async (level: SurfLevel) => {
    /** localStorage에 레벨 저장 (오프라인 대비) */
    localStorage.setItem('surfLevel', level);
    setSurfLevel(level);

    /** 서버 API로 레벨 저장 - PATCH /api/v1/users/me */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch('/api/v1/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ surfLevel: level }),
        });

        /** 사용자 정보에 레벨 반영 */
        if (userInfo) {
          const updated = { ...userInfo, surfLevel: level };
          setUserInfo(updated);
          localStorage.setItem('user', JSON.stringify(updated));
        }
      } catch {
        /** API 실패해도 로컬 저장은 유지 - 다음 로그인 시 서버와 동기화 */
        console.warn('서버에 레벨 저장 실패 - 로컬에만 저장됨');
      }
    }

    /** 메인 화면으로 전환 */
    setScreen('main');
  };

  /**
   * 레벨 변경 (마이페이지 설정에서 호출)
   * 서버 API로 레벨 업데이트하고 로컬 상태 반영
   *
   * @param level - 변경할 서핑 레벨
   */
  const handleLevelChange = async (level: SurfLevel) => {
    localStorage.setItem('surfLevel', level);
    setSurfLevel(level);

    /** 서버에 레벨 변경 저장 */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch('/api/v1/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ surfLevel: level }),
        });
      } catch {
        console.warn('서버에 레벨 변경 저장 실패');
      }
    }

    /** 사용자 정보 로컬 업데이트 */
    if (userInfo) {
      const updated = { ...userInfo, surfLevel: level };
      setUserInfo(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  /**
   * 로그아웃 처리
   * localStorage의 인증 정보 삭제 후 시작 화면으로 이동
   */
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('surfLevel');
    setUserInfo(null);
    setSurfLevel(null);
    setScreen('welcome');
    setMainTab('home');
  };

  // ===== 화면 렌더링 =====

  /** 스플래시 화면 - 앱 로고 + 로딩 애니메이션 (2초) */
  if (screen === 'splash') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-6xl">🏄</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              서핑 파도
            </h1>
          </div>
        </div>
      </div>
    );
  }

  /** 시작 화면 - 앱 소개 + 로그인/회원가입 버튼 */
  if (screen === 'welcome') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Welcome
          onLoginClick={() => setScreen('login')}
          onRegisterClick={() => setScreen('register')}
        />
      </div>
    );
  }

  /** 로그인 화면 - 이메일/비밀번호 입력 + 소셜 로그인 버튼 */
  if (screen === 'login') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Login
          onBack={() => setScreen('welcome')}
          onAuthSuccess={handleAuthSuccess}
          onGoRegister={() => setScreen('register')}
        />
      </div>
    );
  }

  /** 회원가입 화면 - 닉네임/이메일/비밀번호 입력 */
  if (screen === 'register') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Register
          onBack={() => setScreen('welcome')}
          onAuthSuccess={handleAuthSuccess}
          onGoLogin={() => setScreen('login')}
        />
      </div>
    );
  }

  /** 레벨 선택 화면 - 초급/중급/상급/전문가 카드 */
  if (screen === 'level-select') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <LevelSelect onSelect={handleLevelSelect} />
      </div>
    );
  }

  /** 메인 화면 - 탭별 컨텐츠 + 하단 네비게이션 */
  const renderMainPage = () => {
    switch (mainTab) {
      case 'home':
        return <Home key={homeResetKey} surfLevel={surfLevel!} />;
      case 'mypage':
        return (
          <MyPage
            surfLevel={surfLevel!}
            userInfo={userInfo}
            onLogout={handleLogout}
            onLevelChange={handleLevelChange}
          />
        );
      default:
        return <Home key={homeResetKey} surfLevel={surfLevel!} />;
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="page-transition">
        {renderMainPage()}
      </div>
      <BottomNav currentTab={mainTab} onNavigate={(tab) => {
        if (tab === 'home' && mainTab === 'home') {
          /** 이미 홈 탭인데 다시 누르면 → 홈 화면 초기화 (필터/검색/스크롤 리셋) */
          setHomeResetKey(k => k + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setMainTab(tab);
      }} />
    </div>
  );
}
