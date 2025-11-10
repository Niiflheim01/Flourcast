// File: app/(onboarding)/editProfile.js 

// ... (Use the full code from my previous response for editProfile.js) ...

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- EDIT PROFILE COMPONENTS ---

const ProfileForm = ({ initialData }) => {
    const [name, setName] = useState(initialData.name);
    const [email, setEmail] = useState(initialData.email);
    const [contact, setContact] = useState(initialData.contact);
    
    const handleSaveChanges = () => {
        // ✅ DATABASE WRITE LOGIC GOES HERE:
        // Run API/DB call to update user profile.

        Alert.alert(
            "Profile Update Request Sent",
            `Updating Name: ${name}\nUpdating Contact: ${contact}`,
            [
                { 
                    text: "OK", 
                    onPress: () => router.replace('(onboarding)/profile') 
                }
            ]
        );
    };

    return (
        <View style={styles.formContainer}>
            
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Juan Dela Cruz"
            />

            <Text style={styles.inputLabel}>Email (Cannot be changed here)</Text>
            <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={email}
                editable={false} 
            />

            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput
                style={styles.input}
                value={contact}
                onChangeText={setContact}
                placeholder="+63 9xx xxx xxxx"
                keyboardType="phone-pad"
            />
            
            <TouchableOpacity 
                style={styles.passwordLink}
                onPress={() => Alert.alert('Future Feature', 'Navigating to Change Password screen.')}
            >
                <Text style={styles.passwordLinkText}>Change Password</Text>
                <Ionicons name="chevron-forward-outline" size={18} color="#D97706" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

        </View>
    );
};


// --- MAIN EDIT PROFILE COMPONENT ---

export default function EditProfile() {
    
    const initialUserData = {
        name: 'Juan Dela Cruz',
        email: 'juan.delarcuz@gmail.com',
        contact: '+63 912 345 6789',
    };
    
    const handleGoBack = () => {
        router.replace('(onboarding)/profile');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Edit Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.mainContent}> 
                <ProfileForm initialData={initialUserData} />
                <View style={{ height: 30 }} /> 
            </ScrollView>
        </SafeAreaView>
    );
}


// --- STYLES ---

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8F8F8' },
    mainContent: {
        paddingHorizontal: 20, 
        paddingVertical: 20,
    }, 
    header: {
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingVertical: 10,
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEEEEE',
    },
    backButton: {
        marginRight: 10,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
        marginTop: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#FFFFFF',
    },
    readOnlyInput: {
        backgroundColor: '#F0F0F0',
        color: '#999',
    },
    passwordLink: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    passwordLinkText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D97706',
    },
    saveButton: {
        marginTop: 30,
        backgroundColor: '#D97706',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});