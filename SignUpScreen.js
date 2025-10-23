import { router } from 'expo-router'; // ✅ For navigation
import { useState } from 'react';
import {
    Alert,
    Image, // Ginamit para hindi matabunan ng keyboard ang mga input
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Updated import

// --- COLOR PALETTE ---
const BACKGROUND_LIGHT_TAN = '#F4E9D9';
const PRIMARY_FORM_BORDER = '#C5A98A';
const INNER_FORM_BACKGROUND = '#E5D5C6';
const BUTTON_SIGNUP = '#B59275';
const DARK_TEXT = '#3D3D3D';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const INPUT_PLACEHOLDER_TEXT = '#999999';

// Placeholder for local asset (dapat ay gumagana ito sa inyong local environment)
const LOGO_IMAGE = require('../../assets/images/logo.png');

const SignUpScreen = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSignUp = () => {
        if (!email || !username || !password) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        Alert.alert('Success', `Account created for ${username}!`);
        // Navigate to SignInScreen after successful signup
        router.push('/(onboarding)/SignInScreen'); 
    };

    const handleGoogleLogin = () => {
        Alert.alert('Google Login', 'Starting Google authentication process...');
    };

    const navigateToSignIn = () => {
        router.push('/(onboarding)/SignInScreen');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* KeyboardAvoidingView: Tinitiyak na hindi matatabunan ng keyboard ang form */}
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                {/* ScrollView: Ginagamit para maayos ang pag-adjust ng layout. Hiding the scrollbar for a "fixed" look. */}
                <ScrollView 
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={false} // ITO ANG NAGPAPAMUKHANG HINDI NAG-I-SCROLL
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

                        {/* --- FORM --- */}
                        <View style={styles.formCard}>
                            <View style={styles.innerCard}>
                                {/* --- SIGN IN / SIGN UP TOGGLE --- */}
                                <View style={styles.toggleContainer}>
                                    <Text style={styles.toggleTextInactive}>Sign Up</Text>
                                    <TouchableOpacity onPress={navigateToSignIn}>
                                        <Text style={styles.toggleTextActive}>Sign In</Text>
                                    </TouchableOpacity>
                                </View>

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
                                    placeholder="Username"
                                    placeholderTextColor={INPUT_PLACEHOLDER_TEXT}
                                    autoCapitalize="none"
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
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND_LIGHT_TAN,
    },
    keyboardAvoid: {
        flex: 1, // Added flex: 1 dito para ma-occupy ang buong space
    },
    scrollContentContainer: {
        flexGrow: 1, // Ito ang nagpapahintulot na umabot sa buong screen ang content
        justifyContent: 'flex-start',
        paddingBottom: 20, // Added padding for better spacing at the bottom
    },
    contentContainer: {
        flex: 1, // Binawasan ang dependency sa fixed height at mas in-focus sa flex para sa responsiveness
        marginTop: 20,
    },
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
        marginTop: 40,
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
    formCard: {
        marginHorizontal: 0,
        paddingBottom: 50,
        paddingLeft: 30,
        paddingRight: 30,
        paddingTop: 30,
        backgroundColor: PRIMARY_FORM_BORDER,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 5,
        // Inalis ang flex: 1 dito, at inilagay sa innerCard para mas flexible
        justifyContent: 'flex-start',
        // Inalis ang minHeight: 100
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
        flex: 1, // Ginamit ang flex: 1 dito para ang form ang sumakop sa natitirang espasyo
        justifyContent: 'flex-start',
    },
    // (Styles for toggle, input, and buttons remain the same)
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        gap: 20,
    },
    toggleTextInactive: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_TEXT,
        borderBottomWidth: 3, 
        borderBottomColor: DARK_TEXT, 
        paddingBottom: 5,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
    toggleTextActive: {
        fontSize: 18,
        fontWeight: '500', 
        color: DARK_TEXT,
        opacity: 0.6,
        fontFamily: Platform.select({ ios: 'Didot', android: 'serif' }),
    },
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
    signUpButton: {
        width: '60%',
        height: 50,
        backgroundColor: BUTTON_SIGNUP,
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
    signUpButtonText: {
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

export default SignUpScreen;