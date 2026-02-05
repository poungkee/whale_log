import { useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';

export const useAuth = () => {
  const { user, isAuthenticated, setUser, setLoading, logout: logoutStore } = useAuthStore();

  const loginWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const firebaseToken = await userCredential.user.getIdToken();
      const response = await authApi.login(firebaseToken);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const logout = useCallback(async () => {
    try {
      await auth().signOut();
      await GoogleSignin.signOut();
      logoutStore();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logoutStore]);

  const refreshToken = useCallback(async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      return await currentUser.getIdToken(true);
    }
    return null;
  }, []);

  return {
    user,
    isAuthenticated,
    loginWithGoogle,
    logout,
    refreshToken,
  };
};
