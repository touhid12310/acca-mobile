import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Surface,
  TextInput,
  Button,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';

import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import authService from '../src/services/authService';
import API_CONFIG, { getAuthToken } from '../src/config/api';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, checkAuthStatus } = useAuth();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    mobile: '',
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Password form state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // 2FA state
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState({ enabled: false, setup: false });
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showVerifyStep, setShowVerifyStep] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        mobile: (user as any).mobile || '',
      });
      setProfilePictureUrl((user as any).profile_picture_url || null);
    }
    loadTwoFactorStatus();
  }, [user]);

  const loadTwoFactorStatus = async () => {
    try {
      const result = await authService.getTwoFactorStatus();
      if (result.success && result.data) {
        const data = result.data as any;
        setTwoFactorStatus({
          enabled: data.data?.two_factor_enabled || data.two_factor_enabled || false,
          setup: data.data?.two_factor_setup || data.two_factor_setup || false,
        });
      }
    } catch (error) {
      // Failed to load 2FA status
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsProfileSaving(true);
    try {
      const result = await authService.updateProfile(profileForm);
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        await checkAuthStatus();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating profile');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    setIsUploadingPicture(true);
    try {
      const token = await getAuthToken();
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profile_picture', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}/profile/picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Profile picture updated');
        setProfilePictureUrl(data.data?.profile_picture_url || data.profile_picture_url);
        await checkAuthStatus();
      } else {
        Alert.alert('Error', data.message || 'Failed to upload picture');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while uploading');
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getAuthToken();
            const response = await fetch(`${API_CONFIG.BASE_URL}/profile/picture`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            const data = await response.json();

            if (response.ok && data.success) {
              Alert.alert('Success', 'Profile picture removed');
              setProfilePictureUrl(null);
              await checkAuthStatus();
            } else {
              Alert.alert('Error', data.message || 'Failed to remove picture');
            }
          } catch (error) {
            Alert.alert('Error', 'An error occurred');
          }
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (passwordForm.password.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsPasswordSaving(true);
    try {
      const result = await authService.changePassword(passwordForm);
      if (result.success) {
        Alert.alert('Success', 'Password changed successfully');
        setPasswordModalVisible(false);
        setPasswordForm({
          current_password: '',
          password: '',
          password_confirmation: '',
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while changing password');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    setIs2FALoading(true);
    try {
      const result = await authService.setupTwoFactor();
      if (result.success && result.data) {
        const data = result.data as any;
        setQrCode(data.data?.qr_code || data.qr_code || '');
        setSecretKey(data.data?.manual_entry_key || data.secret || '');
        setShowVerifyStep(false);
        setTwoFactorModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to setup 2FA');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (twoFactorCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setIs2FALoading(true);
    try {
      const result = await authService.verifyTwoFactor(twoFactorCode);
      if (result.success) {
        Alert.alert('Success', 'Two-factor authentication enabled');
        setTwoFactorModalVisible(false);
        setTwoFactorCode('');
        loadTwoFactorStatus();
      } else {
        Alert.alert('Error', result.error || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disablePassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIs2FALoading(true);
    try {
      const result = await authService.disableTwoFactor(disablePassword);
      if (result.success) {
        Alert.alert('Success', 'Two-factor authentication disabled');
        setTwoFactorModalVisible(false);
        setDisablePassword('');
        loadTwoFactorStatus();
      } else {
        Alert.alert('Error', result.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIs2FALoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
          Profile Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} disabled={isUploadingPicture}>
              <View style={styles.avatarContainer}>
                {profilePictureUrl ? (
                  <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold' }}>
                      {getInitials(user?.name || 'User')}
                    </Text>
                  </View>
                )}
                {isUploadingPicture && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#fff" size="large" />
                  </View>
                )}
                <View style={[styles.cameraButton, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.avatarActions}>
              <Button
                mode="outlined"
                onPress={handlePickImage}
                disabled={isUploadingPicture}
                compact
              >
                Change Photo
              </Button>
              {profilePictureUrl && (
                <Button
                  mode="text"
                  textColor={colors.error}
                  onPress={handleRemoveProfilePicture}
                  compact
                >
                  Remove
                </Button>
              )}
            </View>
          </View>
        </Surface>

        {/* Profile Form */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Personal Information
          </Text>

          <TextInput
            label="Full Name"
            value={profileForm.name}
            onChangeText={(text) => setProfileForm({ ...profileForm, name: text })}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Email Address"
            value={profileForm.email}
            onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Phone Number"
            value={profileForm.mobile}
            onChangeText={(text) => setProfileForm({ ...profileForm, mobile: text })}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isProfileSaving}
            disabled={isProfileSaving}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </Surface>

        {/* Security Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Security
          </Text>

          <TouchableOpacity
            style={[styles.securityItem, { borderColor: colors.outline }]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={[styles.securityIcon, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="lock" size={24} color={colors.primary} />
            </View>
            <View style={styles.securityContent}>
              <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Change Password</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                Update your account password
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.securityItem, { borderColor: colors.outline }]}
            onPress={() => {
              if (twoFactorStatus.enabled) {
                setTwoFactorModalVisible(true);
              } else {
                handleSetupTwoFactor();
              }
            }}
          >
            <View style={[styles.securityIcon, { backgroundColor: twoFactorStatus.enabled ? `${colors.tertiary}15` : `${colors.primary}15` }]}>
              <MaterialCommunityIcons
                name="shield-key"
                size={24}
                color={twoFactorStatus.enabled ? colors.tertiary : colors.primary}
              />
            </View>
            <View style={styles.securityContent}>
              <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Two-Factor Authentication</Text>
              <Text variant="bodySmall" style={{ color: twoFactorStatus.enabled ? colors.tertiary : colors.onSurfaceVariant }}>
                {twoFactorStatus.enabled ? 'Enabled - Tap to disable' : 'Add extra security to your account'}
              </Text>
            </View>
            {is2FALoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        </Surface>
      </ScrollView>

      {/* Change Password Modal */}
      <Portal>
        <Modal
          visible={passwordModalVisible}
          onDismiss={() => setPasswordModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
            Change Password
          </Text>

          <TextInput
            label="Current Password"
            value={passwordForm.current_password}
            onChangeText={(text) => setPasswordForm({ ...passwordForm, current_password: text })}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            label="New Password"
            value={passwordForm.password}
            onChangeText={(text) => setPasswordForm({ ...passwordForm, password: text })}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            label="Confirm New Password"
            value={passwordForm.password_confirmation}
            onChangeText={(text) => setPasswordForm({ ...passwordForm, password_confirmation: text })}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button mode="text" onPress={() => setPasswordModalVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isPasswordSaving}
            >
              Change Password
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Two-Factor Modal */}
      <Portal>
        <Modal
          visible={twoFactorModalVisible}
          onDismiss={() => {
            setTwoFactorModalVisible(false);
            setShowVerifyStep(false);
            setTwoFactorCode('');
            setDisablePassword('');
          }}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          {twoFactorStatus.enabled ? (
            <>
              <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
                Disable Two-Factor Auth
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
                Enter your password to disable two-factor authentication.
              </Text>

              <TextInput
                label="Password"
                value={disablePassword}
                onChangeText={setDisablePassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />

              <View style={styles.modalButtons}>
                <Button mode="text" onPress={() => setTwoFactorModalVisible(false)}>Cancel</Button>
                <Button
                  mode="contained"
                  buttonColor={colors.error}
                  onPress={handleDisableTwoFactor}
                  loading={is2FALoading}
                >
                  Disable 2FA
                </Button>
              </View>
            </>
          ) : showVerifyStep ? (
            <>
              <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
                Verify Code
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
                Enter the 6-digit code from your authenticator app.
              </Text>

              <TextInput
                label="Verification Code"
                value={twoFactorCode}
                onChangeText={(text) => setTwoFactorCode(text.replace(/\D/g, '').slice(0, 6))}
                mode="outlined"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
                contentStyle={{ textAlign: 'center', letterSpacing: 8, fontSize: 24 }}
              />

              <View style={styles.modalButtons}>
                <Button mode="text" onPress={() => setShowVerifyStep(false)}>Back</Button>
                <Button
                  mode="contained"
                  onPress={handleVerifyTwoFactor}
                  loading={is2FALoading}
                >
                  Verify & Enable
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text variant="titleLarge" style={{ color: colors.onSurface, marginBottom: 16 }}>
                Setup Two-Factor Auth
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </Text>

              {qrCode ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <WebView
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0">
                              <style>
                                body {
                                  margin: 0;
                                  padding: 0;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                  background: #fff;
                                }
                                svg {
                                  width: 180px;
                                  height: 180px;
                                }
                              </style>
                            </head>
                            <body>${qrCode}</body>
                          </html>
                        `,
                      }}
                      style={styles.qrWebView}
                      scrollEnabled={false}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>
                    Manual Entry Key:
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.onSurface, fontFamily: 'monospace', marginTop: 4 }}
                    selectable
                  >
                    {secretKey}
                  </Text>
                </View>
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}

              <View style={styles.modalButtons}>
                <Button mode="text" onPress={() => setTwoFactorModalVisible(false)}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={() => setShowVerifyStep(true)}
                >
                  I've Scanned the Code
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 8,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityContent: {
    flex: 1,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrCodeWrapper: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  qrWebView: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
  },
});
