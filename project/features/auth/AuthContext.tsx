/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 * 
 * DEMO MODE: When enabled, bypasses Firebase auth and uses demo data
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { GoogleAuthService, configureGoogleSignIn } from './google-auth.service';
import { Profile } from '@/features/shared/types';
import { initDatabase } from '@/features/shared/database';
import { DEMO_MODE, DEMO_USER_ID, DEMO_EMAIL, DEMO_BAKERY_NAME, setupDemoData, isDemoDataReady } from '@/lib/demo-data';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, bakeryName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a mock Firebase User for demo mode
const createDemoUser = (): User => ({
  uid: DEMO_USER_ID,
  email: DEMO_EMAIL,
  emailVerified: true,
  displayName: DEMO_BAKERY_NAME,
  isAnonymous: false,
  photoURL: null,
  phoneNumber: null,
  providerData: [],
  tenantId: null,
  metadata: {} as any,
  providerId: 'demo',
  refreshToken: '',
  delete: async () => {},
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
} as User);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In (only needed for non-demo mode)
    if (!DEMO_MODE) {
      configureGoogleSignIn();
    }

    initDatabase().then(() => {
      if (DEMO_MODE) {
        initDemoMode();
      } else {
        checkUser();
      }
    });

    // Only subscribe to Firebase auth changes in non-demo mode
    if (!DEMO_MODE) {
      const unsubscribe = AuthService.onAuthStateChange(async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.uid);
        } else {
          setProfile(null);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  // Initialize demo mode with seeded data
  const initDemoMode = async () => {
    try {
      console.log('Initializing demo mode...');
      const ready = await isDemoDataReady();
      if (!ready) {
        console.log('Setting up demo data...');
        await setupDemoData();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error initializing demo mode:', error);
      setLoading(false);
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.uid);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const userProfile = await ProfileService.getProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // DEMO MODE: Any email/password logs into the demo account
  const signIn = async (email: string, password: string) => {
    if (DEMO_MODE) {
      console.log('Demo mode: Bypassing Firebase auth');
      const demoUser = createDemoUser();
      setUser(demoUser);
      await loadProfile(DEMO_USER_ID);
      return;
    }
    
    const { user: signedInUser } = await AuthService.signIn(email, password);
    setUser(signedInUser);
    if (signedInUser) {
      await loadProfile(signedInUser.uid);
    }
  };

  // DEMO MODE: Any signup goes to demo account
  const signUp = async (email: string, password: string, bakeryName: string) => {
    if (DEMO_MODE) {
      console.log('Demo mode: Bypassing Firebase signup');
      const demoUser = createDemoUser();
      setUser(demoUser);
      await loadProfile(DEMO_USER_ID);
      return;
    }
    
    const { user: newUser } = await AuthService.signUp(email, password, bakeryName);
    if (newUser) {
      setUser(newUser);
      await loadProfile(newUser.uid);
    }
  };

  // DEMO MODE: Google sign-in goes to demo account
  const signInWithGoogle = async () => {
    if (DEMO_MODE) {
      console.log('Demo mode: Bypassing Google auth');
      const demoUser = createDemoUser();
      setUser(demoUser);
      await loadProfile(DEMO_USER_ID);
      return;
    }
    
    const { user: googleUser } = await GoogleAuthService.signInWithGoogle();
    setUser(googleUser);
    if (googleUser) {
      await loadProfile(googleUser.uid);
    }
  };

  const signOut = async () => {
    if (DEMO_MODE) {
      console.log('Demo mode: Signing out');
      setUser(null);
      setProfile(null);
      return;
    }
    
    await AuthService.signOut();
    await GoogleAuthService.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (DEMO_MODE && !user) {
      // In demo mode, refresh using demo user ID
      await loadProfile(DEMO_USER_ID);
      return;
    }
    if (user) {
      await loadProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
