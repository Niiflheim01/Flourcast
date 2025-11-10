// File: app/(onboarding)/profile.js 

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- IMAGE IMPORTS (Aassuming may logo.png kayo sa assets/images) ---
import logoImage from '../../assets/images/logo.png';

// --- 1. PROFILE COMPONENTS ---

const UserProfileContent = ({ onLogout }) => {
    
    // Database Ready: Data galing sa authentication/user database
    const initialUserData = {
        name: 'Juan Dela Cruz', 
        role: 'Admin / Staff',
        email: 'juan.delarcuz@gmail.com', 
        contact: '+63 912 345 6789', 
        initialProfilePicUrl: null, // Change to 'https://i.pravatar.cc/120?img=1' for testing
    };

    const [profilePicture, setProfilePicture] = useState(initialUserData.initialProfilePicUrl);

    // --- FUNCTIONALITIES ---
    
    // (handlePickImage and handleLogout functions remain the same)
    const handlePickImage = async () => {
        Alert.alert(
            "Upload Profile Picture",
            "In a real app, this would open your gallery or camera.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Select Image", 
                    onPress: () => {
                        const newUrl = 'https://picsum.photos/120/120?random=' + Math.random(); 
                        setProfilePicture(newUrl);
                        Alert.alert("Success", "Profile picture updated (Placeholder).");
                    }
                }
            ]
        );
    };

    const handleEditProfile = () => {
        // ✅ NAVIGATION FIX: Gamit ang direct filename
        router.push('editProfile'); 
    };
    
    const handleActionNavigation = (label) => {
        // ✅ NAVIGATION FIX: Gagamitin ang tamang route
        if (label === 'App Settings') {
            router.push('settings');
        } else if (label === 'Privacy Policy') {
            Alert.alert("FUTURE FEATURE", "Navigating to Privacy Policy screen.", [{ text: "OK" }]);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Confirm Logout",
            "Are you sure you want to log out of your account?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive",
                    onPress: onLogout, 
                }
            ]
        );
    };
    
    // ... (return statement remains the same, with the updated onPress handlers)
    
    return (
        <View style={styles.profileContainer}>
            
            {/* Logo and Greeting */}
            <Image 
                source={logoImage} 
                style={styles.logo} 
                resizeMode="contain"
            />
            <Text style={styles.greetingText}>Good Morning!</Text>
            
            {/* Profile Picture and Name */}
            <View style={styles.profileVisuals}>
                <TouchableOpacity onPress={handlePickImage} style={styles.profileImageContainer}>
                    {profilePicture ? (
                        <Image
                            source={{ uri: profilePicture }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <Ionicons name="person-circle-outline" size={120} color="#333" />
                    )}
                    <View style={styles.cameraIconOverlay}>
                        <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.nameText}>{initialUserData.name}</Text>
            </View>

            {/* User Information Card */}
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>User Information</Text>
                
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{initialUserData.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact No.:</Text>
                    <Text style={styles.infoValue}>{initialUserData.contact}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>{initialUserData.role}</Text>
                </View>
            </View>

            {/* Account Actions and Settings */}
            <View style={styles.actionsContainer}>
                <Text style={styles.actionsTitle}>Account Actions</Text>

                <View style={styles.actionButtonRow}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={handleEditProfile} // ✅ Ito ang nagpapadala sa editProfile.js
                    >
                        <Ionicons name="create-outline" size={18} color="#333" />
                        <Text style={styles.actionButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleActionNavigation("App Settings")} // ✅ Ito ang nagpapadala sa settings.js
                    >
                        <Ionicons name="settings-outline" size={18} color="#333" />
                        <Text style={styles.actionButtonText}>Settings</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.actionButtonRow}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleActionNavigation("Privacy Policy")}
                    >
                        <Ionicons name="shield-checkmark-outline" size={18} color="#333" />
                        <Text style={styles.actionButtonText}>Privacy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            
        </View>
    );
};

// --- (rest of the file: BottomNavBar, main Profile export, and Styles remain the same) ---

const BottomNavBar = ({ activeRoute }) => {
    // ... (navigation logic here)
    const navItems = [
        { name: 'Home', icon: 'home', route: 'home' }, 
        { name: 'Stocks', icon: 'document-text', route: 'stocks' }, 
        { name: 'Planner', icon: 'settings', route: 'planner' }, 
        { name: 'Sales', icon: 'stats-chart', route: 'sales' }, 
        { name: 'Profile', icon: 'person', route: 'profile' }, 
    ];

    const handleNavigation = (route) => {
        const fullPath = route === 'home' ? '(onboarding)/home' : `(onboarding)/${route}`;
        router.replace(fullPath); 
    };

    return (
        <View style={styles.bottomNav}>
            {navItems.map((item) => (
                <TouchableOpacity 
                    key={item.name} 
                    style={styles.bottomNavItem} 
                    onPress={() => handleNavigation(item.route)}
                >
                    <Ionicons 
                        name={item.icon} 
                        size={24} 
                        color={item.route === activeRoute ? '#D97706' : '#666'} 
                    />
                    <Text style={[styles.navText, item.route === activeRoute && styles.navTextActive]}>
                        {item.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};


export default function Profile() {
    
    const handleLogoutNavigation = () => {
        // Tiyaking tama ang path papunta sa inyong SignUpScreen.js
        router.replace('SignUpScreen'); 
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.topSpacer} />
            <ScrollView contentContainerStyle={styles.mainContent}> 
                <UserProfileContent onLogout={handleLogoutNavigation} /> 
                <View style={{ height: 90 }} /> 
            </ScrollView>
            <BottomNavBar activeRoute="profile" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ... (All styles must be included here) ...
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    mainContent: {
        paddingHorizontal: 25, 
        paddingBottom: 20,
    }, 
    topSpacer: {
        height: Platform.OS === 'android' ? 10 : 0, 
    },
    profileContainer: {
        alignItems: 'center',
        paddingTop: 10,
    },
    logo: {
        width: 150, 
        height: 50, 
        marginBottom: 5,
    },
    greetingText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    profileVisuals: {
        alignItems: 'center',
        marginBottom: 30,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F0F0F0',
    },
    cameraIconOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#333',
        borderRadius: 15,
        padding: 5,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    nameText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 10,
    },
    infoCard: {
        width: '100%',
        backgroundColor: '#F9F9F9', 
        borderRadius: 10,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        width: 90, 
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    actionsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    actionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    actionButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        borderRadius: 8,
        width: '48%', 
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    actionButtonText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        borderRadius: 8,
        width: '48%', 
        borderWidth: 1,
        borderColor: '#EF4444', 
    },
    logoutButtonText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444', 
    },
    bottomNav: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 70, 
        backgroundColor: '#FFFFFF', 
        flexDirection: 'row', 
        justifyContent: 'space-around',
        alignItems: 'center', 
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingBottom: Platform.OS === 'ios' ? 10 : 0, 
    },
    bottomNavItem: { 
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    },
    navText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    navTextActive: {
        color: '#D97706', 
        fontWeight: 'bold',
    },
});