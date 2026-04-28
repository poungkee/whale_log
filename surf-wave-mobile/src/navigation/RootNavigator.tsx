// 앱 루트 네비게이터 — 인증 상태 분기 + 기상특보 폴링 + FCM 토큰 등록
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import { api } from '../config/api';
import {
  GlobalAlertBanner,
  AlertEntryModal,
  type SurfAlertSummary,
} from '../components/WeatherAlertBanner';
import { View, StyleSheet } from 'react-native';

// 알림 핸들러 설정 — 앱 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  // ── 기상특보 상태 ──────────────────────────────────────────────────
  const [surfAlert, setSurfAlert] = useState<SurfAlertSummary | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showAlertDetail, setShowAlertDetail] = useState(false);
  // 세션당 1회만 모달 표시
  const alertShownRef = useRef(false);

  // ── 기상특보 조회 (15분 폴링) ────────────────────────────────────
  const fetchSurfAlerts = async () => {
    try {
      const res = await api.get('/weather-alerts/surf');
      const data: SurfAlertSummary = res.data;
      setSurfAlert(data);
      // 위험 특보(풍랑/태풍)이고 아직 모달 미표시 → 모달 열기
      if (data.hasSurfAlert && data.isDangerous && !alertShownRef.current) {
        setShowAlertModal(true);
        alertShownRef.current = true;
      }
    } catch {
      // 특보 API 실패는 조용히 무시
    }
  };

  useEffect(() => {
    fetchSurfAlerts();
    const interval = setInterval(fetchSurfAlerts, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── FCM 토큰 등록 ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    registerFcmToken();
  }, [isAuthenticated]);

  const registerFcmToken = async () => {
    try {
      // 알림 권한 요청
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      // Android 전용 채널 설정
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: '서핑 컨디션 알림',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2AAFC6',
        });
      }

      // Expo 푸시 토큰 획득 → 서버에 저장
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const fcmToken = tokenData.data;

      await api.patch('/users/me', { fcmToken });
    } catch {
      // FCM 등록 실패는 조용히 무시 (알림 없이도 앱 정상 동작)
    }
  };

  return (
    <View style={styles.root}>
      {/* ── 기상특보 진입 모달 (풍랑/태풍 경보, 세션 1회) ── */}
      {showAlertModal && surfAlert && (
        <AlertEntryModal
          summary={surfAlert}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      {/* ── 배너 클릭 시 상세 모달 ── */}
      {showAlertDetail && surfAlert && (
        <AlertEntryModal
          summary={surfAlert}
          onClose={() => setShowAlertDetail(false)}
        />
      )}

      {/* ── 앱 최상단 특보 배너 ── */}
      {surfAlert?.hasSurfAlert && (
        <GlobalAlertBanner
          summary={surfAlert}
          onDetailClick={() => setShowAlertDetail(true)}
        />
      )}

      {/* ── 메인 네비게이터 ── */}
      <View style={styles.flex}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="MainTab" component={MainTabNavigator} />
          ) : (
            <Stack.Screen name="AuthStack" component={AuthStack} />
          )}
        </Stack.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});

export default RootNavigator;
