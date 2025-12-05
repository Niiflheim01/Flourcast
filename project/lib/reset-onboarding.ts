// Reset Onboarding - Development Helper
// Run this in your app to reset onboarding for testing

import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('Onboarding reset successfully!');
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};

// To use: Import this in any screen and call resetOnboarding()
// Then reload the app
