import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Switch, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, Store, Edit, Settings, ChevronRight, Bell, Globe, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import ImagePickerButton from '@/components/ImagePickerButton';
import { ProfileService } from '@/services/profile.service';
import { getCurrencySymbol } from '@/lib/currency';

const CURRENCIES = [
  { code: 'PHP', name: 'Philippine Peso (₱)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
];

const TIMEZONES = [
  { value: 'Asia/Manila', label: 'Philippines (GMT+8)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
];

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [bakeryName, setBakeryName] = useState(profile?.bakery_name || '');
  const [currency, setCurrency] = useState(profile?.currency || 'PHP');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Manila');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [adminMode, setAdminMode] = useState(profile?.admin_mode || false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [appPreferencesModalVisible, setAppPreferencesModalVisible] = useState(false);

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
        timezone,
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
          <Text style={styles.profileName}>{profile?.bakery_name}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}>
            <Edit size={16} color="#8B6F47" />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
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

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Globe size={20} color="#8B6F47" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Timezone</Text>
                <Text style={styles.infoValue}>{profile?.timezone}</Text>
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
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D4BA9C', true: '#C89D5E' }}
                thumbColor={notificationsEnabled ? '#8B6F47' : '#F5E6D3'}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setAppPreferencesModalVisible(true)}>
              <View style={styles.settingLeft}>
                <Settings size={20} color="#8B6F47" />
                <Text style={styles.settingLabel}>App Preferences</Text>
              </View>
              <ChevronRight size={20} color="#8B7355" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Timezone</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimezonePicker(!showTimezonePicker)}>
                <Text style={styles.pickerButtonText}>
                  {TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
                </Text>
                <ChevronDown size={20} color="#6b7280" />
              </TouchableOpacity>
              {showTimezonePicker && (
                <View style={styles.pickerDropdown}>
                  <ScrollView style={styles.pickerScroll}>
                    {TIMEZONES.map((tz) => (
                      <TouchableOpacity
                        key={tz.value}
                        style={[
                          styles.pickerOption,
                          timezone === tz.value && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          setTimezone(tz.value);
                          setShowTimezonePicker(false);
                        }}>
                        <Text style={styles.pickerOptionText}>{tz.label}</Text>
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
                  setTimezone(profile?.timezone || 'Asia/Manila');
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

      {/* App Preferences Modal */}
      <Modal
        visible={appPreferencesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAppPreferencesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>App Preferences</Text>

            <View style={styles.preferenceSection}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceLeft}>
                  <Settings size={20} color="#8B6F47" />
                  <View style={styles.preferenceTextContainer}>
                    <Text style={styles.preferenceLabel}>Admin Mode</Text>
                    <Text style={styles.preferenceDescription}>Edit historical sales data</Text>
                  </View>
                </View>
                <Switch
                  value={adminMode}
                  onValueChange={handleToggleAdminMode}
                  trackColor={{ false: '#D4BA9C', true: '#C89D5E' }}
                  thumbColor={adminMode ? '#8B6F47' : '#F5E6D3'}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAppPreferencesModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
  container: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D4BA9C',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B5439',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 12,
    marginTop: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#6B5439',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#8B7355',
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
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B5439',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4BA9C',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#6B5439',
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
    borderColor: '#D4BA9C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B7355',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8B6F47',
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
    color: '#8B7355',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B5439',
  },
  divider: {
    height: 1,
    backgroundColor: '#D4BA9C',
    marginVertical: 16,
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
    color: '#8B7355',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#A59B8C',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4BA9C',
    borderRadius: 8,
    padding: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#6B5439',
    flex: 1,
  },
  pickerDropdown: {
    backgroundColor: '#F5E6D3',
    borderWidth: 1,
    borderColor: '#D4BA9C',
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
    borderBottomColor: '#D4BA9C',
  },
  pickerOptionSelected: {
    backgroundColor: '#FFFFFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6B5439',
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
  preferenceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#8B7355',
  },
});
