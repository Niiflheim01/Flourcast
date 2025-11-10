import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// --- COLORS ---
const WHITE = '#FFFFFF'; // Background color
// --------------------------------------------------------

// IMPORTANT: Ensure your combined logo (icon + FLOURCAST + tagline) is at this path
// Palitan ang 'combined-logo.png' ng actual na filename at path.
const LOGO_IMAGE = require('../../assets/images/logo.png'); // Assuming the logo with text is named combined-logo.png

const LoadingScreen = () => {
  useEffect(() => {
    // Optional: Maglagay ng delay bago pumunta sa next screen
    const timer = setTimeout(() => {
      // Palitan ang path na ito ng path papunta sa Welcome Screen
      router.replace('/(onboarding)/WelcomeScreen'); 
    }, 3000); // Navigate pagkatapos ng 3 seconds

    return () => clearTimeout(timer); // Para ma-cleanup ang timer
  }, []);

  return (
    <View style={styles.container}>
      {/* Tanging Image Component na lang ang ginamit para sa buong logo */}
      <Image
        source={LOGO_IMAGE}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WHITE, // Puti na background tulad ng nasa picture
  },
  logoImage: {
    width: 250, // I-adjust ang lapad (width) batay sa logo mo
    height: 250, // I-adjust ang taas (height) batay sa logo mo
    resizeMode: 'contain',
  },
});

export default LoadingScreen;