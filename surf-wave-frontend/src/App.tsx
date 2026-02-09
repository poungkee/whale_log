import { useState, useEffect } from 'react';
import type { AppScreen, MainTab, SurfLevel } from './types';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LevelSelect } from './pages/LevelSelect';
import { Home } from './pages/Home';
import { MyPage } from './pages/MyPage';
import { BottomNav } from './components/BottomNav';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [surfLevel, setSurfLevel] = useState<SurfLevel | null>(null);

  // Check saved level on mount
  useEffect(() => {
    const saved = localStorage.getItem('surfLevel') as SurfLevel | null;
    if (saved) {
      setSurfLevel(saved);
    }
  }, []);

  // Splash -> Welcome after 2s
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('welcome'), 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const handleLogin = () => {
    const saved = localStorage.getItem('surfLevel') as SurfLevel | null;
    if (saved) {
      setSurfLevel(saved);
      setScreen('main');
    } else {
      setScreen('level-select');
    }
  };

  const handleLevelSelect = (level: SurfLevel) => {
    localStorage.setItem('surfLevel', level);
    setSurfLevel(level);
    setScreen('main');
  };

  const handleLogout = () => {
    setScreen('welcome');
    setMainTab('home');
  };

  // Splash Screen
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

  // Welcome Screen
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

  // Login Screen
  if (screen === 'login') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Login
          onBack={() => setScreen('welcome')}
          onLogin={handleLogin}
          onGoRegister={() => setScreen('register')}
        />
      </div>
    );
  }

  // Register Screen
  if (screen === 'register') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Register
          onBack={() => setScreen('welcome')}
          onRegister={handleLogin}
          onGoLogin={() => setScreen('login')}
        />
      </div>
    );
  }

  // Level Select Screen
  if (screen === 'level-select') {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <LevelSelect onSelect={handleLevelSelect} />
      </div>
    );
  }

  // Main App
  const renderMainPage = () => {
    switch (mainTab) {
      case 'home':
        return <Home surfLevel={surfLevel!} />;
      case 'mypage':
        return <MyPage surfLevel={surfLevel!} onLogout={handleLogout} onLevelChange={(level) => {
          localStorage.setItem('surfLevel', level);
          setSurfLevel(level);
        }} />;
      default:
        return <Home surfLevel={surfLevel!} />;
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="page-transition">
        {renderMainPage()}
      </div>
      <BottomNav currentTab={mainTab} onNavigate={setMainTab} />
    </div>
  );
}
