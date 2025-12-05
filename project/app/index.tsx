import { Redirect } from 'expo-router';
import { View, Image, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

const logoImage = require('@/assets/images/logo.png');

export default function Index() {
  const { user, loading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Preload logo
    Asset.loadAsync(logoImage);
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    // TEMP: Always show onboarding for presentation purposes
    // TODO: Remove this before building APK - restore original logic
    setHasSeenOnboarding(false);
    
    /* Original logic (restore before APK build):
    try {
      const value = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(value === 'true');
    } catch (error) {
      setHasSeenOnboarding(false);
    }
    */
  };

  if (loading || hasSeenOnboarding === null) {
    return (
      <View style={styles.container}>
        <Image
          source={logoImage}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
