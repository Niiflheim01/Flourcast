// File: app/(onboarding)/_layout.js

import { Stack } from 'expo-router';

export default function OnboardingStack() {
  return (
    <Stack screenOptions={{
      // Hides the header bar at the top of the screen
      headerShown: false, 
    }}>
      {/* Screens defined in sequential order: */}
      <Stack.Screen name="LoadingScreen" />
      <Stack.Screen name="WelcomeScreen" />
      <Stack.Screen name="SignUpScreen" />
      {/* The index.js file is often implicitly included, but listing the main screens is good practice. */}
    </Stack>
  );
}