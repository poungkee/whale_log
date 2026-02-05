import auth from '@react-native-firebase/auth';

export const firebaseAuth = auth();

export const getCurrentUser = () => firebaseAuth.currentUser;

export const getIdToken = async (): Promise<string | null> => {
  const user = getCurrentUser();
  if (!user) return null;
  return user.getIdToken();
};
