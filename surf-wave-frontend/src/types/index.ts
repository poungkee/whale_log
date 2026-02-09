export type SurfLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type AppScreen = 'splash' | 'welcome' | 'login' | 'register' | 'level-select' | 'main';
export type MainTab = 'home' | 'map' | 'feed' | 'mypage';

export interface SpotForecast {
  spotId: number;
  spotName: string;
  region: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  description: string;
  forecast: {
    forecastTime: string;
    waveHeight: number;
    wavePeriod: number;
    waveDirection: number;
    windSpeed: number;
    windDirection: number;
    temperature: number;
    swellHeight: number;
    swellPeriod: number;
    swellDirection: number;
    rating: number;
    recommendation: string;
    recommendationKo: string;
    simpleCondition: {
      waveStatus: string;
      windStatus: string;
      overall: string;
    };
  } | null;
}
