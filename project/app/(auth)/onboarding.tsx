import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');

// Preload all images
const images = [
  require('@/assets/images/onboarding-1.png'),
  require('@/assets/images/onboarding-2.png'),
  require('@/assets/images/onboarding-3.png'),
  require('@/assets/images/onboarding-4.png'),
];

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to',
    titleHighlight: 'Flourcast',
    description: 'Flourcats helps track your bakery\'s sales, manage inventory, and plan production all in one place.',
    image: images[0],
  },
  {
    id: 2,
    title: 'Stay on top of every sale',
    description: 'View real-time sales data, identify best-selling products, and understand your bakery\'s performance at a glance.',
    image: images[1],
  },
  {
    id: 3,
    title: 'Keep track of your ingredients and products easily',
    description: 'Record and monitor your inventory so you always know what\'s in stock and what needs restocking.',
    image: images[2],
  },
  {
    id: 4,
    title: 'Bake the right amount, every time',
    description: 'Flourcast predicts demand based on past sales, helping you avoid overproduction and shortages.',
    image: images[3],
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    // Preload all images when component mounts
    const loadImages = async () => {
      try {
        await Asset.loadAsync(images);
        setImagesLoaded(true);
      } catch (error) {
        console.log('Error preloading images:', error);
        setImagesLoaded(true); // Continue anyway
      }
    };
    loadImages();
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/(auth)/login');
    }
  };

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const currentData = onboardingData[currentPage];

  return (
    <View style={styles.container}>
      {/* Hidden images to preload all at once */}
      <View style={styles.hiddenPreloader}>
        {images.map((img, index) => (
          <Image 
            key={index} 
            source={img} 
            style={{ width: 1, height: 1 }} 
          />
        ))}
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={currentData.image}
            style={styles.illustration}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {currentData.title}
            {currentData.titleHighlight && (
              <Text style={styles.titleHighlight}> {currentData.titleHighlight}</Text>
            )}
          </Text>
          <Text style={styles.description}>{currentData.description}</Text>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleNext}>
            <Text style={styles.continueButtonText}>
              {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>

          {currentPage < onboardingData.length - 1 && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hiddenPreloader: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: width * 0.8,
    height: width * 0.8,
    maxHeight: 400,
  },
  textContainer: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  titleHighlight: {
    color: '#C9A05B',
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 32,
    backgroundColor: '#C9A05B',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#D4D4D8',
  },
  buttonContainer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#C9A05B',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});
