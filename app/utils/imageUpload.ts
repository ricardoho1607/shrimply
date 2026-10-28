// utils/imageUpload.ts - Firebase Storage image upload utility
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

/**
 * Uploads an image to Firebase Storage and returns the download URL
 * @param uri - Local URI of the image from ImagePicker
 * @param path - Storage path (e.g., 'profiles/userId' or 'companies/companyId')
 * @returns Download URL of the uploaded image
 */
export const uploadImageToStorage = async (uri: string, path: string): Promise<string> => {
  try {
    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a reference to the storage location
    const storageRef = ref(storage, path);

    // Upload the blob
    await uploadBytesResumable(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};

/**
 * Upload profile picture
 */
export const uploadProfileImage = async (uri: string, userId: string): Promise<string> => {
  const timestamp = Date.now();
  const path = `users/${userId}/profile/profile_${timestamp}.jpg`;
  return uploadImageToStorage(uri, path);
};

/**
 * Upload company logo
 */
export const uploadCompanyLogo = async (uri: string, companyId: string): Promise<string> => {
  const timestamp = Date.now();
  const path = `companies/${companyId}/logo_${timestamp}.jpg`;
  return uploadImageToStorage(uri, path);
};