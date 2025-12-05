// Translate Firebase error codes to user-friendly messages
export function getFirebaseErrorMessage(error: any): string {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Common Firebase Auth errors
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your internet connection',
    'auth/requires-recent-login': 'Please sign in again to continue',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
    'auth/popup-closed-by-user': 'Sign-in cancelled',
    'auth/cancelled-popup-request': 'Sign-in cancelled',
    'auth/internal-error': 'An error occurred. Please try again',
  };

  // Check if we have a user-friendly message for this error code
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Check if the error message contains any of these keywords
  if (errorMessage.includes('network')) {
    return 'Network error. Check your internet connection';
  }
  if (errorMessage.includes('invalid-email') || errorMessage.includes('badly formatted')) {
    return 'Please enter a valid email address';
  }
  if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
    return 'Invalid email or password';
  }
  if (errorMessage.includes('email-already-in-use')) {
    return 'An account with this email already exists';
  }
  if (errorMessage.includes('weak-password')) {
    return 'Password should be at least 6 characters';
  }

  // Generic fallback message
  return 'Something went wrong. Please try again';
}
