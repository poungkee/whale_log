import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyPageStackParamList } from './types';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import EditProfileScreen from '../screens/mypage/EditProfileScreen';
import SettingsScreen from '../screens/mypage/SettingsScreen';
import FavoritesScreen from '../screens/mypage/FavoritesScreen';
import NotificationsScreen from '../screens/mypage/NotificationsScreen';
import DiaryListScreen from '../screens/diary/DiaryListScreen';
import DiaryDetailScreen from '../screens/diary/DiaryDetailScreen';
import CreateDiaryScreen from '../screens/diary/CreateDiaryScreen';
import DiaryCalendarScreen from '../screens/diary/DiaryCalendarScreen';
import QnAListScreen from '../screens/qna/QnAListScreen';
import QuestionDetailScreen from '../screens/qna/QuestionDetailScreen';
import CreateQuestionScreen from '../screens/qna/CreateQuestionScreen';
import GuideListScreen from '../screens/guide/GuideListScreen';
import GuideDetailScreen from '../screens/guide/GuideDetailScreen';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

const MyPageStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="DiaryList" component={DiaryListScreen} options={{ title: 'My Diary' }} />
      <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} options={{ title: 'Diary' }} />
      <Stack.Screen name="CreateDiary" component={CreateDiaryScreen} options={{ title: 'New Diary' }} />
      <Stack.Screen name="DiaryCalendar" component={DiaryCalendarScreen} options={{ title: 'Calendar' }} />
      <Stack.Screen name="QnAList" component={QnAListScreen} options={{ title: 'Q&A' }} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} options={{ title: 'Question' }} />
      <Stack.Screen name="CreateQuestion" component={CreateQuestionScreen} options={{ title: 'Ask Question' }} />
      <Stack.Screen name="GuideList" component={GuideListScreen} options={{ title: 'Surf Guide' }} />
      <Stack.Screen name="GuideDetail" component={GuideDetailScreen} options={{ title: 'Guide' }} />
    </Stack.Navigator>
  );
};

export default MyPageStack;
