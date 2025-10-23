import { router } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- COLORS (Batay sa visual design) ---
const PRIMARY_TAN = '#B59275'; // Kulay ng button
const DARK_BROWN_TEXT = '#5A4031'; // Kulay ng pangalan ng app
const GRAY_DOT = '#D3D3D3'; // Kulay ng hindi active na dot
const ACTIVE_DOT = '#B59275'; // Kulay ng active na dot
const WHITE = '#FFFFFF';
// --------------------------------------------------------

// IMPORTANT: Gamitin ang tamang path para sa iyong illustration (Chef/Baker)
const ILLUSTRATION_IMAGE = require('../../assets/images/sales.png'); 
// NOTE: I-assume natin na ang file name ay 'baker-illustration.png'

// Dummy data for the dots (assuming this is the first of 4 screens)
const TOTAL_SCREENS = 4;
const CURRENT_SCREEN_INDEX = 1; 

// Functional Component para sa Dot Indicator
const PaginationDots = ({ total, activeIndex }) => (
  <View style={paginationStyles.dotContainer}>
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        style={[
          paginationStyles.dot,
          index === activeIndex ? paginationStyles.activeDot : paginationStyles.inactiveDot,
        ]}
      />
    ))}
  </View>
);

const WelcomeScreen1 = () => {
  // Function na tatawagin kapag pinindot ang 'Continue'
  const handleContinue = () => {
    // Logic para pumunta sa next onboarding screen, e.g., '/(onboarding)/FeatureScreen1'
    console.log('Continue button pressed');
    router.push('/(onboarding)/WelcomeScreen2'); 
  };

  return (
    <View style={styles.container}>
      
      {/* 1. TOP CONTENT AREA (Flexible, ito ang magpapalit sa bawat slide) */}
      <View style={styles.contentArea}>
        
        {/* Title */}
        <Text style={styles.title}>
          Stay on top of every sale
        </Text>

        {/* Illustration Image */}
        <Image
          source={ILLUSTRATION_IMAGE}
          style={styles.illustration}
          resizeMode="contain"
          // Opsyonal: Lagyan ng fallback image kung hindi makita ang illustration
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
        />

        {/* Description Text */}
        <Text style={styles.description}>
          View real-time sales data, identify best-selling products, and understand your bakery's performance at a glance.
        </Text>
      </View>

      {/* 2. FIXED FOOTER AREA (Naka-fixed sa ibaba) */}
      <View style={styles.fixedFooter}>
        
        {/* Pagination Dots */}
        <PaginationDots total={TOTAL_SCREENS} activeIndex={CURRENT_SCREEN_INDEX} />

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1, // Kukunin ang buong screen
    backgroundColor: WHITE,
  },
  
  // Content area na maglalaman ng Title, Image, at Description
  contentArea: {
    flex: 1, // Ito ang mag-occupy ng available space
    paddingHorizontal: 30,
    paddingTop: 80, // Para hindi masagasaan ang status bar
    alignItems: 'center',
    justifyContent: 'flex-start', // Simulan ang content sa itaas
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'serif', // I-adjust kung may custom font
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
  },
  flourcastText: {
    color: PRIMARY_TAN, // Para sa kulay-kayumanggi na "Flourcast"
  },

  illustration: {
    width: '90%', // Gawing responsive
    height: 250, // I-adjust ang taas
    marginVertical: 40,
  },

  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333', // Dark gray
    lineHeight: 24,
    maxWidth: 300, // Optional: Limitahan ang lapad ng text
  },

  // FIXED FOOTER STYLE (Critical for fixed position)
  fixedFooter: {
    // Ginagamit ang position: 'absolute' para naka-fixed sa bottom
    position: 'absolute',
    bottom: 0, 
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 40, // Malaking padding sa ibaba para sa space
    paddingTop: 20,
    backgroundColor: WHITE, // Siguraduhin na puti ang background nito
    alignItems: 'center',
  },

  continueButton: {
    width: '100%',
    backgroundColor: PRIMARY_TAN,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    // Optional: Box shadow para mas maganda
    shadowColor: PRIMARY_TAN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const paginationStyles = StyleSheet.create({
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  inactiveDot: {
    backgroundColor: GRAY_DOT,
  },
  activeDot: {
    backgroundColor: ACTIVE_DOT,
  },
});

export default WelcomeScreen1;
