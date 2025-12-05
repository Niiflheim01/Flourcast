import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ProfileService } from './profile.service';

export class FirebaseAuthService {
  static async signUp(email: string, password: string, bakeryName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create local profile in SQLite
      if (user) {
        await ProfileService.createProfile({
          id: user.uid,
          bakery_name: bakeryName,
          email: email,
          currency: 'PHP',
          timezone: 'Asia/Manila',
        });
      }

      return { user };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Load or create local profile
      if (user) {
        let profile = await ProfileService.getProfile(user.uid);
        if (!profile) {
          // Create profile if it doesn't exist locally
          await ProfileService.createProfile({
            id: user.uid,
            email: user.email || email,
            bakery_name: 'My Bakery',
            currency: 'PHP',
            timezone: 'Asia/Manila',
          });
        }
      }

      return { user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  static async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  static async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}
