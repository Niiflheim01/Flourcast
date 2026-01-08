/**
 * Google Authentication Service
 * Handles Google Sign-In for Android/iOS using @react-native-google-signin/google-signin
 * NOTE: Google Sign-In only works in development builds or production APKs, not in Expo Go
 */

import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';
import { ProfileService } from './profile.service';
import Constants from 'expo-constants';

// Dynamically import GoogleSignin to prevent crashes in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;
let isErrorWithCode: any = null;

// Try to load Google Sign-In (will fail in Expo Go)
try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
  isErrorWithCode = googleSignInModule.isErrorWithCode;
} catch (e) {
  console.log('Google Sign-In module not available (expected in Expo Go)');
}

// Check if we're running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure Google Sign-In (call this once on app start)
export const configureGoogleSignIn = () => {
  if (!GoogleSignin || isExpoGo) {
    console.log('Google Sign-In not available in Expo Go - will work in APK build');
    return;
  }

  try {
    GoogleSignin.configure({
      // Web client ID from Firebase Console - this is required for Firebase Auth
      webClientId: Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  } catch (error) {
    console.error('Failed to configure Google Sign-In:', error);
  }
};

export class GoogleAuthService {
  static async signInWithGoogle() {
    // Check if Google Sign-In is available
    if (!GoogleSignin || isExpoGo) {
      throw new Error('Google Sign-In is only available in the APK build. Please use email/password login in Expo Go.');
    }

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
      if (isErrorWithCode && isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes?.SIGN_IN_CANCELLED:
            throw new Error('Sign-in was cancelled');
          case statusCodes?.IN_PROGRESS:
            throw new Error('Sign-in is already in progress');
          case statusCodes?.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services is not available');
          default:
            throw new Error(error.message || 'Google Sign-In failed');
        }
      }

      throw new Error(error.message || 'Google Sign-In failed');
    }
  }

  static async signOut() {
    if (!GoogleSignin || isExpoGo) return;
    
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google Sign-Out error:', error);
    }
  }

  static async isSignedIn() {
    if (!GoogleSignin || isExpoGo) return false;
    
    try {
      return await GoogleSignin.hasPreviousSignIn();
    } catch {
      return false;
    }
  }

  static async getCurrentUser() {
    if (!GoogleSignin || isExpoGo) return null;
    
    try {
      return await GoogleSignin.getCurrentUser();
    } catch {
      return null;
    }
  }
}
