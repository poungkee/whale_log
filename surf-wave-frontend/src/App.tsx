/**
 * @file App.tsx
 * @description 앱 루트 컴포넌트 - 화면 전환, 인증 상태 관리, 전역 상태 관리
 *
 * 화면 전환 흐름:
 * 1. splash (2초) → welcome (시작 화면)
 * 2. welcome → login 또는 register
 * 3. login/register → 성공 시:
 *    - surfLevel + boardType 모두 있으면 → main (메인 화면)
 *    - surfLevel 없으면 → level-select (레벨 + 보드 선택)
 *    - surfLevel 있고 boardType이 'UNSET'이면 → level-select (보드만 선택)
 * 4. level-select → main
 * 5. main → mypage에서 로그아웃 → welcome
 *
 * 인증 데이터 관리 (localStorage):
 * - 'accessToken': JWT 토큰 (API 인증에 사용)
 * - 'user': 사용자 정보 JSON (닉네임, 이메일, 레벨, 보드 타입 등)
 * - 'surfLevel': 서핑 레벨 (대시보드 필터에 사용)
 */

import { useState, useEffect, useRef } from 'react';
import type { AppScreen, MainTab, SurfLevel, BoardType, AuthResponse, UserInfo } from './types';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { LevelSelect } from './pages/LevelSelect';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { MyPage } from './pages/MyPage';
import { Guide } from './pages/Guide';
import { Diary } from './pages/Diary';
import { PoseTraining } from './pages/PoseTraining';
import { AdminPage } from './pages/admin/AdminPage';
import { BottomNav } from './components/BottomNav';
import { BadgeEarnedPopup } from './components/BadgeEarnedPopup';
import { BadgeProvider, useBadgeQueue, useBadgeNotify } from './contexts/BadgeContext';
import { GlobalAlertBanner, AlertEntryModal } from './components/WeatherAlertBanner';
import type { SurfAlertSummary } from './components/WeatherAlertBanner';
import { api } from './lib/api';

