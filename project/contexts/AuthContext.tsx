import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { FirebaseAuthService } from '@/services/firebase-auth.service';
import { ProfileService } from '@/services/profile.service';
import { Profile } from '@/types/database';
import { initDatabase } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, bakeryName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize database first
    initDatabase().then(() => {
      checkUser();
    });

    // Listen for auth state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChange(async (currentUser) => {
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
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
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

  const signIn = async (email: string, password: string) => {
    const { user: signedInUser } = await FirebaseAuthService.signIn(email, password);
    setUser(signedInUser);
    if (signedInUser) {
      await loadProfile(signedInUser.uid);
    }
  };

  const signUp = async (email: string, password: string, bakeryName: string) => {
    const { user: newUser } = await FirebaseAuthService.signUp(email, password, bakeryName);
    if (newUser) {
      setUser(newUser);
      await loadProfile(newUser.uid);
    }
  };

  const signOut = async () => {
    await FirebaseAuthService.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
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
