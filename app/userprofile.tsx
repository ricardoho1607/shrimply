import { AppAlert as Alert } from '../components/alerts/appAlert';
// app/userprofile.tsx - User Profile with Firebase Storage Upload
// app/userprofile.tsx - User Profile with Firebase Storage Upload
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { uploadProfileImage } from './utils/imageUpload';

export default function UserProfileScreen() {
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [draftInputs1, setDraftInputs1] = useState<readonly unknown[] | null>(null);
  const nextDraftInputs1 = [user];
  if (!draftInputs1 || nextDraftInputs1.some((value, index) => !Object.is(value, draftInputs1[index]))) {
    setDraftInputs1(nextDraftInputs1);
    (() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || null);
    }

    })();
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);
      
      let imageUrl = user?.profileImage;

      // Upload image to Firebase Storage if it's a local URI
      if (profileImage && profileImage.startsWith('file://')) {
        setUploading(true);
        try {
          imageUrl = await uploadProfileImage(profileImage, user!.uid);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert('Upload Failed', 'Could not upload profile picture. Saving other changes...');
        } finally {
          setUploading(false);
        }
      } else if (profileImage) {
        imageUrl = profileImage;
      }

      if (updateUserProfile) {
        await updateUserProfile({
          name: name.trim(),
          phone: phone.trim(),
          profileImage: imageUrl
        });
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Picture Section */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity style={styles.profileImageContainer} onPress={showImageOptions}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={60} color="#dce8f2" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.profileImageHint}>Tap to change profile picture</Text>
            {uploading && <Text style={styles.uploadingText}>Uploading image...</Text>}
          </View>

          {/* User Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle" size={24} color="#0d2137" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#6b8aa0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color="#dce8f2" />
              </View>
              <Text style={styles.hint}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#6b8aa0"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Account Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#0d2137" />
              <Text style={styles.cardTitle}>Account Information</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role === 'owner' ? 'Farm Owner' :
                   user?.role === 'co-owner' ? 'Co-owner' :
                   user?.role === 'manager' ? 'Manager' :
                   user?.role === 'technician' ? 'Technician' :
                   user?.role === 'mechanic' ? 'Mechanic' :
                   user?.role === 'admin' ? 'Administrator' :
                   user?.role === 'buyer' ? 'Buyer' : 'Member'}
                </Text>
              </View>
            </View>

            {user?.joinedDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.joinedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, (loading || uploading) && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {uploading ? 'Uploading...' : 'Saving...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingTop: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#dce8f2', 
    borderBottomWidth: 0, 
    borderBottomColor: '#315f57' 
  },
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: '600' 
  },
  headerRight: { width: Platform.OS === 'android' ? 36 : 40 },
  scrollView: { flex: 1 },
  scrollContent: { 
    padding: Platform.OS === 'android' ? 18 : 20, 
    paddingBottom: Platform.OS === 'android' ? 36 : 40 
  },
  profileImageSection: { 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 28 : 30 
  },
  profileImageContainer: { 
    position: 'relative', 
    marginBottom: Platform.OS === 'android' ? 10 : 12 
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 4, 
    borderColor: '#e8f2f9' 
  },
  profileImagePlaceholder: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#F0F7FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#e8f2f9' 
  },
  editIconContainer: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#0d2137', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#FFFFFF' 
  },
  profileImageHint: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#315f57', 
    textAlign: 'center' 
  },
  uploadingText: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#f39c12', 
    marginTop: 4, 
    fontStyle: 'italic' 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: Platform.OS === 'android' ? 14 : 16, 
    padding: Platform.OS === 'android' ? 18 : 20, 
    marginBottom: Platform.OS === 'android' ? 18 : 20, 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 18 : 20, 
    paddingBottom: Platform.OS === 'android' ? 14 : 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  cardTitle: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    marginLeft: Platform.OS === 'android' ? 9 : 10 
  },
  inputGroup: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  label: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#0d2137', 
    marginBottom: Platform.OS === 'android' ? 7 : 8 
  },
  input: { 
    backgroundColor: '#f4f8fc', 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#0d2137' 
  },
  disabledInput: { 
    backgroundColor: '#F0F7FF', 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  disabledText: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#315f57' 
  },
  hint: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#dce8f2', 
    marginTop: Platform.OS === 'android' ? 5 : 6, 
    fontStyle: 'italic' 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F7FF' 
  },
  infoLabel: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#315f57' 
  },
  infoValue: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#0d2137', 
    fontWeight: '500' 
  },
  roleBadge: { 
    backgroundColor: '#0d2137', 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    borderRadius: Platform.OS === 'android' ? 7 : 8 
  },
  roleText: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#FFFFFF', 
    fontWeight: '600' 
  },
  saveButton: { 
    backgroundColor: '#0d2137', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: Platform.OS === 'android' ? 7 : 8, 
    marginTop: Platform.OS === 'android' ? 9 : 10 
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    marginLeft: Platform.OS === 'android' ? 7 : 8 
  },
});