function AppInner() {
  const pushBadges = useBadgeNotify();

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
  /** 즐겨찾기 스팟 ID Set - 전역 관리 (홈/즐겨찾기 페이지 공유) */
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  /** 프로필 탭 서브 페이지 - 'main'(마이페이지) / 'diary'(서핑 다이어리) / 'poseTraining'(자세 연습) */
  const [profileSubPage, setProfileSubPage] = useState<'main' | 'diary' | 'poseTraining'>('main');

  /** 기상청 기상특보 — 서핑 관련 특보 요약 */
  const [surfAlert, setSurfAlert] = useState<SurfAlertSummary | null>(null);
  /** 특보 모달 표시 여부 — 세션당 1회만 표시 */
  const [showAlertModal, setShowAlertModal] = useState(false);
  /** 특보 상세 모달 (배너 클릭 시) */
  const [showAlertDetail, setShowAlertDetail] = useState(false);

  /** 특보 모달 이미 표시했는지 여부 (세션 중 재표시 방지) */
  const alertShownRef = useRef(false);

  /**
   * 기상청 서핑 관련 특보 조회
   * GET /api/v1/weather-alerts/surf — 인증 불필요 (Public)
   * 15분마다 자동 갱신 (특보는 빠른 반영 필요)
   */
  const fetchSurfAlerts = async () => {
    try {
      const res = await fetch(api('/api/v1/weather-alerts/surf'));
      if (!res.ok) return;
      const data: SurfAlertSummary = await res.json();
      setSurfAlert(data);
      if (data.hasSurfAlert && data.isDangerous && !alertShownRef.current) {
        setShowAlertModal(true);
        alertShownRef.current = true;
      }
    } catch {
      console.warn('기상특보 조회 실패');
    }
  };

  /**
   * 서버에서 즐겨찾기 목록 가져오기
   * GET /api/v1/spots/favorites (인증 필요)
   * 반환값: [{ id, name, region, ... , isFavorited: true }, ...]
   */
  const fetchFavorites = async (token: string) => {
    try {
      const res = await fetch(api('/api/v1/spots/favorites'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const spots = await res.json();
      /** 스팟 ID만 추출하여 Set으로 관리 */
      const ids = new Set<string>(spots.map((s: { id: string }) => s.id));
      setFavoriteIds(ids);
    } catch {
      console.warn('즐겨찾기 목록 조회 실패');
    }
  };

  /**
   * 앱 시작 시 localStorage에서 저장된 인증 정보 복원
   * - accessToken이 있으면 로그인된 상태로 간주
   * - surfLevel이 있으면 메인 화면으로 바로 이동
   * - 즐겨찾기 목록도 서버에서 가져옴
   */
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    const savedLevel = localStorage.getItem('surfLevel') as SurfLevel | null;

    if (savedToken && savedUser) {
      /** 저장된 토큰과 사용자 정보가 있으면 로그인 상태 복원 */
      try {
        const user = JSON.parse(savedUser) as UserInfo;
        /** 기존 사용자 데이터에 boardType 없으면 기본값 보정 */
        if (!user.boardType) {
          user.boardType = 'UNSET';
          localStorage.setItem('user', JSON.stringify(user));
        }
        setUserInfo(user);
        if (savedLevel) {
          setSurfLevel(savedLevel);
        }
        /** 즐겨찾기 목록 서버에서 가져오기 */
        fetchFavorites(savedToken);
      } catch {
        /** JSON 파싱 실패 시 저장 데이터 초기화 */
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('surfLevel');
      }
    }
  }, []);

  /**
   * 기상특보 초기 조회 + 15분 주기 폴링
   * 인증 여부 무관하게 항상 조회 (Public API)
   */
  useEffect(() => {
    fetchSurfAlerts();
    const interval = setInterval(fetchSurfAlerts, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Kakao 소셜 로그인 콜백 처리
   *
   * Kakao 로그인 후 리다이렉트 URI로 돌아오면 URL에 ?code=xxx 파라미터가 포함됨.
   * 이 코드를 감지하여 백엔드 POST /api/v1/auth/kakao/callback API를 호출하고,
   * 성공 시 handleAuthSuccess()로 로그인 처리.
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
        const res = await fetch(api('/api/v1/auth/kakao/callback'), {
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
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedLevel) {
          /** 토큰 + 레벨 모두 있으면 → 메인 화면으로 이동 */
          /** boardType은 UNSET이어도 메인 진입 허용 (마이페이지에서 나중에 설정) */
          setScreen('main');
        } else if (savedToken) {
          /** 토큰만 있고 레벨 없으면 → 레벨 + 보드 선택 화면 */
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
   * 즐겨찾기 토글 (추가/제거)
   * - 이미 즐겨찾기 → DELETE /api/v1/spots/:spotId/favorite
   * - 아직 즐겨찾기 아님 → POST /api/v1/spots/:spotId/favorite
   * 낙관적 업데이트: API 호출 전에 로컬 상태 먼저 변경
   *
   * @param spotId - 토글할 스팟 UUID
   */
  const handleToggleFavorite = async (spotId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const isCurrentlyFavorited = favoriteIds.has(spotId);

    /** 낙관적 업데이트 - 즉시 UI에 반영 */
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFavorited) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });

    try {
      const method = isCurrentlyFavorited ? 'DELETE' : 'POST';
      const res = await fetch(api(`/api/v1/spots/${spotId}/favorite`), {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        /** API 실패 시 낙관적 업데이트 롤백 */
        setFavoriteIds(prev => {
          const rollback = new Set(prev);
          if (isCurrentlyFavorited) {
            rollback.add(spotId);
          } else {
            rollback.delete(spotId);
          }
          return rollback;
        });
      } else if (!isCurrentlyFavorited) {
        /** 즐겨찾기 추가 성공 시 뱃지 체크 */
        const result = await res.json().catch(() => ({}));
        if (result.newBadges?.length) pushBadges(result.newBadges);
      }
    } catch {
      /** 네트워크 에러 시 롤백 */
      setFavoriteIds(prev => {
        const rollback = new Set(prev);
        if (isCurrentlyFavorited) {
          rollback.add(spotId);
        } else {
          rollback.delete(spotId);
        }
        return rollback;
      });
    }
  };

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

    /** 로그인 성공 시 즐겨찾기 목록도 가져오기 */
    fetchFavorites(authData.accessToken);

    /** surfLevel + boardType 유무에 따라 화면 전환 결정 */
    if (authData.user.surfLevel) {
      const level = authData.user.surfLevel as SurfLevel;
      localStorage.setItem('surfLevel', level);
      setSurfLevel(level);

      /** 레벨이 있으면 메인으로 (boardType UNSET도 허용 - 마이페이지에서 설정) */
      setScreen('main');
    } else {
      /** 레벨 미선택 → 레벨 + 보드 선택 화면으로 이동 (온보딩) */
      setScreen('level-select');
    }
  };

  /**
   * 온보딩 완료 후 호출 (레벨 + 보드 타입 선택 완료)
   * 선택한 레벨과 보드 타입을 서버 API로 저장하고 메인 화면으로 전환
   *
   * @param level - 선택한 서핑 레벨
   * @param boardType - 선택한 보드 타입
   */
  const handleOnboardingComplete = async (level: SurfLevel, boardType: BoardType) => {
    /** localStorage에 레벨 저장 (오프라인 대비) */
    localStorage.setItem('surfLevel', level);
    setSurfLevel(level);

    /** 서버 API로 레벨 + 보드 타입 저장 - PATCH /api/v1/users/me */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch(api('/api/v1/users/me'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ surfLevel: level, boardType }),
        });

        /** 사용자 정보에 레벨 + 보드 타입 반영 */
        if (userInfo) {
          const updated = { ...userInfo, surfLevel: level, boardType };
          setUserInfo(updated);
          localStorage.setItem('user', JSON.stringify(updated));
        }
      } catch {
        /** API 실패해도 로컬 저장은 유지 - 다음 로그인 시 서버와 동기화 */
        console.warn('서버에 온보딩 데이터 저장 실패 - 로컬에만 저장됨');
      }
    }

    /** 메인 화면으로 전환 */
    setScreen('main');
  };

  /**
   * 레벨 변경 (마이페이지 설정에서 호출)
   * 서버 API로 레벨 업데이트하고 로컬 상태 반영
   */
  const handleLevelChange = async (level: SurfLevel) => {
    localStorage.setItem('surfLevel', level);
    setSurfLevel(level);

    /** 서버에 레벨 변경 저장 */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch(api('/api/v1/users/me'), {
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
   * 알림 설정 토글 (마이페이지에서 호출)
   * PATCH /api/v1/users/me { notificationsEnabled: boolean }
   * 서버에 알림 수신 여부 저장 + 로컬 상태 반영
   *
   * @param enabled - true: 알림 수신, false: 알림 차단
   */
  const handleNotificationToggle = async (enabled: boolean) => {
    /** 로컬 상태 즉시 반영 (낙관적 업데이트) */
    if (userInfo) {
      const updated = { ...userInfo, notificationsEnabled: enabled };
      setUserInfo(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }

    /** 서버에 알림 설정 저장 */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const res = await fetch(api('/api/v1/users/me'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ notificationsEnabled: enabled }),
        });

        if (!res.ok) {
          /** API 실패 시 롤백 */
          if (userInfo) {
            const rollback = { ...userInfo, notificationsEnabled: !enabled };
            setUserInfo(rollback);
            localStorage.setItem('user', JSON.stringify(rollback));
          }
        }
      } catch {
        /** 네트워크 에러 시 롤백 */
        if (userInfo) {
          const rollback = { ...userInfo, notificationsEnabled: !enabled };
          setUserInfo(rollback);
          localStorage.setItem('user', JSON.stringify(rollback));
        }
        console.warn('서버에 알림 설정 저장 실패');
      }
    }
  };

  /**
   * 보드 타입 변경 (마이페이지 설정에서 호출)
   * 서버 API로 보드 타입 업데이트하고 로컬 상태 반영
   */
  const handleBoardTypeChange = async (boardType: BoardType) => {
    /** 서버에 보드 타입 변경 저장 */
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch(api('/api/v1/users/me'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ boardType }),
        });
      } catch {
        console.warn('서버에 보드 타입 변경 저장 실패');
      }
    }

    /** 사용자 정보 로컬 업데이트 */
    if (userInfo) {
      const updated = { ...userInfo, boardType };
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
    /** 로그아웃 시 즐겨찾기 상태도 초기화 */
    setFavoriteIds(new Set());
    setScreen('welcome');
    setMainTab('home');
  };

  // ===== 화면 렌더링 =====

  /** 스플래시 화면 - 앱 로고 + 로딩 애니메이션 (2초) */
  if (screen === 'splash') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen bg-gradient-to-b from-[#e8f7fb] via-[#f0fafe] to-[#ffffff] flex items-center justify-center">
          <div className="text-center animate-pulse">
            {/* Whale Log 스플래시 로고 */}
            <img src="/logo.png" alt="Whale Log" className="w-28 h-28 mx-auto mb-6 rounded-full shadow-2xl shadow-primary/20" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#2AAFC6] to-[#1a8fa8] bg-clip-text text-transparent">
              Whale Log
            </h1>
          </div>
        </div>
      </div>
    );
  }

  /** 시작 화면 - 앱 소개 + 로그인/회원가입 버튼 */
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Welcome
          onLoginClick={() => setScreen('login')}
          onRegisterClick={() => setScreen('register')}
        />
      </div>
    );
  }

  /** 로그인 화면 - 아이디/비밀번호 입력 + 소셜 로그인 버튼 */
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Login
          onBack={() => setScreen('welcome')}
          onAuthSuccess={handleAuthSuccess}
          onGoRegister={() => setScreen('register')}
          onGoForgotPassword={() => setScreen('forgot-password')}
        />
      </div>
    );
  }

  /** 회원가입 화면 - 아이디/닉네임/이메일/비밀번호 입력 */
  if (screen === 'register') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Register
          onBack={() => setScreen('welcome')}
          onAuthSuccess={handleAuthSuccess}
          onGoLogin={() => setScreen('login')}
        />
      </div>
    );
  }

  /** 비밀번호 찾기 화면 - 이메일 인증코드 발송 → 새 비밀번호 설정 */
  if (screen === 'forgot-password') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ForgotPassword
          onBack={() => setScreen('login')}
          onDone={() => setScreen('login')}
        />
      </div>
    );
  }

  /** 온보딩 화면 - 레벨 + 보드 타입 선택 (2단계) */
  if (screen === 'level-select') {
    /** 이미 레벨이 있으면 보드 선택만 표시 */
    const existingLevel = userInfo?.surfLevel as SurfLevel | null;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <LevelSelect
          existingLevel={existingLevel}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  /** 관리자 대시보드 - role=ADMIN인 경우에만 접근 가능 */
  if (screen === 'admin') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminPage
          userInfo={userInfo}
          onBack={() => setScreen('main')}
        />
      </div>
    );
  }

  /** 메인 화면 - 탭별 컨텐츠 + 하단 네비게이션 */
  const renderMainPage = () => {
    switch (mainTab) {
      case 'home':
        return (
          <Home
            key={homeResetKey}
            surfLevel={surfLevel!}
            boardType={userInfo?.boardType}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
        );
      case 'profile':
        /** 프로필 탭 내 서브 페이지 분기 - diary/poseTraining/main */
        if (profileSubPage === 'diary') {
          return (
            <Diary
              defaultBoardType={userInfo?.boardType}
              onBack={() => setProfileSubPage('main')}
            />
          );
        }
        /** 자세 연습 서브 페이지 — 카메라 실시간 포즈 감지 */
        if (profileSubPage === 'poseTraining') {
          return (
            <PoseTraining
              onBack={() => setProfileSubPage('main')}
            />
          );
        }
        return (
          <MyPage
            surfLevel={surfLevel!}
            userInfo={userInfo}
            onLogout={handleLogout}
            onLevelChange={handleLevelChange}
            onBoardTypeChange={handleBoardTypeChange}
            onNotificationToggle={handleNotificationToggle}
            onNavigateToDiary={() => setProfileSubPage('diary')}
            onNavigateToPoseTraining={() => setProfileSubPage('poseTraining')}
            onNavigateToAdmin={() => setScreen('admin')}
          />
        );
      case 'explore':
        return <Explore surfLevel={surfLevel!} />;
      case 'guide':
        return <Guide />;
      default:
        return <Home key={homeResetKey} surfLevel={surfLevel!} boardType={userInfo?.boardType} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── 기상청 특보 진입 모달 (풍랑/태풍 발령 시 세션 1회) ── */}
      {showAlertModal && surfAlert && (
        <AlertEntryModal
          summary={surfAlert}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      {/* ── 기상청 특보 상세 모달 (배너 클릭 시) ── */}
      {showAlertDetail && surfAlert && (
        <AlertEntryModal
          summary={surfAlert}
          onClose={() => setShowAlertDetail(false)}
        />
      )}

      {/* ── 앱 최상단 고정 특보 배너 ── */}
      {surfAlert && (
        <GlobalAlertBanner
          summary={surfAlert}
          onDetailClick={() => setShowAlertDetail(true)}
        />
      )}

      <div className="page-transition">
        {renderMainPage()}
      </div>

      {/* ── 하단 Footer — 이용약관 / 개인정보처리방침 ── */}
      <footer
        className="w-full text-center border-t"
        style={{
          backgroundColor: 'rgba(255,253,249,0.95)',
          borderColor: 'rgba(160,140,110,0.2)',
          paddingTop: '10px',
          paddingBottom: 'calc(4.5rem + 10px)',
        }}
      >
        <div className="flex items-center justify-center gap-1 flex-wrap" style={{ fontSize: '11px', color: '#A09880' }}>
          <span>© 2026 Whale Log</span>
          <span style={{ color: 'rgba(160,140,110,0.35)' }}>|</span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ color: '#6b6355' }}>이용약관</a>
          <span style={{ color: 'rgba(160,140,110,0.35)' }}>|</span>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ color: '#6b6355' }}>개인정보처리방침</a>
          <span style={{ color: 'rgba(160,140,110,0.35)' }}>|</span>
          <a href="mailto:poung1869@gmail.com"
            className="hover:underline" style={{ color: '#6b6355' }}>문의</a>
        </div>
      </footer>

      <BottomNav currentTab={mainTab} onNavigate={(tab) => {
        if (tab === 'home' && mainTab === 'home') {
          /** 이미 홈 탭인데 다시 누르면 → 홈 화면 초기화 (필터/검색/스크롤 리셋) */
          setHomeResetKey(k => k + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        /** 프로필 탭 벗어나면 서브 페이지 초기화 */
        if (tab !== 'profile') {
          setProfileSubPage('main');
        }
        setMainTab(tab);
      }} />

      {/* ── 뱃지 획득 팝업 ── */}
      <BadgePopupRenderer />
    </div>
  );
}

/** 뱃지 팝업 렌더러 — Context에서 큐를 읽어 표시 */
function BadgePopupRenderer() {
  const { badgeQueue, dismissFirst } = useBadgeQueue();
  return <BadgeEarnedPopup queue={badgeQueue} onDismiss={dismissFirst} />;
}

export default function App() {
  return (
    <BadgeProvider>
      <AppInner />
    </BadgeProvider>
  );
}
