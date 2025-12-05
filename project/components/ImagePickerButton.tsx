import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { ProductImageStorage, ProfileAvatarStorage } from '@/lib/image-storage';

interface ImagePickerButtonProps {
  currentImageUri: string | null;
  onImageSelected: (uri: string | null) => void;
  type?: 'product' | 'profile';
  size?: number;
  showRemoveButton?: boolean;
}

export default function ImagePickerButton({
  currentImageUri,
  onImageSelected,
  type = 'product',
  size = 120,
  showRemoveButton = true,
}: ImagePickerButtonProps) {
  const [loading, setLoading] = useState(false);

  const storage = type === 'profile' ? ProfileAvatarStorage : ProductImageStorage;

  const handlePickImage = async () => {
    try {
      setLoading(true);
      const uri = await storage.pickImage();
      if (uri) {
        onImageSelected(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const uri = await storage.takePhoto();
      if (uri) {
        onImageSelected(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onImageSelected(null),
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handlePickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (currentImageUri) {
    return (
      <View style={[styles.imageContainer, { width: size, height: size }]}>
        <Image
          source={{ uri: currentImageUri }}
          style={[styles.image, type === 'profile' && styles.roundImage]}
        />
        {showRemoveButton && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveImage}
          >
            <X size={16} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={showImageOptions}
        >
          <Camera size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.placeholder,
        { width: size, height: size },
        type === 'profile' && styles.roundImage,
      ]}
      onPress={showImageOptions}
    >
      <ImageIcon size={size * 0.3} color="#9ca3af" />
      <Text style={styles.placeholderText}>
        {type === 'profile' ? 'Add Photo' : 'Add Image'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  roundImage: {
    borderRadius: 999,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
});
