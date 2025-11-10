// File: app/index.js

import { Redirect } from 'expo-router';

// This file simply redirects the user to the first screen of the onboarding flow.
// Note: This path must match your first actual screen inside the (onboarding) folder.
export default function Index() {
  return <Redirect href="/(onboarding)/LoadingScreen" />;
}