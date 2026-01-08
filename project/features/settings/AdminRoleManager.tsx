/**
 * Admin Role Manager Component
 * Simplified admin/staff role switching with password protection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Shield, ShieldOff, Lock, Mail } from 'lucide-react-native';
import { hashPassword, verifyPassword } from '@/features/shared/permissions';
import { getDatabase } from '@/features/shared/database';

interface AdminRoleManagerProps {
  profile: any;
  onRoleChange: () => void;
}

export default function AdminRoleManager({ profile, onRoleChange }: AdminRoleManagerProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.current_role === 'admin';
  const hasAdminSetup = profile?.admin_setup_completed;

  const handleSetupAdmin = async () => {
    if (!setupPassword || setupPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid recovery email');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const passwordHash = await hashPassword(setupPassword);

      await db.runAsync(
        `UPDATE profiles
         SET admin_password_hash = ?,
             recovery_email = ?,
             admin_setup_completed = 1
         WHERE id = ?`,
        [passwordHash, recoveryEmail, profile.id]
      );

      Alert.alert('Success', 'Admin account setup complete!');
      setShowSetupModal(false);
      setSetupPassword('');
      setSetupPasswordConfirm('');
      setRecoveryEmail('');
      onRoleChange();
    } catch (error) {
      console.error('Error setting up admin:', error);
      Alert.alert('Error', 'Failed to setup admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToAdmin = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter admin password');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ admin_password_hash: string }>(
        'SELECT admin_password_hash FROM profiles WHERE id = ?',
        [profile.id]
      );

      if (!result?.admin_password_hash) {
        Alert.alert('Error', 'Admin account not set up');
        setShowPasswordModal(false);
        return;
      }

      const isValid = await verifyPassword(password, result.admin_password_hash);

      if (!isValid) {
        Alert.alert('Error', 'Incorrect password');
        return;
      }

      await db.runAsync(
        `UPDATE profiles SET current_role = 'admin' WHERE id = ?`,
        [profile.id]
      );

      Alert.alert('Success', 'Switched to Admin mode');
      setShowPasswordModal(false);
      setPassword('');
      onRoleChange();
    } catch (error) {
      console.error('Error switching to admin:', error);
      Alert.alert('Error', 'Failed to switch to admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToStaff = async () => {
    Alert.alert(
      'Switch to Staff Mode',
      'You will need the admin password to switch back. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync(
                `UPDATE profiles SET current_role = 'staff' WHERE id = ?`,
                [profile.id]
              );
              Alert.alert('Success', 'Switched to Staff mode');
              onRoleChange();
            } catch (error) {
              console.error('Error switching to staff:', error);
              Alert.alert('Error', 'Failed to switch to staff');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isAdmin ? (
            <Shield size={24} color="#10B981" />
          ) : (
            <ShieldOff size={24} color="#F59E0B" />
          )}
          <View>
            <Text style={styles.headerTitle}>Access Level</Text>
            <Text style={styles.headerSubtitle}>
              {isAdmin ? 'Admin' : 'Staff'} - {isAdmin ? 'Full Access' : 'Limited Access'}
            </Text>
          </View>
        </View>
      </View>

      {!hasAdminSetup ? (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Admin Account Not Set Up</Text>
          <Text style={styles.setupText}>
            Set up an admin password to enable staff mode and protect admin features.
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => setShowSetupModal(true)}>
            <Lock size={18} color="#FFFFFF" />
            <Text style={styles.setupButtonText}>Set Up Admin Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actions}>
          {isAdmin ? (
            <TouchableOpacity style={styles.staffButton} onPress={handleSwitchToStaff}>
              <ShieldOff size={18} color="#F59E0B" />
              <Text style={styles.staffButtonText}>Switch to Staff Mode</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.adminButton} onPress={() => setShowPasswordModal(true)}>
              <Shield size={18} color="#FFFFFF" />
              <Text style={styles.adminButtonText}>Switch to Admin Mode</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Setup Modal */}
      <Modal visible={showSetupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Up Admin Account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter admin password"
                secureTextEntry
                value={setupPassword}
                onChangeText={setSetupPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                secureTextEntry
                value={setupPasswordConfirm}
                onChangeText={setSetupPasswordConfirm}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recovery Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowSetupModal(false);
                  setSetupPassword('');
                  setSetupPasswordConfirm('');
                  setRecoveryEmail('');
                }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, loading && styles.buttonDisabled]}
                onPress={handleSetupAdmin}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Set Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Admin Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter admin password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, loading && styles.buttonDisabled]}
                onPress={handleSwitchToAdmin}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Unlock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B5439',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
  },
  setupCard: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B6F47',
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 20,
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: '#8B6F47',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  adminButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  staffButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  staffButtonText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5E6D3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#6B5439',
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5E6D3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  modalCancelButtonText: {
    color: '#8B6F47',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#8B6F47',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
