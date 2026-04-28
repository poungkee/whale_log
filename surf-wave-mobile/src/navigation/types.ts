import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainTab: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  DiaryTab: NavigatorScreenParams<DiaryStackParamList>;
  MyPageTab: NavigatorScreenParams<MyPageStackParamList>;
  GuideTab: NavigatorScreenParams<GuideStackParamList>;
};

export type ExploreStackParamList = {
  ExploreMap: undefined;
  SpotDetail: { spotId: string; spotName: string };
};

export type HomeStackParamList = {
  Home: undefined;
  SpotDetail: { spotId: string; spotName: string };
};

export type DiaryStackParamList = {
  DiaryList: undefined;
  DiaryDetail: { diaryId: string };
  CreateDiary: { spotId?: string; editId?: string };
};

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Favorites: undefined;
  Admin: undefined;
};

export type GuideStackParamList = {
  GuideList: undefined;
};

// 구형 파일 호환용 — 실제로는 사용하지 않음
export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
};
