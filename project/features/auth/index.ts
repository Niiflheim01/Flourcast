/**
 * Auth Feature Module
 * Exports all authentication-related functionality
 */

// Context and hooks
export { AuthProvider, useAuth } from './AuthContext';

// Services
export { AuthService } from './auth.service';
export { ProfileService } from './profile.service';

// Firebase
export { auth, firestore, app } from './firebase';
