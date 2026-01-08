/**
 * Google Authentication Service
 * Handles Google Sign-In for Android/iOS using @react-native-google-signin/google-signin
 */

import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';
import { ProfileService } from './profile.service';
import Constants from 'expo-constants';

// Configure Google Sign-In (call this once on app start)
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // Web client ID from Firebase Console - this is required for Firebase Auth
    webClientId: Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    offlineAccess: true,
    scopes: ['profile', 'email'],
  });
};

export class GoogleAuthService {
  static async signInWithGoogle() {
    try {
      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const signInResult = await GoogleSignin.signIn();

      // Get ID token
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      // Create Firebase credential with the Google ID token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with the credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      if (user) {
        // Check if profile exists, if not create one
        let profile = await ProfileService.getProfile(user.uid);
        if (!profile) {
          await ProfileService.createProfile({
            id: user.uid,
            email: user.email || '',
            bakery_name: user.displayName || 'My Bakery',
            currency: 'PHP',
            timezone: 'Asia/Manila',
            avatar_url: user.photoURL || null,
          });
        }
      }

      return { user };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      // Handle specific Google Sign-In errors
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            throw new Error('Sign-in was cancelled');
          case statusCodes.IN_PROGRESS:
            throw new Error('Sign-in is already in progress');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services is not available');
          default:
            throw new Error(error.message || 'Google Sign-In failed');
        }
      }

      throw new Error(error.message || 'Google Sign-In failed');
    }
  }

  static async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google Sign-Out error:', error);
    }
  }

  static async isSignedIn() {
    try {
      return await GoogleSignin.hasPreviousSignIn();
    } catch {
      return false;
    }
  }

  static async getCurrentUser() {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch {
      return null;
    }
  }
}
