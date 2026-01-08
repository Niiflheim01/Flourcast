import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Switch, SafeAreaView, Image, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth';
import { ProfileService } from '@/features/auth';
import { getCurrencySymbol } from '@/features/shared';
import { AdminRoleManager, CURRENCIES } from '@/features/settings';
import { User, LogOut, Store, Edit, Settings, ChevronRight, Bell, ChevronDown, RotateCcw } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import ImagePickerButton from '@/components/ImagePickerButton';
import { NotificationService } from '@/lib/notifications';
import { DEMO_PROFILE_IMAGE } from '@/lib/demo-images';
import { DEMO_MODE, resetDemoToBaseState } from '@/lib/demo-data';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [bakeryName, setBakeryName] = useState(profile?.bakery_name || '');
  const [currency, setCurrency] = useState(profile?.currency || 'PHP');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [adminMode, setAdminMode] = useState(profile?.admin_mode || false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handle demo reset - clears all data and returns to onboarding
  const handleResetDemo = () => {
    Alert.alert(
      '🔄 Restart Demo Version',
      'This will reset ALL demo data to the original base state:\n\n' +
      '• All added products will be removed\n' +
      '• All recorded sales will be cleared\n' +
      '• Inventory will return to initial values\n' +
      '• All alerts will be restored\n' +
      '• You will be returned to onboarding\n\n' +
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Demo',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetDemoToBaseState();
              // Navigate to onboarding
              router.replace('/(auth)/onboarding');
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert('Error', 'Failed to reset demo. Please try again.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  // Load notification preference on mount
  useEffect(() => {
    loadNotificationPreference();
  }, []);

  const loadNotificationPreference = async () => {
    const enabled = await NotificationService.getNotificationsEnabled();
    const hasPermission = await NotificationService.getDevicePermissionStatus();
    setNotificationsEnabled(enabled && hasPermission);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      // Request permission when enabling
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive alerts and reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            },
          ]
        );
        return;
      }
      await NotificationService.setNotificationsEnabled(true);
      setNotificationsEnabled(true);
      Alert.alert('Notifications Enabled', 'You will now receive alerts, reminders, and event notifications.');
    } else {
      // Disable notifications and cancel ALL pending notifications
      await NotificationService.setNotificationsEnabled(false);
      await NotificationService.cancelAllNotifications();
      setNotificationsEnabled(false);
      Alert.alert('Notifications Disabled', 'All notifications have been turned off. You will no longer receive any push notifications.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleToggleAdminMode = async (value: boolean) => {
    if (!profile?.id) return;

    try {
      await ProfileService.updateProfile(profile.id, {
        admin_mode: value,
      });
      setAdminMode(value);
      await refreshProfile();
      Alert.alert(
        value ? 'Admin Mode Enabled' : 'Admin Mode Disabled',
        value 
          ? 'You can now edit sales from previous months and years'
          : 'You can only edit today\'s sales'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update admin mode');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id || !bakeryName.trim()) {
      Alert.alert('Error', 'Bakery name is required');
      return;
    }

    try {
      await ProfileService.updateProfile(profile.id, {
        bakery_name: bakeryName,
        currency,
      });
      await refreshProfile(); // Refresh the profile data
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {DEMO_MODE ? (
            // Demo mode: show bundled profile image
            <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
              <Image 
                source={DEMO_PROFILE_IMAGE} 
                style={{ width: 100, height: 100 }} 
              />
            </View>
          ) : profile?.current_role === 'admin' ? (
            <ImagePickerButton
              currentImageUri={avatarUrl}
              onImageSelected={async (uri) => {
                setAvatarUrl(uri);
                if (profile?.id) {
                  await ProfileService.updateProfile(profile.id, { avatar_url: uri });
                  await refreshProfile(); // Refresh the profile data
                }
              }}
              type="profile"
              size={100}
              showRemoveButton={false}
            />
          ) : (
            <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
              {avatarUrl ? (
                <Image 
                  source={{ uri: avatarUrl }} 
                  style={{ width: 100, height: 100 }} 
                />
              ) : (
                <View style={{ width: 100, height: 100, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>No Photo</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.profileName}>{profile?.bakery_name}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          
          {profile?.current_role === 'admin' && (
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => setEditModalVisible(true)}>
              <Edit size={16} color="#8B6F47" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Store size={20} color="#8B6F47" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bakery Name</Text>
                <Text style={styles.infoValue}>{profile?.bakery_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.currencyIcon}>
                <Text style={styles.currencyIconText}>{getCurrencySymbol(profile?.currency || 'PHP')}</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Currency</Text>
                <Text style={styles.infoValue}>{profile?.currency}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={20} color="#8B6F47" />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#D4BA9C', true: '#90EE90' }}
                thumbColor={notificationsEnabled ? '#10B981' : '#F5E6D3'}
              />
            </View>

            <View style={styles.divider} />
          </View>
        </View>

        {/* Access Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access Control</Text>
          <AdminRoleManager profile={profile} onRoleChange={refreshProfile} />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {/* Demo Reset Button - Only show in DEMO_MODE */}
          {DEMO_MODE && (
            <TouchableOpacity 
              style={[styles.resetDemoButton, isResetting && styles.resetDemoButtonDisabled]} 
              onPress={handleResetDemo}
              disabled={isResetting}>
              {isResetting ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : (
                <RotateCcw size={20} color="#f97316" />
              )}
              <Text style={styles.resetDemoButtonText}>
                {isResetting ? 'Resetting...' : 'Restart Demo Version'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Flourcast v1.0.0</Text>
          <Text style={styles.footerSubtext}>Bakery Management & Forecasting</Text>
        </View>
      </View>

      {/* Edit Profile Modal */}
      {profile?.current_role === 'admin' && (
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bakery Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter bakery name"
                placeholderTextColor="#94a3b8"
                value={bakeryName}
                onChangeText={setBakeryName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Currency</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
                <Text style={styles.pickerButtonText}>
                  {CURRENCIES.find(c => c.code === currency)?.name || currency}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>
              {showCurrencyPicker && (
                <View style={styles.pickerDropdown}>
                  <ScrollView style={styles.pickerScroll}>
                    {CURRENCIES.map((curr) => (
                      <TouchableOpacity
                        key={curr.code}
                        style={[
                          styles.pickerOption,
                          currency === curr.code && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          setCurrency(curr.code);
                          setShowCurrencyPicker(false);
                        }}>
                        <Text style={styles.pickerOptionText}>{curr.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setBakeryName(profile?.bakery_name || '');
                  setCurrency(profile?.currency || 'PHP');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5EDE4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5EDE4',
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    backgroundColor: '#8B5A2B',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    color: '#F5EDE4',
    marginTop: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5EDE4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#C4A07A',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    borderWidth: 2,
    borderColor: '#C4A07A',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8B5A2B',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  resetDemoButton: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    marginBottom: 12,
  },
  resetDemoButtonDisabled: {
    opacity: 0.6,
  },
  resetDemoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  pickerDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    backgroundColor: '#F5E6D3',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  currencyIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
