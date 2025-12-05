import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

// Ensure images directory exists
export async function ensureImagesDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

// Generate unique filename
function generateImageFilename(prefix: string = 'img'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}.jpg`;
}

// Compress and save image
export async function compressAndSaveImage(
  uri: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<string> {
  try {
    await ensureImagesDirExists();

    // Compress image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Generate filename and destination path
    const filename = generateImageFilename();
    const destPath = `${IMAGES_DIR}${filename}`;

    // Copy compressed image to permanent storage
    await FileSystem.copyAsync({
      from: manipulatedImage.uri,
      to: destPath,
    });

    return destPath;
  } catch (error) {
    console.error('Error compressing and saving image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save image';
    throw new Error(`Failed to save image: ${errorMessage}`);
  }
}

// Pick image from library
export async function pickImageFromLibrary(
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<string | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library is required');
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    // Compress and save
    const savedUri = await compressAndSaveImage(
      result.assets[0].uri,
      maxWidth,
      maxHeight
    );

    return savedUri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

// Take photo with camera
export async function takePhoto(
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<string | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera is required');
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    // Compress and save
    const savedUri = await compressAndSaveImage(
      result.assets[0].uri,
      maxWidth,
      maxHeight
    );

    return savedUri;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

// Delete image file
export async function deleteImage(imageUri: string | null): Promise<void> {
  if (!imageUri) return;

  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(imageUri);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - it's okay if deletion fails
  }
}

// Get image size
export async function getImageSize(imageUri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    return fileInfo.exists && 'size' in fileInfo ? (fileInfo as any).size : 0;
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
}

// Download image from URL and save to local storage
export async function downloadAndSaveImage(
  imageUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<string> {
  try {
    await ensureImagesDirExists();

    // Generate temporary filename for download
    const tempFilename = generateImageFilename('temp');
    const tempPath = `${IMAGES_DIR}${tempFilename}`;

    // Download image
    const downloadResult = await FileSystem.downloadAsync(imageUrl, tempPath);

    if (!downloadResult.uri) {
      throw new Error('Failed to download image');
    }

    // Compress and save to final location
    const savedUri = await compressAndSaveImage(
      downloadResult.uri,
      maxWidth,
      maxHeight
    );

    // Delete temporary file
    try {
      await FileSystem.deleteAsync(tempPath);
    } catch (error) {
      // Ignore deletion errors
    }

    return savedUri;
  } catch (error) {
    console.error('Error downloading and saving image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to download image';
    throw new Error(`Failed to download image: ${errorMessage}`);
  }
}

// Product image helpers
export const ProductImageStorage = {
  pickImage: () => pickImageFromLibrary(800, 800),
  takePhoto: () => takePhoto(800, 800),
  deleteImage,
  downloadAndSaveImage: (url: string) => downloadAndSaveImage(url, 800, 800),
};

// Profile avatar helpers
export const ProfileAvatarStorage = {
  pickImage: () => pickImageFromLibrary(400, 400),
  takePhoto: () => takePhoto(400, 400),
  deleteImage,
};
