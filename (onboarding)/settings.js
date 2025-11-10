// File: app/(onboarding)/settings.js 

// ... (Use the full code from my previous response for settings.js) ...

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- SETTINGS COMPONENTS ---

const SettingsToggle = ({ label, icon, initialValue, onValueChange }) => {
    const [isEnabled, setIsEnabled] = useState(initialValue);
    
    const toggleSwitch = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        
        // ✅ DATABASE LOGIC GOES HERE
        console.log(`${label} updated to: ${newState}`);

        if (onValueChange) {
            onValueChange(newState);
        }
    };

    return (
        <View style={styles.settingItem}>
            <Ionicons name={icon} size={24} color="#333" />
            <Text style={styles.settingLabel}>{label}</Text>
            <Switch
                trackColor={{ false: "#E0E0E0", true: "#D97706" }}
                thumbColor={isEnabled ? "#FFFFFF" : "#FFFFFF"}
                onValueChange={toggleSwitch}
                value={isEnabled}
                style={{ transform: [{ scaleX: .8 }, { scaleY: .8 }] }}
            />
        </View>
    );
};

const SettingsLink = ({ label, icon, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <Ionicons name={icon} size={24} color="#333" />
        <Text style={styles.settingLabel}>{label}</Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
    </TouchableOpacity>
);


const AIAndNotificationsSettings = () => (
    <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>AI & Notifications</Text>
        
        <SettingsToggle 
            label="Enable AI Forecasts" 
            icon="analytics-outline" 
            initialValue={true} 
            onValueChange={(val) => console.log('AI Forecasts Preference:', val)}
        />
        <SettingsToggle 
            label="Low Stock Alerts" 
            icon="alert-circle-outline" 
            initialValue={true} 
            onValueChange={(val) => console.log('Low Stock Alerts:', val)}
        />
        <SettingsToggle 
            label="Planner Suggestions" 
            icon="cube-outline" 
            initialValue={true} 
            onValueChange={(val) => console.log('Planner Suggestions:', val)}
        />
    </View>
);

const GeneralSettings = () => (
    <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <SettingsLink 
            label="Clear Local Cache" 
            icon="trash-outline" 
            onPress={() => Alert.alert('Action', 'FUTURE: Local cache cleared.')}
        />
        
        <SettingsLink 
            label="About FlourCast (v1.0.0)" 
            icon="information-circle-outline" 
            onPress={() => Alert.alert('Information', 'App Version: 1.0.0. Developed for Bakery Management.')}
        />
    </View>
);


// --- MAIN SETTINGS COMPONENT ---

export default function Settings() {
    
    const handleGoBack = () => {
        router.replace('(onboarding)/profile'); 
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>App Settings</Text>
            </View>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <ScrollView contentContainerStyle={styles.mainContent}> 
                
                <AIAndNotificationsSettings />
                
                <GeneralSettings />

                <View style={{ height: 30 }} /> 
            </ScrollView>
        </SafeAreaView>
    );
}


// --- STYLES ---

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8F8F8' },
    mainContent: {
        paddingHorizontal: 15, 
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
    sectionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D97706',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingLabel: {
        flex: 1,
        marginLeft: 15,
        fontSize: 15,
        color: '#333',
    },
});