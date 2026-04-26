// 권한 유틸 — Expo 권한 API로 카메라/위치/갤러리/알림 요청
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export type PermissionType = 'camera' | 'photo' | 'location' | 'notification';

export const requestPermission = async (type: PermissionType): Promise<boolean> => {
  let status: string;

  switch (type) {
    case 'camera': {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      status = result.status;
      break;
    }
    case 'photo': {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = result.status;
      break;
    }
    case 'location': {
      const result = await Location.requestForegroundPermissionsAsync();
      status = result.status;
      break;
    }
    case 'notification': {
      const result = await Notifications.requestPermissionsAsync();
      status = result.status;
      break;
    }
  }

  if (status === 'denied') {
    showSettingsAlert(type);
    return false;
  }
  return status === 'granted';
};

const showSettingsAlert = (type: PermissionType) => {
  const messages: Record<PermissionType, string> = {
    camera: '카메라 권한이 필요합니다.',
    photo: '사진 접근 권한이 필요합니다.',
    location: '위치 권한이 필요합니다.',
    notification: '알림 권한이 필요합니다.',
  };

  Alert.alert(
    '권한 필요',
    `${messages[type]} 설정에서 권한을 허용해주세요.`,
    [
      { text: '취소', style: 'cancel' },
      { text: '설정으로 이동', onPress: () => Linking.openSettings() },
    ]
  );
};
