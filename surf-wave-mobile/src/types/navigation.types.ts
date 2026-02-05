import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SpotDetail: { spotId: string };
  PostDetail: { postId: string };
  CreatePost: undefined;
  QuestionDetail: { questionId: string };
  CreateQuestion: undefined;
  GuideDetail: { guideId: string };
  DiaryDetail: { diaryId: string };
  CreateDiary: undefined;
  EditProfile: undefined;
  Settings: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: { email?: string };
  Onboarding: undefined;
};

// Main Tab
export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Feed: undefined;
  MyPage: undefined;
};

// Screen Props
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
