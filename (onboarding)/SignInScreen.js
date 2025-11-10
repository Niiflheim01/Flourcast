// File: app/SignInScreen.js (or app/(auth)/SignInScreen.js)

import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    const handleSignIn = () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }
        
        // 🎯 DATABASE/AUTH LOGIC GOES HERE:
        // Kuhanin ang Auth Token. Dahil single-user, walang role check, diretso sa Home.
        console.log(`[DB] Signing in with: ${email}`);

        // --- SUCCESSFUL LOGIN LOGIC ---
        Alert.alert('Success', `Welcome back, logging in with ${email}!`);
        
        // ✅ Navigate directly to the Home screen using the group path
        // (Assumes: app/(onboarding)/home.js)
        router.replace('(onboarding)/home'); 
    };

    const handleGoogleLogin = () => {
        Alert.alert('Google Login', 'Starting Google authentication process...');
    };

    const navigateToSignUp = () => {
        router.replace('SignUpScreen');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
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

                    <View style={styles.welcomeTextContainer}>
                        <Text style={styles.welcomeTitle}>Welcome</Text>
                        <Text style={styles.createAccountText}>Sign in to your account</Text>
                    </View>

                    <View style={styles.formCard}>
                        <View style={styles.innerCard}>
                            
                            {/* --- SIGN IN / SIGN UP TOGGLE --- */}
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
                            
                            {/* FORGOT PASSWORD LINK */}
                            <TouchableOpacity style={styles.forgotPasswordLink} onPress={() => Alert.alert('Forgot Password', 'Navigating to password reset screen.')}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>

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

// --- STYLES ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BACKGROUND_LIGHT_TAN },
    keyboardContainer: { flex: 1 },
    scrollContent: { flexGrow: 1, marginTop: 20, paddingBottom: 20 },
    
    // Header Styles
    header: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'flex-start', paddingBottom: 5 },
    headerContent: { flexDirection: 'row', flex: 1, justifyContent: 'space-between', alignItems: 'center' },
    headerTitles: { flexDirection: 'column', alignItems: 'flex-start', flex: 1, marginLeft: 20, marginTop: 40 },
    headerTitleLarge: { 
        fontSize: 36, fontWeight: '900', color: BLACK, lineHeight: 36,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }), 
    },
    logoContainer: { alignItems: 'center', marginTop: 35, marginLeft: 20, marginRight: 20 },
    logoImage: { width: 120, height: 90 },

    // Welcome Text Styles
    welcomeTextContainer: { paddingHorizontal: 20, marginTop: 40, marginBottom: 20, alignItems: 'center', justifyContent: 'center', height: 80 },
    welcomeTitle: { fontSize: 28, fontWeight: '400', color: DARK_TEXT, marginBottom: 5, fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }) },
    createAccountText: { fontSize: 20, fontWeight: '500', color: DARK_TEXT },

    // Form Card Styles
    formCard: {
        marginHorizontal: 0, paddingBottom: 50, paddingLeft: 30, paddingRight: 30, paddingTop: 30,
        backgroundColor: PRIMARY_FORM_BORDER, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 5,
        justifyContent: 'flex-start', minHeight: 100, shadowColor: BLACK, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
    },
    innerCard: {
        backgroundColor: INNER_FORM_BACKGROUND, borderRadius: 25, padding: 25, paddingTop: 40,
        justifyContent: 'flex-start',
    },
    
    // Toggle Styles
    toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30, gap: 20 },
    toggleTextActive: { // Link Page
        fontSize: 18, fontWeight: '500', color: DARK_TEXT, opacity: 0.6,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    toggleTextInactive: { // Current Page
        fontSize: 18, fontWeight: '700', color: DARK_TEXT, borderBottomWidth: 3, 
        borderBottomColor: DARK_TEXT, paddingBottom: 5, fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },

    // Input Styles
    input: {
        width: '100%', height: 50, backgroundColor: WHITE, borderRadius: 25, paddingHorizontal: 15,
        marginBottom: 20, fontSize: 16, color: DARK_TEXT, shadowColor: BLACK, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 0, 
    },
    
    // Forgot Password Link
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: DARK_TEXT,
        opacity: 0.7,
        fontWeight: '500',
    },

    // Button Styles
    signInButton: { 
        width: '80%', height: 50, backgroundColor: BUTTON_SIGNIN, borderRadius: 25, justifyContent: 'center', 
        alignItems: 'center', marginTop: 15, marginBottom: 20, alignSelf: 'center', 
        shadowColor: BLACK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 8,
    },
    signInButtonText: { color: WHITE, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    googleButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '80%', height: 50, 
        backgroundColor: WHITE, borderRadius: 25, borderWidth: 1, borderColor: WHITE, paddingHorizontal: 15,
        marginBottom: 10, alignSelf: 'center', shadowColor: BLACK, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    },
    googleIcon: { width: 20, height: 20, marginRight: 10 },
    googleButtonText: { color: DARK_TEXT, fontSize: 16, fontWeight: '600' },
});

export default SignInScreen;