import { router } from 'expo-router'; // ✅ For navigation to home
import { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform, // <-- ADDED for keyboard responsiveness
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Added SafeAreaView import

// --- COLOR PALETTE (Matched to design image) ---
const BACKGROUND_LIGHT_TAN = '#F4E9D9'; 
const PRIMARY_FORM_BORDER = '#C5A98A'; 
const INNER_FORM_BACKGROUND = '#E5D5C6'; 
const BUTTON_SIGNIN = '#B59275'; 
const DARK_TEXT = '#3D3D3D'; 
const BLACK = '#000000'; 
const WHITE = '#FFFFFF'; 
const INPUT_PLACEHOLDER_TEXT = '#999999'; 

// Placeholder for the local logo image
const LOGO_IMAGE = require('../../assets/images/logo.png'); 

const SignInScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // --- NAVIGATION FUNCTIONS ---

    // 1. Updated handleSignIn to navigate to /home
    const handleSignIn = () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }
        
        // --- SUCCESSFUL LOGIN LOGIC ---
        // This is where you would call your actual authentication API
        Alert.alert('Success', `Welcome back, logging in with ${email}!`);
        
        // ✅ Navigate directly to the Home screen (or main app route)
        // Using replace prevents the user from going back to the login screen easily.
        router.replace('/home'); 
        // -----------------------------
    };

    const handleGoogleLogin = () => {
        Alert.alert('Google Login', 'Starting Google authentication process...');
    };

    // 2. Function to navigate back to the Sign Up screen
    const navigateToSignUp = () => {
        router.push('/(onboarding)/SignUpScreen');
    };

    return (
        // ✅ Changed import to use SafeAreaView from 'react-native-safe-area-context'
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // iOS uses 'padding', Android often prefers 'height'
                keyboardVerticalOffset={0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    
                    {/* --- HEADER AREA (GET STARTED & Logo) --- */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerTitles}>
                                <Text style={styles.headerTitleLarge}>GET</Text>
                                <Text style={styles.headerTitleLarge}>STARTED</Text>
                            </View>
                            <View style={styles.logoContainer}>
                                <Image 
                                    source={LOGO_IMAGE} 
                                    style={styles.logoImage} 
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    </View>

                    {/* --- WELCOME TEXT (Centered above form card) --- */}
                    <View style={styles.welcomeTextContainer}>
                        <Text style={styles.welcomeTitle}>Welcome</Text>
                        <Text style={styles.createAccountText}>Sign in to your account</Text>
                    </View>

                    {/* --- FORM CARD AREA (Outer Dark Brown Box) --- */}
                    <View style={styles.formCard}>
                        <View style={styles.innerCard}>
                            
                            {/* --- SIGN IN / SIGN UP TOGGLE (Updated) --- */}
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity onPress={navigateToSignUp}>
                                    <Text style={styles.toggleTextActive}>Sign Up</Text>
                                </TouchableOpacity>
                                <Text style={styles.toggleTextInactive}>Sign In</Text>
                            </View>

                            {/* INPUT FIELDS - EMAIL AND PASSWORD */}
                            <TextInput
                                style={styles.input}
                                placeholder="Email" 
                                placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password" 
                                placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                            
                            {/* LOG IN BUTTON */}
                            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                                <Text style={styles.signInButtonText}>LOG IN</Text>
                            </TouchableOpacity>
                            
                            {/* GOOGLE SIGN IN BUTTON */}
                            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                                <Image
                                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                                    style={styles.googleIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- STYLES (Retained and Updated) ---
const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: BACKGROUND_LIGHT_TAN,
    },
    // New container for KeyboardAvoidingView
    keyboardContainer: {
        flex: 1,
    },
    // Content container for ScrollView
    scrollContent: {
        flexGrow: 1, // Ensures content can grow to fill space
        marginTop: 20, 
        paddingBottom: 20, // Extra padding at the bottom when keyboard is down
    },
    
    // --- HEADER STYLES ---
    header: {
        flexDirection: 'row', 
        paddingHorizontal: 20, 
        alignItems: 'flex-start',
        paddingBottom: 5, 
    },
    headerContent: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        paddingLeft: 0, 
        alignItems: 'center',
    },
    headerTitles: {
        flexDirection: 'column', 
        alignItems: 'flex-start',
        flex: 1,
        marginLeft: 20, 
        marginTop:40,
    },
    headerTitleLarge: { 
        fontSize: 36, 
        fontWeight: '900', 
        color: BLACK, 
        lineHeight: 36,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }), 
    },
    
    logoContainer: {
        alignItems: 'center',
        marginTop: 35,
        marginLeft: 20, 
        marginRight: 20,
    },
    logoImage: {
        width: 120, 
        height: 90, 
    },

    // --- WELCOME TEXT STYLES ---
    welcomeTextContainer: {
        paddingHorizontal: 20,
        marginTop: 40, 
        marginBottom: 20, 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 80, 
    },
    welcomeTitle: { 
        fontSize: 28, 
        fontWeight: '400', 
        color: DARK_TEXT, 
        marginBottom: 5,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    createAccountText: { 
        fontSize: 20, 
        fontWeight: '500', 
        color: DARK_TEXT, 
    },

    // --- FORM CARD STYLES ---
    formCard: {
        marginHorizontal: 0,
        paddingBottom: 50,
        paddingLeft:30,
        paddingRight:30,
        paddingTop:30,
        backgroundColor: PRIMARY_FORM_BORDER, 
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 5, 
        // Removed flex: 1 here
        justifyContent: 'flex-start',
        minHeight: 100, 
        
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    
    innerCard: {
        backgroundColor: INNER_FORM_BACKGROUND, 
        borderRadius: 25, 
        padding: 25, 
        paddingTop: 40,
        justifyContent: 'flex-start',
    },
    
    // --- TOGGLE STYLES ---
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        gap: 20,
    },
    // The link/inactive option (Sign Up)
    toggleTextActive: { 
        fontSize: 18,
        fontWeight: '500', 
        color: DARK_TEXT,
        opacity: 0.6,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    // The current screen (Sign In)
    toggleTextInactive: { 
        fontSize: 18,
        fontWeight: '700',
        color: DARK_TEXT,
        borderBottomWidth: 3, 
        borderBottomColor: DARK_TEXT, 
        paddingBottom: 5,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },

    // --- INPUT STYLES ---
    input: {
        width: '100%', 
        height: 50, 
        backgroundColor: WHITE, 
        borderRadius: 25, 
        paddingHorizontal: 15, 
        marginBottom: 20, 
        fontSize: 16,
        color: DARK_TEXT,
        
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 0, 
    },

    // --- BUTTON STYLES (Renamed for clarity in the component) ---
    signInButton: { 
        width: '80%', // Adjusted from 60% to 80% for alignment
        height: 50, 
        backgroundColor: BUTTON_SIGNIN, 
        borderRadius: 25, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 15, 
        marginBottom: 20,
        alignSelf: 'center', 
        
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, 
        shadowRadius: 6,
        elevation: 8,
    },
    signInButtonText: { 
        color: DARK_TEXT, 
        fontSize: 18, 
        fontWeight: '700', 
        letterSpacing: 0.5,
    },
    
    googleButton: {
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '80%', 
        height: 50, 
        backgroundColor: WHITE, 
        borderRadius: 25, 
        borderWidth: 1, 
        borderColor: WHITE, 
        paddingHorizontal: 15,
        marginBottom: 10,
        alignSelf: 'center', 
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    googleIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    googleButtonText: { 
        color: DARK_TEXT, 
        fontSize: 16, 
        fontWeight: '600', 
    },
});

export default SignInScreen;