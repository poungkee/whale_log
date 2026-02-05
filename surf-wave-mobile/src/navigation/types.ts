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
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  MapTab: undefined;
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  MyPageTab: NavigatorScreenParams<MyPageStackParamList>;
};

export type HomeStackParamList = {
  Home: undefined;
  SpotDetail: { spotId: string };
};

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  CreatePost: { spotId?: string };
};

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Favorites: undefined;
  Notifications: undefined;
  DiaryList: undefined;
  DiaryDetail: { diaryId: string };
  CreateDiary: { spotId?: string };
  DiaryCalendar: undefined;
  QnAList: undefined;
  QuestionDetail: { questionId: string };
  CreateQuestion: undefined;
  GuideList: undefined;
  GuideDetail: { guideId: string };
};

export type QnAStackParamList = {
  QnAList: undefined;
  QuestionDetail: { questionId: string };
  CreateQuestion: undefined;
};

export type GuideStackParamList = {
  GuideList: undefined;
  GuideDetail: { guideId: string };
};
