// File: app/SignUpScreen.js (or app/(auth)/SignUpScreen.js)

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

// --- COLOR PALETTE ---
const BACKGROUND_LIGHT_TAN = '#F4E9D9';
const PRIMARY_FORM_BORDER = '#C5A98A';
const INNER_FORM_BACKGROUND = '#E5D5C6';
const BUTTON_SIGNUP = '#B59275';
const DARK_TEXT = '#3D3D3D';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const INPUT_PLACEHOLDER_TEXT = '#999999';

// Placeholder for local asset (Tiyakin na tama ang path nito)
const LOGO_IMAGE = require('../../assets/images/logo.png');

const SignUpScreen = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // ✅ For Security

    const handleSignUp = () => {
        // --- Security & Validation Check ---
        if (!email || !username || !password || !confirmPassword || password !== confirmPassword) {
            Alert.alert(
                'Error', 
                password !== confirmPassword 
                ? 'Passwords do not match.' 
                : 'Please fill in all fields.'
            );
            return;
        }

        // 🎯 DATABASE/AUTH LOGIC GOES HERE:
        // Ilagay ang inyong API call dito. Ipadala ang {email, username, password}.
        console.log(`[DB] Registering: {email: ${email}, username: ${username}}`);
        Alert.alert('Success', `Account created for ${username}! Please sign in.`);
        
        // Navigate to SignInScreen after successful signup
        router.replace('SignInScreen'); 
    };

    const handleGoogleLogin = () => {
        Alert.alert('Google Login', 'Starting Google authentication process...');
    };

    const navigateToSignIn = () => {
        router.replace('SignInScreen');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentContainer}>
                        
                        {/* --- HEADER --- */}
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

                        {/* --- WELCOME TEXT --- */}
                        <View style={styles.welcomeTextContainer}>
                            <Text style={styles.welcomeTitle}>Welcome</Text>
                            <Text style={styles.createAccountText}>Create Account</Text>
                        </View>

                        {/* --- FORM CARD --- */}
                        <View style={styles.formCard}>
                            <View style={styles.innerCard}>
                                
                                {/* --- SIGN IN / SIGN UP TOGGLE --- */}
                                <View style={styles.toggleContainer}>
                                    <Text style={styles.toggleTextInactive}>Sign Up</Text>
                                    <TouchableOpacity onPress={navigateToSignIn}>
                                        <Text style={styles.toggleTextActive}>Sign In</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* --- INPUT FIELDS --- */}
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
                                    placeholder="Username (Full Name or Nickname)"
                                    placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                    autoCapitalize="words"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                
                                {/* ❌ Removed Role Selection Section */}

                                <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
                                    <Text style={styles.signUpButtonText}>SIGN UP</Text>
                                </TouchableOpacity>

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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BACKGROUND_LIGHT_TAN },
    keyboardAvoid: { flex: 1 },
    scrollContentContainer: { flexGrow: 1, justifyContent: 'flex-start', paddingBottom: 20 },
    contentContainer: { flex: 1, marginTop: 20 },
    
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
        justifyContent: 'flex-start', shadowColor: BLACK, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
    },
    innerCard: {
        backgroundColor: INNER_FORM_BACKGROUND, borderRadius: 25, padding: 25, paddingTop: 40,
        flex: 1, justifyContent: 'flex-start',
    },
    
    // Toggle Styles
    toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30, gap: 20 },
    toggleTextInactive: { // Current Page
        fontSize: 18, fontWeight: '700', color: DARK_TEXT, borderBottomWidth: 3, 
        borderBottomColor: DARK_TEXT, paddingBottom: 5, fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    toggleTextActive: { // Link Page
        fontSize: 18, fontWeight: '500', color: DARK_TEXT, opacity: 0.6, 
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    
    // Input Styles
    input: {
        width: '100%', height: 50, backgroundColor: WHITE, borderRadius: 25, paddingHorizontal: 15,
        marginBottom: 15, fontSize: 16, color: DARK_TEXT, shadowColor: BLACK, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 0,
    },
    
    // Button Styles
    signUpButton: {
        width: '80%', height: 50, backgroundColor: BUTTON_SIGNUP, borderRadius: 25, justifyContent: 'center',
        alignItems: 'center', marginTop: 15, marginBottom: 20, alignSelf: 'center', shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 8,
    },
    signUpButtonText: { color: WHITE, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    googleButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '80%', height: 50,
        backgroundColor: WHITE, borderRadius: 25, borderWidth: 1, borderColor: WHITE, paddingHorizontal: 15,
        marginBottom: 10, alignSelf: 'center', shadowColor: BLACK, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    },
    googleIcon: { width: 20, height: 20, marginRight: 10 },
    googleButtonText: { color: DARK_TEXT, fontSize: 16, fontWeight: '600' },
});

export default SignUpScreen;