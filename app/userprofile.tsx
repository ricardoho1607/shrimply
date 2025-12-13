// app/userprofile.tsx - User Profile with Firebase Storage Upload
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || null);
    }
  }, [user]);

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
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B262C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Picture Section */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity style={styles.profileImageContainer} onPress={showImageOptions}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={60} color="#BBE1FA" />
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
              <Ionicons name="person-circle" size={24} color="#0F4C75" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#BBE1FA"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color="#BBE1FA" />
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
                placeholderTextColor="#BBE1FA"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Account Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#0F4C75" />
              <Text style={styles.cardTitle}>Account Information</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role === 'owner' ? 'Farm Owner' :
                   user?.role === 'manager' ? 'Manager' :
                   user?.role === 'technician' ? 'Technician' :
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
  outerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  topSafeArea: { backgroundColor: '#BBE1FA' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingTop: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#BBE1FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#3282B8' 
  },
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { 
    color: '#1B262C', 
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
    borderColor: '#BBE1FA' 
  },
  profileImagePlaceholder: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#F0F7FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#BBE1FA' 
  },
  editIconContainer: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#0F4C75', 
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
    color: '#3282B8', 
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
    borderColor: '#BBE1FA', 
    shadowColor: '#0F4C75', 
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
    borderBottomColor: '#BBE1FA' 
  },
  cardTitle: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginLeft: Platform.OS === 'android' ? 9 : 10 
  },
  inputGroup: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  label: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#0F4C75', 
    marginBottom: Platform.OS === 'android' ? 7 : 8 
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#1B262C' 
  },
  disabledInput: { 
    backgroundColor: '#F0F7FF', 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  disabledText: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#3282B8' 
  },
  hint: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#BBE1FA', 
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
    color: '#3282B8' 
  },
  infoValue: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#1B262C', 
    fontWeight: '500' 
  },
  roleBadge: { 
    backgroundColor: '#0F4C75', 
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
    backgroundColor: '#0F4C75', 
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