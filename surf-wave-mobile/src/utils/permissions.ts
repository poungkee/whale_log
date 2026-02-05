import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export type PermissionType = 'camera' | 'photo' | 'location' | 'notification';

const PERMISSION_MAP: Record<PermissionType, { ios: Permission; android: Permission }> = {
  camera: {
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  },
  photo: {
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
    android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  },
  location: {
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  },
  notification: {
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
    android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
  },
};

export const checkPermission = async (type: PermissionType): Promise<boolean> => {
  const permission = Platform.OS === 'ios'
    ? PERMISSION_MAP[type].ios
    : PERMISSION_MAP[type].android;

  const result = await check(permission);
  return result === RESULTS.GRANTED;
};

export const requestPermission = async (type: PermissionType): Promise<boolean> => {
  const permission = Platform.OS === 'ios'
    ? PERMISSION_MAP[type].ios
    : PERMISSION_MAP[type].android;

  const result = await request(permission);

  if (result === RESULTS.BLOCKED) {
    showSettingsAlert(type);
    return false;
  }

  return result === RESULTS.GRANTED;
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

export const requestMultiplePermissions = async (
  types: PermissionType[]
): Promise<Record<PermissionType, boolean>> => {
  const results: Record<PermissionType, boolean> = {} as Record<PermissionType, boolean>;

  for (const type of types) {
    results[type] = await requestPermission(type);
  }

  return results;
};
